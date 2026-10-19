import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const overwrite = formData.get('overwrite') === 'true';

    if (!file || !projectId) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไฟล์และรหัสโครงการจำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ success: false, error: 'ไม่พบโครงการที่ระบุ' }, { status: 404 });
    }

    // Config parameters
    const requestedSheet = (formData.get('sheetName') as string) || '';
    const importAllSheets = formData.get('importAllSheets') === 'true' || requestedSheet === '__ALL__';
    const headerRowIdxParam = parseInt((formData.get('headerRowIdx') as string) || '0', 10);

    // Cert number options
    const certMode = (formData.get('certMode') as string) || 'column'; // 'column' | 'auto'
    const certColIdx = parseInt((formData.get('certColIdx') as string) || '-1', 10);
    const autoCertPrefix = (formData.get('autoCertPrefix') as string) || `${project.code}-`;
    let autoCertStartNum = parseInt((formData.get('autoCertStartNum') as string) || '1', 10);
    const autoCertDigits = parseInt((formData.get('autoCertDigits') as string) || '4', 10);

    // If append mode (not overwrite) and auto cert mode with default start num 1, start from next available
    const existingRecipientsCount = await prisma.recipient.count({ where: { projectId } });
    if (!overwrite && certMode === 'auto' && autoCertStartNum <= existingRecipientsCount) {
      autoCertStartNum = existingRecipientsCount + 1;
    }

    // Name options
    const nameMode = (formData.get('nameMode') as string) || 'single'; // 'single' | 'combined'
    const nameColIdx = parseInt((formData.get('nameColIdx') as string) || '-1', 10);
    const prefixColIdx = parseInt((formData.get('prefixColIdx') as string) || '-1', 10);
    const firstNameColIdx = parseInt((formData.get('firstNameColIdx') as string) || '-1', 10);
    const lastNameColIdx = parseInt((formData.get('lastNameColIdx') as string) || '-1', 10);

    // Organization options
    const orgMode = (formData.get('orgMode') as string) || 'column'; // 'column' | 'fixed' | 'sheetName' | 'none'
    const orgColIdx = parseInt((formData.get('orgColIdx') as string) || '-1', 10);
    const orgFixedValue = (formData.get('orgFixedValue') as string) || '';

    // Note options
    const noteMode = (formData.get('noteMode') as string) || 'column'; // 'column' | 'includeAllExtra' | 'none'
    const noteColIdx = parseInt((formData.get('noteColIdx') as string) || '-1', 10);

    // Selected rows filter (only applies if single sheet)
    const selectedRowsRaw = formData.get('selectedRowIndices') as string | null;
    let selectedRowSet: Set<number> | null = null;
    if (selectedRowsRaw && !importAllSheets) {
      try {
        const arr = JSON.parse(selectedRowsRaw);
        if (Array.isArray(arr) && arr.length > 0) {
          selectedRowSet = new Set(arr.map((n: any) => Number(n)));
        }
      } catch (e) {
        selectedRowSet = null;
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบชีตข้อมูลในไฟล์ Excel' }, { status: 400 });
    }

    // Decide which sheets to process
    const sheetsToProcess: string[] = importAllSheets
      ? sheetNames
      : [(requestedSheet && sheetNames.includes(requestedSheet)) ? requestedSheet : sheetNames[0]];

    const recipientsToCreate: any[] = [];
    let runningCertNum = autoCertStartNum;
    let processedSheetsCount = 0;

    for (const currentSheetName of sheetsToProcess) {
      const worksheet = workbook.Sheets[currentSheetName];
      if (!worksheet) continue;

      const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      if (!rows || rows.length === 0) continue;

      // Detect header row index for this sheet
      let effectiveHeaderRowIdx = headerRowIdxParam;
      if (importAllSheets || isNaN(effectiveHeaderRowIdx) || effectiveHeaderRowIdx < 0) {
        let bestScore = 0;
        let detectedIdx = 0;
        for (let i = 0; i < Math.min(25, rows.length); i++) {
          const row = rows[i] || [];
          const nonBlank = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length;
          if (nonBlank < 2) continue;
          let score = 0;
          for (let j = 0; j < row.length; j++) {
            const val = String(row[j] || '').trim();
            if (val.includes('ชื่อ') || val.includes('fullName')) score += 10;
            if (val.includes('ทะเบียน') || val.includes('certNumber') || val.includes('เลขที่')) score += 10;
          }
          if (score > bestScore) {
            bestScore = score;
            detectedIdx = i;
          }
        }
        effectiveHeaderRowIdx = bestScore > 0 ? detectedIdx : (headerRowIdxParam >= 0 ? headerRowIdxParam : 0);
      }

      const headerRow = rows[effectiveHeaderRowIdx] || [];
      let sheetRecipientsCount = 0;

      for (let i = effectiveHeaderRowIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;

        // If user selected specific rows only (only in single sheet mode)
        const oneIndexedRow = i + 1;
        if (!importAllSheets && selectedRowSet && !selectedRowSet.has(oneIndexedRow) && !selectedRowSet.has(i)) {
          continue;
        }

        // 1. Resolve Full Name
        let fullName = '';
        if (nameMode === 'combined') {
          const pref = prefixColIdx >= 0 && r[prefixColIdx] ? String(r[prefixColIdx]).trim() : '';
          const fn = firstNameColIdx >= 0 && r[firstNameColIdx] ? String(r[firstNameColIdx]).trim() : '';
          const ln = lastNameColIdx >= 0 && r[lastNameColIdx] ? String(r[lastNameColIdx]).trim() : '';
          fullName = `${pref} ${fn} ${ln}`.trim().replace(/\s+/g, ' ');
        } else {
          const raw = nameColIdx >= 0 && r[nameColIdx] !== undefined ? String(r[nameColIdx]).trim() : '';
          fullName = raw.replace(/\s+/g, ' ');
        }

        // If no valid name found in this row, skip it
        if (!fullName || fullName.length < 2) {
          continue;
        }

        // 2. Resolve Cert Number
        let certNumber = '';
        if (certMode === 'auto') {
          certNumber = `${autoCertPrefix}${String(runningCertNum).padStart(autoCertDigits, '0')}`;
          runningCertNum++;
        } else if (certColIdx >= 0 && r[certColIdx] !== undefined && String(r[certColIdx]).trim() !== '') {
          certNumber = String(r[certColIdx]).trim();
        } else {
          // Fallback auto if column was blank on this row
          certNumber = `${autoCertPrefix || project.code + '-'}${String(runningCertNum).padStart(autoCertDigits, '0')}`;
          runningCertNum++;
        }

        // 3. Resolve Organization
        let organization: string | null = null;
        if (orgMode === 'sheetName') {
          organization = currentSheetName.trim();
        } else if (orgMode === 'column') {
          organization = orgColIdx >= 0 && r[orgColIdx] ? String(r[orgColIdx]).trim() : null;
          // If empty and multi-sheet, fallback to sheet name
          if (!organization && importAllSheets && currentSheetName && !currentSheetName.toLowerCase().startsWith('sheet')) {
            organization = currentSheetName.trim();
          }
        } else if (orgMode === 'fixed') {
          organization = orgFixedValue.trim() || null;
        }

        if (!organization && project.location) {
          organization = project.location;
        }

        // 4. Resolve Note
        let note: string | null = null;
        if (noteMode === 'column' && noteColIdx >= 0 && r[noteColIdx]) {
          note = String(r[noteColIdx]).trim();
        } else if (noteMode === 'includeAllExtra') {
          const extraParts: string[] = [];
          if (noteColIdx >= 0 && r[noteColIdx]) {
            extraParts.push(String(r[noteColIdx]).trim());
          }
          const mappedIndices = new Set([
            certColIdx,
            nameColIdx,
            prefixColIdx,
            firstNameColIdx,
            lastNameColIdx,
            orgColIdx,
            noteColIdx,
          ]);

          for (let c = 0; c < r.length; c++) {
            if (!mappedIndices.has(c) && r[c] !== undefined && r[c] !== null && String(r[c]).trim() !== '') {
              const colName = (headerRow[c] || `คอลัมน์ ${c + 1}`).toString().trim();
              const lower = colName.toLowerCase();
              if (
                lower === 'ลำดับ' ||
                lower === 'ที่' ||
                lower === 'no' ||
                lower === 'no.' ||
                lower === '#'
              ) {
                continue;
              }
              extraParts.push(`${colName}: ${String(r[c]).trim()}`);
            }
          }
          if (extraParts.length > 0) {
            note = extraParts.join(' | ');
          }
        }

        recipientsToCreate.push({
          projectId,
          certNumber,
          fullName,
          organization,
          note,
        });
        sheetRecipientsCount++;
      }

      if (sheetRecipientsCount > 0) {
        processedSheetsCount++;
      }
    }

    if (recipientsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบแถวข้อมูลที่มีชื่อ-นามสกุลถูกต้องในไฟล์ หรือช่วงแถวที่เลือก' },
        { status: 400 }
      );
    }

    // Overwrite previous if requested
    if (overwrite) {
      await prisma.recipient.deleteMany({
        where: { projectId },
      });
    }

    // Batch insert into database
    await prisma.recipient.createMany({
      data: recipientsToCreate,
    });

    const totalInProject = await prisma.recipient.count({
      where: { projectId },
    });

    const sheetInfoText = importAllSheets
      ? ` จากทั้งหมด ${processedSheetsCount} ชีต`
      : ` จากชีต "${sheetsToProcess[0]}"`;

    const message = overwrite
      ? `นำเข้าแทนที่ข้อมูลเดิมเรียบร้อยแล้ว (${recipientsToCreate.length} รายชื่อ${sheetInfoText})`
      : `นำเข้าเพิ่มสำเร็จ ${recipientsToCreate.length} รายชื่อ${sheetInfoText} (รวมทั้งหมดในโครงการเป็น ${totalInProject} คน)`;

    return NextResponse.json({
      success: true,
      importedCount: recipientsToCreate.length,
      totalInProject,
      processedSheetsCount,
      message,
    });
  } catch (error: any) {
    console.error('Error importing Excel:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล Excel' },
      { status: 500 }
    );
  }
}
