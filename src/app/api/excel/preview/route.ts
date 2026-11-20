import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const requestedSheet = (formData.get('sheetName') as string) || '';

    if (!file) {
      return NextResponse.json({ success: false, error: 'กรุณาอัปโหลดไฟล์ Excel' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames || [];

    if (sheetNames.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบชีตข้อมูลในไฟล์ Excel' }, { status: 400 });
    }

    const sheetsSummary = sheetNames.map((sName) => {
      const ws = workbook.Sheets[sName];
      const r = ws ? xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 }) : [];
      return {
        name: sName,
        rowCount: r.length,
      };
    });

    const activeSheetName = (requestedSheet && sheetNames.includes(requestedSheet))
      ? requestedSheet
      : sheetNames[0];

    const worksheet = workbook.Sheets[activeSheetName];
    const allRows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

    if (!allRows || allRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: `ชีต "${activeSheetName}" ไม่มีข้อมูล`,
      }, { status: 400 });
    }

    // Auto-detect header row with smart scoring (check first 25 rows)
    let bestHeaderRowIdx = -1;
    let bestScore = 0;
    let bestCols = {
      nationalIdColIdx: -1,
      certColIdx: -1,
      nameColIdx: -1,
      orgColIdx: -1,
      trainingLocationColIdx: -1,
      trainingDateColIdx: -1,
      signedDateColIdx: -1,
      noteColIdx: -1,
      prefixColIdx: -1,
      firstNameColIdx: -1,
      lastNameColIdx: -1,
    };

    for (let i = 0; i < Math.min(25, allRows.length); i++) {
      const row = allRows[i] || [];
      const nonBlankCount = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== '').length;
      if (nonBlankCount < 2) continue;

      let score = 0;
      let tempNationalId = -1;
      let tempCert = -1;
      let tempName = -1;
      let tempOrg = -1;
      let tempTrainingLoc = -1;
      let tempTrainingDate = -1;
      let tempSignedDate = -1;
      let tempNote = -1;
      let tempPref = -1;
      let tempFirst = -1;
      let tempLast = -1;

      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || '').trim();
        const lower = val.toLowerCase();

        if (
          val.includes('13 หลัก') ||
          val.includes('13หลัก') ||
          val.includes('บัตรประชาชน') ||
          val.includes('เลขประจำตัว') ||
          val.includes('เลขบัตร') ||
          lower.includes('nationalid') ||
          lower.includes('citizen') ||
          lower.includes('idcard')
        ) {
          tempNationalId = j;
          score += 10;
        }
        if (
          val.includes('ทะเบียน') ||
          val.includes('รหัส') ||
          lower.includes('certnumber') ||
          val.includes('เลขที่') ||
          val.includes('เลขเกียรติบัตร')
        ) {
          tempCert = j;
          score += 10;
        }
        if (
          val.includes('ชื่อ-สกุล') ||
          val.includes('ชื่อ-นามสกุล') ||
          val.includes('ชื่อ - นามสกุล') ||
          lower.includes('fullname') ||
          val.includes('ผู้รับ')
        ) {
          tempName = j;
          score += 15;
        } else if (val === 'ชื่อ' || val.includes('ชื่อตัว') || lower.includes('firstname')) {
          tempFirst = j;
          score += 8;
        }
        if (val.includes('คำนำหน้า') || val.includes('ยศ') || lower.includes('prefix')) {
          tempPref = j;
          score += 5;
        }
        if (val.includes('นามสกุล') || val.includes('สกุล') || lower.includes('lastname')) {
          tempLast = j;
          score += 8;
        }
        if (
          val.includes('สถานศึกษา') ||
          val.includes('สังกัด') ||
          val.includes('โรงเรียน') ||
          val.includes('วิทยาลัย') ||
          val.includes('หน่วยงาน') ||
          lower.includes('organization')
        ) {
          tempOrg = j;
          score += 8;
        } else if (
          val.includes('สถานที่จัดอบรม') ||
          val.includes('สถานที่อบรม') ||
          val.includes('สถานที่จัดงาน') ||
          val === 'สถานที่' ||
          lower.includes('traininglocation') ||
          lower === 'location'
        ) {
          tempTrainingLoc = j;
          score += 8;
        }
        if (
          val.includes('วันที่ลงนาม') ||
          val.includes('วันลงนาม') ||
          val.includes('ลงนาม') ||
          lower.includes('signeddate')
        ) {
          tempSignedDate = j;
          score += 8;
        } else if (
          val.includes('วันที่จัดอบรม') ||
          val.includes('วันที่อบรม') ||
          val.includes('วันที่จัดงาน') ||
          val.includes('วันจัดอบรม') ||
          lower.includes('trainingdate') ||
          lower.includes('eventdate')
        ) {
          tempTrainingDate = j;
          score += 8;
        }
        if (val.includes('หมายเหตุ') || lower.includes('note') || lower.includes('remark')) {
          tempNote = j;
          score += 5;
        }
        if (val.includes('ลำดับ') || val === 'ที่') {
          score += 3;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestHeaderRowIdx = i;
        const hasSeparateNames = tempFirst !== -1 && tempLast !== -1;
        bestCols = {
          nationalIdColIdx: tempNationalId,
          certColIdx: tempCert,
          nameColIdx: tempName !== -1 ? tempName : (hasSeparateNames ? -1 : tempFirst),
          orgColIdx: tempOrg,
          trainingLocationColIdx: tempTrainingLoc,
          trainingDateColIdx: tempTrainingDate,
          signedDateColIdx: tempSignedDate,
          noteColIdx: tempNote,
          prefixColIdx: tempPref,
          firstNameColIdx: tempFirst,
          lastNameColIdx: tempLast,
        };
      }
    }

    let headerRowIdx = bestHeaderRowIdx >= 0 ? bestHeaderRowIdx : 0;
    let {
      nationalIdColIdx,
      certColIdx,
      nameColIdx,
      orgColIdx,
      trainingLocationColIdx,
      trainingDateColIdx,
      signedDateColIdx,
      noteColIdx,
      prefixColIdx,
      firstNameColIdx,
      lastNameColIdx,
    } = bestCols;

    // Inspect first 30 rows as raw rows for interactive UI
    const rawRows = allRows.slice(0, 30).map((row, rowIdx) => {
      const arr: string[] = [];
      const len = Math.max(row?.length || 0, 10);
      for (let j = 0; j < len; j++) {
        arr.push(row && row[j] !== undefined && row[j] !== null ? String(row[j]).trim() : '');
      }
      return {
        rowIndex: rowIdx,
        values: arr,
      };
    });

    const headerRow = allRows[headerRowIdx] || [];
    const headerValues: string[] = [];
    const maxCols = Math.max(headerRow.length, 6);
    for (let j = 0; j < maxCols; j++) {
      headerValues.push(
        headerRow[j] !== undefined && headerRow[j] !== null && String(headerRow[j]).trim() !== ''
          ? String(headerRow[j]).trim()
          : `คอลัมน์ ${j + 1}`
      );
    }

    // Count valid sample rows
    const previewList: any[] = [];
    let validCount = 0;

    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const r = allRows[i];
      if (!r || r.length === 0) continue;

      const certNumber = certColIdx !== -1 && r[certColIdx] !== undefined ? String(r[certColIdx]).trim() : '';
      let rawName = '';
      if (firstNameColIdx !== -1 && lastNameColIdx !== -1) {
        const pref = prefixColIdx !== -1 && r[prefixColIdx] ? String(r[prefixColIdx]).trim() : '';
        const fn = r[firstNameColIdx] ? String(r[firstNameColIdx]).trim() : '';
        const ln = r[lastNameColIdx] ? String(r[lastNameColIdx]).trim() : '';
        rawName = `${pref} ${fn} ${ln}`.trim();
      } else if (nameColIdx !== -1 && r[nameColIdx] !== undefined) {
        rawName = String(r[nameColIdx]).trim();
      } else if (firstNameColIdx !== -1 && r[firstNameColIdx]) {
        const pref = prefixColIdx !== -1 && r[prefixColIdx] ? String(r[prefixColIdx]).trim() : '';
        const fn = String(r[firstNameColIdx]).trim();
        rawName = `${pref} ${fn}`.trim();
      }

      const fullName = rawName.replace(/\s+/g, ' ');
      const nationalId =
        nationalIdColIdx !== -1 && r[nationalIdColIdx] !== undefined
          ? String(r[nationalIdColIdx]).replace(/[-\s]/g, '').trim()
          : null;
      const organization = orgColIdx !== -1 && r[orgColIdx] ? String(r[orgColIdx]).trim() : null;
      const trainingLocation =
        trainingLocationColIdx !== -1 && r[trainingLocationColIdx] ? String(r[trainingLocationColIdx]).trim() : null;
      const trainingDate =
        trainingDateColIdx !== -1 && r[trainingDateColIdx] ? String(r[trainingDateColIdx]).trim() : null;
      const signedDate =
        signedDateColIdx !== -1 && r[signedDateColIdx] ? String(r[signedDateColIdx]).trim() : null;
      const note = noteColIdx !== -1 && r[noteColIdx] ? String(r[noteColIdx]).trim() : null;

      if (fullName || certNumber) {
        validCount++;
        if (previewList.length < 15) {
          previewList.push({
            rowNumber: i + 1,
            nationalId,
            certNumber,
            fullName,
            rawName,
            organization,
            trainingLocation,
            trainingDate,
            signedDate,
            note,
            allValues: r.map((c) => (c !== undefined && c !== null ? String(c).trim() : '')),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        sheetNames,
        sheetsSummary,
        activeSheet: activeSheetName,
        totalRows: allRows.length,
        detectedHeaderRow: headerRowIdx,
        headerValues,
        detectedColumns: {
          nationalIdColIdx,
          certColIdx,
          nameColIdx,
          orgColIdx,
          trainingLocationColIdx,
          trainingDateColIdx,
          signedDateColIdx,
          noteColIdx,
          prefixColIdx,
          firstNameColIdx,
          lastNameColIdx,
        },
        rawRows,
        validCount,
        previewList,
      },
    });
  } catch (error: any) {
    console.error('Error previewing Excel:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ไม่สามารถเปิดอ่านไฟล์ Excel ได้' },
      { status: 500 }
    );
  }
}
