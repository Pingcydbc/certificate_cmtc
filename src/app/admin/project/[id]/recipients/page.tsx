'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Trash2,
  Eye,
  FileCheck2,
  Sparkles,
  RefreshCw,
  Palette,
  Layers,
  Settings2,
  Hash,
  User,
  Building2,
  FileText,
  Sliders,
  CheckSquare,
  Square,
  ChevronRight,
  Info,
  Download,
  ExternalLink,
  X
} from 'lucide-react';
import Pagination from '@/components/Pagination';

interface ProjectInfo {
  id: string;
  code: string;
  title: string;
  eventDate: string | null;
  location: string | null;
}

interface RecipientItem {
  id: string;
  certNumber: string;
  fullName: string;
  organization: string | null;
  note: string | null;
  issuedDate: string;
}

interface RawRowData {
  rowIndex: number;
  values: string[];
}

interface SheetSummaryItem {
  name: string;
  rowCount: number;
}

interface ExcelPreviewState {
  fileName: string;
  sheetNames: string[];
  sheetsSummary?: SheetSummaryItem[];
  activeSheet: string;
  totalRows: number;
  detectedHeaderRow: number;
  headerValues: string[];
  rawRows: RawRowData[];
  validCount: number;
}

export default function RecipientsManagementPage() {
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [previewCertRecipient, setPreviewCertRecipient] = useState<RecipientItem | null>(null);

  // Excel state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ExcelPreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false); // Default: Append (นำเข้าเพิ่มต่อท้าย ไม่ลบของเดิม)
  const [importAllSheets, setImportAllSheets] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Flexible Column Mapping State
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);

  // Cert Number Mapping
  const [certMode, setCertMode] = useState<'column' | 'auto'>('column');
  const [certColIdx, setCertColIdx] = useState<number>(-1);
  const [autoCertPrefix, setAutoCertPrefix] = useState<string>('');
  const [autoCertStartNum, setAutoCertStartNum] = useState<number>(1);
  const [autoCertDigits, setAutoCertDigits] = useState<number>(4);

  // Full Name Mapping
  const [nameMode, setNameMode] = useState<'single' | 'combined'>('single');
  const [nameColIdx, setNameColIdx] = useState<number>(-1);
  const [prefixColIdx, setPrefixColIdx] = useState<number>(-1);
  const [firstNameColIdx, setFirstNameColIdx] = useState<number>(-1);
  const [lastNameColIdx, setLastNameColIdx] = useState<number>(-1);

  // Organization Mapping
  const [orgMode, setOrgMode] = useState<'column' | 'sheetName' | 'fixed' | 'none'>('column');
  const [orgColIdx, setOrgColIdx] = useState<number>(-1);
  const [orgFixedValue, setOrgFixedValue] = useState<string>('');

  // Note Mapping
  const [noteMode, setNoteMode] = useState<'column' | 'includeAllExtra' | 'none'>('column');
  const [noteColIdx, setNoteColIdx] = useState<number>(-1);

  // Load project info
  const loadProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        setAutoCertPrefix(`${data.project.code}-`);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  // Load recipients
  const loadRecipients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        projectId: id,
        query: search.trim(),
        page: currentPage.toString(),
        limit: '15',
      });
      const res = await fetch(`/api/recipients?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecipients(data.recipients);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, search, currentPage]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  // Request preview for a file and specific sheet
  const fetchPreview = async (file: File, sheetName?: string) => {
    try {
      setPreviewLoading(true);
      setErrorMessage(null);
      const fd = new FormData();
      fd.append('file', file);
      if (sheetName) {
        fd.append('sheetName', sheetName);
      }

      const res = await fetch('/api/excel/preview', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setPreviewData(d);

        // Auto-populate mapping state from detected values
        const detectedH = d.detectedHeaderRow >= 0 ? d.detectedHeaderRow : 0;
        setHeaderRowIdx(detectedH);

        const cols = d.detectedColumns || {};
        if (cols.certColIdx >= 0) {
          setCertMode('column');
          setCertColIdx(cols.certColIdx);
        } else {
          setCertMode('auto');
          setCertColIdx(-1);
        }

        if (cols.firstNameColIdx >= 0 && cols.lastNameColIdx >= 0) {
          setNameMode('combined');
          setPrefixColIdx(cols.prefixColIdx);
          setFirstNameColIdx(cols.firstNameColIdx);
          setLastNameColIdx(cols.lastNameColIdx);
        } else if (cols.nameColIdx >= 0) {
          setNameMode('single');
          setNameColIdx(cols.nameColIdx);
        } else if (cols.firstNameColIdx >= 0) {
          setNameMode('single');
          setNameColIdx(cols.firstNameColIdx);
        } else {
          setNameMode('single');
          setNameColIdx(0);
        }

        if (cols.orgColIdx >= 0) {
          setOrgMode('column');
          setOrgColIdx(cols.orgColIdx);
        } else if (d.sheetNames && d.sheetNames.length > 1) {
          setOrgMode('sheetName');
          setOrgColIdx(-1);
        } else {
          setOrgMode('none');
          setOrgColIdx(-1);
        }

        if (d.sheetNames && d.sheetNames.length > 1) {
          setImportAllSheets(true);
        } else {
          setImportAllSheets(false);
        }

        if (totalCount > 0) {
          setAutoCertStartNum(totalCount + 1);
        }

        if (cols.noteColIdx >= 0) {
          setNoteMode('column');
          setNoteColIdx(cols.noteColIdx);
        } else {
          setNoteMode('includeAllExtra');
          setNoteColIdx(-1);
        }
      } else {
        setErrorMessage(data.error || 'ไม่สามารถอ่านไฟล์ Excel ได้');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการประมวลผล Excel');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle Excel file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportSuccessMsg(null);
    setErrorMessage(null);
    await fetchPreview(file);
  };

  // Switch Sheet in Workbook
  const handleSheetChange = async (sheetName: string) => {
    if (!selectedFile) return;
    await fetchPreview(selectedFile, sheetName);
  };

  // Active column headers based on currently selected headerRowIdx
  const activeColumnHeaders = useMemo(() => {
    if (!previewData || !previewData.rawRows) return [];
    const targetRow = previewData.rawRows.find((r) => r.rowIndex === headerRowIdx);
    if (!targetRow) return [];

    return targetRow.values.map((val, idx) => ({
      index: idx,
      label: val && val.trim() ? `${String.fromCharCode(65 + idx)}: ${val.trim()}` : `คอลัมน์ ${String.fromCharCode(65 + idx)}`,
      name: val && val.trim() ? val.trim() : `(ว่าง)`,
    }));
  }, [previewData, headerRowIdx]);

  // Real-time Preview Table computed directly in browser!
  const livePreviewList = useMemo(() => {
    if (!previewData || !previewData.rawRows) return [];

    const rowsAfterHeader = previewData.rawRows.filter((r) => r.rowIndex > headerRowIdx);
    const result: Array<{
      rowNumber: number;
      certNumber: string;
      fullName: string;
      organization: string;
      note: string;
    }> = [];

    let autoNum = autoCertStartNum;

    for (const row of rowsAfterHeader) {
      const r = row.values;
      if (!r || r.length === 0) continue;

      // Full Name
      let fullName = '';
      if (nameMode === 'combined') {
        const pref = prefixColIdx >= 0 && r[prefixColIdx] ? r[prefixColIdx].trim() : '';
        const fn = firstNameColIdx >= 0 && r[firstNameColIdx] ? r[firstNameColIdx].trim() : '';
        const ln = lastNameColIdx >= 0 && r[lastNameColIdx] ? r[lastNameColIdx].trim() : '';
        fullName = `${pref} ${fn} ${ln}`.trim().replace(/\s+/g, ' ');
      } else {
        fullName = (nameColIdx >= 0 && r[nameColIdx] ? r[nameColIdx].trim() : '').replace(/\s+/g, ' ');
      }

      if (!fullName) continue;

      // Cert Number
      let certNumber = '';
      if (certMode === 'auto') {
        certNumber = `${autoCertPrefix || (project?.code || 'CERT') + '-'}${String(autoNum).padStart(autoCertDigits, '0')}`;
        autoNum++;
      } else if (certColIdx >= 0 && r[certColIdx] && r[certColIdx].trim()) {
        certNumber = r[certColIdx].trim();
      } else {
        certNumber = `${autoCertPrefix || (project?.code || 'CERT') + '-'}${String(autoNum).padStart(autoCertDigits, '0')}`;
        autoNum++;
      }

      // Organization
      let organization = '-';
      if (orgMode === 'column' && orgColIdx >= 0 && r[orgColIdx]) {
        organization = r[orgColIdx].trim();
      } else if (orgMode === 'fixed' && orgFixedValue.trim()) {
        organization = orgFixedValue.trim();
      } else if (project?.location) {
        organization = project.location;
      }

      // Note
      let note = '-';
      if (noteMode === 'column' && noteColIdx >= 0 && r[noteColIdx]) {
        note = r[noteColIdx].trim();
      } else if (noteMode === 'includeAllExtra') {
        const mappedIndices = new Set([
          certColIdx,
          nameColIdx,
          prefixColIdx,
          firstNameColIdx,
          lastNameColIdx,
          orgColIdx,
          noteColIdx,
        ]);
        const extras: string[] = [];
        if (noteColIdx >= 0 && r[noteColIdx] && r[noteColIdx].trim()) {
          extras.push(r[noteColIdx].trim());
        }
        for (let c = 0; c < r.length; c++) {
          if (!mappedIndices.has(c) && r[c] && r[c].trim()) {
            const hName = activeColumnHeaders[c]?.name || `คอลัมน์ ${c + 1}`;
            extras.push(`${hName}: ${r[c].trim()}`);
          }
        }
        if (extras.length > 0) {
          note = extras.join(' | ');
        }
      }

      result.push({
        rowNumber: row.rowIndex + 1,
        certNumber,
        fullName,
        organization,
        note,
      });

      if (result.length >= 10) break;
    }

    return result;
  }, [
    previewData,
    headerRowIdx,
    certMode,
    certColIdx,
    autoCertPrefix,
    autoCertStartNum,
    autoCertDigits,
    nameMode,
    nameColIdx,
    prefixColIdx,
    firstNameColIdx,
    lastNameColIdx,
    orgMode,
    orgColIdx,
    orgFixedValue,
    noteMode,
    noteColIdx,
    project,
    activeColumnHeaders,
  ]);

  // Confirm Import with explicit mappings
  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    try {
      setImporting(true);
      setErrorMessage(null);

      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('projectId', id);
      fd.append('overwrite', overwrite ? 'true' : 'false');
      fd.append('importAllSheets', importAllSheets ? 'true' : 'false');
      fd.append('sheetName', importAllSheets ? '__ALL__' : (previewData?.activeSheet || ''));
      fd.append('headerRowIdx', headerRowIdx.toString());

      // Cert mappings
      fd.append('certMode', certMode);
      fd.append('certColIdx', certColIdx.toString());
      fd.append('autoCertPrefix', autoCertPrefix);
      fd.append('autoCertStartNum', autoCertStartNum.toString());
      fd.append('autoCertDigits', autoCertDigits.toString());

      // Name mappings
      fd.append('nameMode', nameMode);
      fd.append('nameColIdx', nameColIdx.toString());
      fd.append('prefixColIdx', prefixColIdx.toString());
      fd.append('firstNameColIdx', firstNameColIdx.toString());
      fd.append('lastNameColIdx', lastNameColIdx.toString());

      // Org mappings
      fd.append('orgMode', orgMode);
      fd.append('orgColIdx', orgColIdx.toString());
      fd.append('orgFixedValue', orgFixedValue);

      // Note mappings
      fd.append('noteMode', noteMode);
      fd.append('noteColIdx', noteColIdx.toString());

      const res = await fetch('/api/excel/import', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (data.success) {
        setImportSuccessMsg(data.message || `นำเข้าสำเร็จ ${data.importedCount} รายชื่อ`);
        setSelectedFile(null);
        setPreviewData(null);
        setCurrentPage(1);
        loadRecipients();
      } else {
        setErrorMessage(data.error || 'นำเข้าไม่สำเร็จ');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setImporting(false);
    }
  };

  // Delete recipient
  const handleDeleteRecipient = async (recipId: string, name: string) => {
    if (!confirm(`ยืนยันการลบรายชื่อ "${name}" ออกจากโครงการ?`)) return;

    try {
      const res = await fetch(`/api/recipients/${recipId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadRecipients();
      } else {
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cmtc-800 font-semibold mb-1">
            <Link href="/admin" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              จัดการโครงการ
            </Link>
            <span>/</span>
            <span className="text-slate-400 font-mono">{project?.code}</span>
            <span>/</span>
            <span>นำเข้าและจัดสรรข้อมูล Excel</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            นำเข้าและจัดการรายชื่อผู้รับเกียรติบัตร
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            โครงการ: <strong className="text-slate-800">{project?.title}</strong>
          </p>
        </div>

        <Link
          href={`/admin/project/${id}/editor`}
          className="px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-cmtc-800 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Palette className="w-4 h-4 text-cmtc-800" />
          ไปที่ Visual Editor
        </Link>
      </div>

      {/* Success Notification */}
      {importSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{importSuccessMsg}</span>
          </div>
          <button onClick={() => setImportSuccessMsg(null)} className="text-slate-500 hover:text-slate-800 font-semibold">
            ปิด
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-500 hover:text-slate-800 font-semibold">
            ปิด
          </button>
        </div>
      )}

      {/* Excel Upload & Column Selector Section */}
      <div className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                อัปโหลดไฟล์ Excel และกำหนดคอลัมน์นำเข้า (Flexible Column Mapping)
              </h2>
              <p className="text-xs text-slate-500">
                รองรับไฟล์ที่มีโครงสร้างแตกต่างกัน ขาดคอลัมน์ หรือมีคอลัมน์เกินมา สามารถเลือกจับคู่ได้อิสระ
              </p>
            </div>
          </div>

          <a
            href="/api/excel/template"
            download="certificate_template_cmtc.xlsx"
            className="px-4 py-2.5 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white text-xs font-bold shadow-md shadow-red-900/15 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0"
            title="ดาวน์โหลดไฟล์ตัวอย่าง Excel ที่จัดคอลัมน์มาตรฐานไว้ให้เรียบร้อยแล้ว"
          >
            <Download className="w-4 h-4" />
            <span>📥 ดาวน์โหลดไฟล์แม่แบบ Excel (Template)</span>
          </a>
        </div>

        {/* Template info & extra column guarantee banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                คอลัมน์มาตรฐานแม่แบบ:
              </span>
              <span className="text-xs text-slate-700 font-medium">
                <span className="text-cmtc-800 font-bold">ลำดับ</span> |{' '}
                <span className="text-emerald-700 font-bold">ชื่อ</span> |{' '}
                <span className="text-emerald-700 font-bold">นามสกุล</span> |{' '}
                <span className="text-sky-700 font-bold">สถานศึกษา</span> |{' '}
                <span className="text-cmtc-800 font-bold">ทะเบียน</span>
              </span>
            </div>
            <a
              href="/api/excel/template"
              className="text-xs text-cmtc-800 hover:text-cmtc-900 underline font-semibold flex items-center gap-1"
            >
              คลิกเพื่อดาวน์โหลดไฟล์ .xlsx ตัวอย่าง
            </a>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-600 pt-1.5 border-t border-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-800">✨ ความยืดหยุ่นสูง:</strong> หากไฟล์ของคุณมีคอลัมน์เพิ่มเติม (เช่น คำนำหน้า, ตำแหน่ง, สาขาวิชา, เบอร์โทร, วันที่ หรือคอลัมน์อื่นๆ ที่คุณเพิ่มเอง) ระบบสามารถนำเข้าได้ทั้งหมดโดยไม่มีข้อผิดพลาด โดยจะจัดเก็บข้อมูลส่วนเกินเข้าสู่ช่องหมายเหตุให้อัตโนมัติ
            </span>
          </div>
        </div>

        {/* Dropzone */}
        {!previewData && (
          <label className="border-2 border-dashed border-slate-300 hover:border-cmtc-600 bg-slate-50/70 hover:bg-red-50/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 group-hover:text-cmtc-800 transition-colors mb-3" />
            <p className="text-sm font-semibold text-slate-800">
              คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวาง (.xlsx / .xls)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ระบบจะเปิดเครื่องมือให้คุณตรวจสอบและจับคู่คอลัมน์ได้ตามต้องการ
            </p>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              disabled={previewLoading || importing}
              className="hidden"
            />
          </label>
        )}

        {/* Loading */}
        {previewLoading && (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cmtc-800" />
            กำลังเปิดและตรวจสอบโครงสร้างชีตในไฟล์ Excel...
          </div>
        )}

        {/* INTERACTIVE COLUMN MAPPING PANEL */}
        {previewData && (
          <div className="space-y-6 pt-2">
            {/* Top Sheet & File Summary Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-700">
                    ไฟล์: <strong className="text-slate-900">{previewData.fileName}</strong>
                  </span>
                  <span className="text-slate-500">({previewData.totalRows} แถวทั้งหมด)</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-slate-500">เปลี่ยนไฟล์:</label>
                  <label className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors text-[11px] font-semibold shadow-xs">
                    เลือกไฟล์ใหม่
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Multi-Sheet Selection Controls */}
              {previewData.sheetNames.length > 1 && (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cmtc-800" />
                      พบข้อมูลทั้งหมด <strong className="text-cmtc-800">{previewData.sheetNames.length} ชีต</strong> ในไฟล์นี้:
                    </span>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] shadow-xs">
                      <button
                        type="button"
                        onClick={() => setImportAllSheets(true)}
                        className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                          importAllSheets
                            ? 'bg-cmtc-800 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        นำเข้าทุกชีตพร้อมกัน ({previewData.sheetNames.length} ชีต)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportAllSheets(false)}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          !importAllSheets
                            ? 'bg-cmtc-800 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        เลือกนำเข้าทีละชีต
                      </button>
                    </div>
                  </div>

                  {importAllSheets ? (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-cmtc-800 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-cmtc-900">
                          ⚡ โหมดนำเข้าทุกชีตพร้อมกันทั้งหมด ({previewData.sheetNames.length} ชีต)
                        </p>
                        <p className="text-[11px] text-slate-700 mt-0.5">
                          ระบบจะดึงรายชื่อจากทุกชีต ({previewData.sheetNames.join(', ')}) และนำเข้าพร้อมกันในการคลิกครั้งเดียว (สามารถตั้งค่าให้ใช้ชื่อชีตเป็นสังกัด/สถานศึกษาได้ในขั้นตอนที่ 2)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-500 mr-1">กำลังดูชีต:</span>
                      {previewData.sheetNames.map((sheet) => {
                        const isSelected = sheet === previewData.activeSheet;
                        return (
                          <button
                            key={sheet}
                            type="button"
                            onClick={() => handleSheetChange(sheet)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-cmtc-800 text-white font-bold shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {sheet}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 1: Choose Header Row */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-cmtc-800 font-bold flex items-center justify-center text-[11px] border border-red-200">
                    1
                  </span>
                  เลือกแถวที่เป็นหัวตาราง (Header Row)
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  ระบบตรวจจับแนะนำแถวที่ {previewData.detectedHeaderRow + 1}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                หากไฟล์ของคุณมีชื่อหัวข้อเอกสารหลายบรรทัดด้านบน ให้เลือกแถวที่มีชื่อคอลัมน์จริง (เช่น ลำดับ, ทะเบียน, ชื่อ-สกุล)
              </p>

              <select
                value={headerRowIdx}
                onChange={(e) => setHeaderRowIdx(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-cmtc-700 focus:outline-none shadow-xs"
              >
                {previewData.rawRows.map((row) => {
                  const previewStr = row.values.filter(Boolean).slice(0, 5).join(' | ');
                  return (
                    <option key={row.rowIndex} value={row.rowIndex}>
                      แถวที่ {row.rowIndex + 1} {previewStr ? `👉 ${previewStr}` : '(แถวว่าง)'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Step 2: Column Mapping Cards */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-100 text-cmtc-800 font-bold flex items-center justify-center text-[11px] border border-red-200">
                  2
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  เลือกข้อมูลที่ต้องการนำเข้าไปใส่ในระบบ (จับคู่คอลัมน์)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. เลขทะเบียน / Cert Number */}
                <div className="glass-card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cmtc-800 flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-cmtc-800" />
                      เลขที่ / เลขทะเบียนเกียรติบัตร
                    </label>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-red-50 text-cmtc-800 border border-red-200/60 font-semibold font-mono">
                      certNumber
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCertMode('column')}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                        certMode === 'column'
                          ? 'bg-cmtc-800 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      เลือกจากคอลัมน์ใน Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setCertMode('auto')}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                        certMode === 'auto'
                          ? 'bg-cmtc-800 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ⚡ สร้างเลขอัตโนมัติ
                    </button>
                  </div>

                  {certMode === 'column' ? (
                    <div>
                      <select
                        value={certColIdx}
                        onChange={(e) => setCertColIdx(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none transition-all shadow-xs"
                      >
                        <option value={-1}>-- ไม่ระบุ (ระบบจะรันเลขอัตโนมัติ) --</option>
                        {activeColumnHeaders.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 text-xs">
                      <div className="flex items-center gap-2">
                        <label className="text-slate-600 w-24 shrink-0 font-medium">คำนำหน้ารหัส:</label>
                        <input
                          type="text"
                          value={autoCertPrefix}
                          onChange={(e) => setAutoCertPrefix(e.target.value)}
                          placeholder={`${project?.code || 'CMTC'}-`}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-cmtc-700"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-slate-600 w-24 shrink-0 font-medium">เริ่มที่เลข:</label>
                        <input
                          type="number"
                          value={autoCertStartNum}
                          onChange={(e) => setAutoCertStartNum(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-cmtc-700"
                        />
                        <span className="text-[11px] text-slate-500 font-mono">
                          ตัวอย่าง: {autoCertPrefix}{String(autoCertStartNum).padStart(autoCertDigits, '0')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. ชื่อ - นามสกุล / Full Name (Required) */}
                <div className="glass-card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-600" />
                      ชื่อ - นามสกุล ผู้รับเกียรติบัตร <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                      จำเป็น
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNameMode('single')}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                        nameMode === 'single'
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      คอลัมน์เดียว (รวมชื่อ-สกุล)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameMode('combined')}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-medium text-center transition-all ${
                        nameMode === 'combined'
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      แยก (คำนำหน้า + ชื่อ + สกุล)
                    </button>
                  </div>

                  {nameMode === 'single' ? (
                    <div>
                      <select
                        value={nameColIdx}
                        onChange={(e) => setNameColIdx(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-all shadow-xs"
                      >
                        <option value={-1}>-- เลือกคอลัมน์ชื่อ-นามสกุล --</option>
                        {activeColumnHeaders.map((col) => (
                          <option key={col.index} value={col.index}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-slate-600 font-medium">คำนำหน้า:</span>
                        <select
                          value={prefixColIdx}
                          onChange={(e) => setPrefixColIdx(Number(e.target.value))}
                          className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white"
                        >
                          <option value={-1}>-- ไม่มี / ข้าม --</option>
                          {activeColumnHeaders.map((col) => (
                            <option key={col.index} value={col.index}>{col.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-slate-600 font-medium">ชื่อตัว:</span>
                        <select
                          value={firstNameColIdx}
                          onChange={(e) => setFirstNameColIdx(Number(e.target.value))}
                          className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white"
                        >
                          <option value={-1}>-- เลือกคอลัมน์ชื่อ --</option>
                          {activeColumnHeaders.map((col) => (
                            <option key={col.index} value={col.index}>{col.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-slate-600 font-medium">นามสกุล:</span>
                        <select
                          value={lastNameColIdx}
                          onChange={(e) => setLastNameColIdx(Number(e.target.value))}
                          className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white"
                        >
                          <option value={-1}>-- ไม่มี / ข้าม --</option>
                          {activeColumnHeaders.map((col) => (
                            <option key={col.index} value={col.index}>{col.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. สถานศึกษา / หน่วยงาน */}
                <div className="glass-card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-sky-600" />
                      สถานศึกษา / หน่วยงาน
                    </label>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-mono font-semibold">
                      organization
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setOrgMode('column')}
                      className={`py-1.5 px-1.5 rounded-lg font-medium text-center text-[11px] transition-all ${
                        orgMode === 'column'
                          ? 'bg-sky-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      เลือกจาก Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgMode('sheetName')}
                      className={`py-1.5 px-1.5 rounded-lg font-medium text-center text-[11px] transition-all ${
                        orgMode === 'sheetName'
                          ? 'bg-sky-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      🏷️ ใช้ชื่อชีต
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgMode('fixed')}
                      className={`py-1.5 px-1.5 rounded-lg font-medium text-center text-[11px] transition-all ${
                        orgMode === 'fixed'
                          ? 'bg-sky-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ข้อความตายตัว
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrgMode('none')}
                      className={`py-1.5 px-1.5 rounded-lg font-medium text-center text-[11px] transition-all ${
                        orgMode === 'none'
                          ? 'bg-sky-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ไม่ระบุ
                    </button>
                  </div>

                  {orgMode === 'sheetName' && (
                    <p className="text-[11px] text-sky-700 py-1 leading-relaxed">
                      💡 ระบบจะใช้<strong>ชื่อชีตของแต่ละหน้า</strong>เป็นชื่อสถานศึกษา/สังกัดให้อัตโนมัติ (เช่น {previewData?.sheetNames.slice(0, 3).join(', ')}{previewData && previewData.sheetNames.length > 3 ? '...' : ''}) เหมาะสำหรับไฟล์ที่แยกชีตตามแต่ละวิทยาลัย
                    </p>
                  )}

                  {orgMode === 'column' && (
                    <select
                      value={orgColIdx}
                      onChange={(e) => setOrgColIdx(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-600 focus:outline-none transition-all shadow-xs"
                    >
                      <option value={-1}>-- ไม่ระบุ --</option>
                      {activeColumnHeaders.map((col) => (
                        <option key={col.index} value={col.index}>
                          {col.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {orgMode === 'fixed' && (
                    <input
                      type="text"
                      value={orgFixedValue}
                      onChange={(e) => setOrgFixedValue(e.target.value)}
                      placeholder="เช่น วิทยาลัยเทคนิคตาก"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-600 focus:outline-none transition-all shadow-xs"
                    />
                  )}

                  {orgMode === 'none' && (
                    <p className="text-[11px] text-slate-500 italic py-1.5">
                      จะใช้สถานที่จัดงานของโครงการ ({project?.location || 'ไม่มี'}) หรือเว้นว่าง
                    </p>
                  )}
                </div>

                {/* 4. หมายเหตุ / ข้อมูลคอลัมน์ส่วนเกิน */}
                <div className="glass-card p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-rose-600" />
                      หมายเหตุ & ข้อมูลส่วนเกินในไฟล์
                    </label>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-semibold">
                      note / extra
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNoteMode('column')}
                      className={`flex-1 py-1.5 px-1.5 rounded-lg font-medium text-center text-[11px] transition-all ${
                        noteMode === 'column'
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      เลือกจาก Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteMode('includeAllExtra')}
                      className={`flex-1 py-1.5 px-1.5 rounded-lg font-medium text-center text-[11px] transition-all ${
                        noteMode === 'includeAllExtra'
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      รวมคอลัมน์ส่วนเกินทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteMode('none')}
                      className={`flex-1 py-1.5 px-1.5 rounded-lg font-medium text-center text-[11px] transition-all ${
                        noteMode === 'none'
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ไม่ระบุ
                    </button>
                  </div>

                  {noteMode === 'column' && (
                    <select
                      value={noteColIdx}
                      onChange={(e) => setNoteColIdx(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-600 focus:outline-none transition-all shadow-xs"
                    >
                      <option value={-1}>-- ไม่ระบุ --</option>
                      {activeColumnHeaders.map((col) => (
                        <option key={col.index} value={col.index}>
                          {col.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {noteMode === 'includeAllExtra' && (
                    <p className="text-[11px] text-slate-600 py-1.5">
                      💡 ข้อมูลคอลัมน์อื่นๆ ที่ไม่ได้เลือก (เช่น เบอร์โทร, ตำแหน่ง, สาขา) จะถูกรวมเข้าในช่องหมายเหตุให้อัตโนมัติ ป้องกันข้อมูลตกหล่น
                    </p>
                  )}

                  {noteMode === 'none' && (
                    <p className="text-[11px] text-slate-500 italic py-1.5">
                      ไม่บันทึกข้อมูลหมายเหตุ
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Real-time Live Preview Table */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-cmtc-800 font-bold flex items-center justify-center text-[11px] border border-red-200">
                    3
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    พรีวิวผลลัพธ์ที่จะบันทึกลงฐานข้อมูลจริง (Live Data Preview)
                  </h3>
                </div>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ตัวอย่าง 10 แถวแรกจากที่ตรวจพบ
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-16">แถว</th>
                      <th className="py-2.5 px-3 text-cmtc-800">เลขทะเบียน</th>
                      <th className="py-2.5 px-3 text-emerald-700">ชื่อ - นามสกุล</th>
                      <th className="py-2.5 px-3 text-sky-700">สถานศึกษา / สังกัด</th>
                      <th className="py-2.5 px-3 text-slate-600">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {livePreviewList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                          ยังไม่มีแถวข้อมูลที่ตรงกับการจับคู่คอลัมน์ กรุณาเลือกคอลัมน์ชื่อ-นามสกุลให้ถูกต้อง
                        </td>
                      </tr>
                    ) : (
                      livePreviewList.map((row) => (
                        <tr key={row.rowNumber} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{row.rowNumber}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-cmtc-800 font-bold bg-red-50/80 px-2 py-0.5 rounded border border-red-100/80 inline-block">
                              {row.certNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-900 font-semibold">{row.fullName}</td>
                          <td className="py-2.5 px-3 text-slate-700">{row.organization}</td>
                          <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{row.note}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 4: Import Options & Confirmation */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-cmtc-800 font-bold flex items-center justify-center text-[11px] border border-red-200">
                    4
                  </span>
                  เลือกรูปแบบการนำเข้าข้อมูล (Import Mode)
                </label>
                <p className="text-[11px] text-slate-500">
                  เลือกได้ว่าจะนำเข้ารายชื่อใหม่เข้าไปเพิ่มต่อท้ายรายชื่อเดิม หรือลบของเดิมแล้วเขียนทับ
                </p>
              </div>

              {/* Import Mode Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOverwrite(false)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    !overwrite
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      !overwrite ? 'bg-emerald-600 text-white font-black' : 'border border-slate-300'
                    }`}
                  >
                    {!overwrite && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-emerald-800">
                        ➕ นำเข้าเพิ่มต่อท้าย (Append)
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        แนะนำ / ปลอดภัย
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      รายชื่อเดิมที่มีอยู่ ({totalCount} คน) จะ<strong>ไม่ถูกลบ</strong> และรายชื่อใหม่จากไฟล์ Excel นี้จะถูกนำเข้าไปเพิ่มต่อท้ายทันที
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOverwrite(true)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    overwrite
                      ? 'bg-red-50/80 border-red-300 text-red-950 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      overwrite ? 'bg-red-600 text-white font-black' : 'border border-slate-300'
                    }`}
                  >
                    {overwrite && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-red-700">
                      🔄 ล้างของเดิมแล้วเขียนทับ (Overwrite)
                    </span>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      ⚠️ <strong>ลบรายชื่อเดิมทั้งหมดในโครงการ</strong> ({totalCount} คน) แล้วแทนที่ด้วยเฉพาะรายชื่อจากไฟล์นี้
                    </p>
                  </div>
                </button>
              </div>

              {/* Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <div className="text-xs text-slate-600">
                  {importAllSheets ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-cmtc-800 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-cmtc-800" />
                      กำลังนำเข้าจากทุกชีต ({previewData.sheetNames.length} ชีต)
                    </span>
                  ) : (
                    <span>
                      กำลังนำเข้าเฉพาะชีต: <strong className="text-slate-900 font-semibold">"{previewData.activeSheet}"</strong>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || livePreviewList.length === 0}
                  className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                    overwrite
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                      : 'bg-cmtc-800 hover:bg-cmtc-900 text-white shadow-red-900/15'
                  }`}
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-current" />
                      <span>กำลังประมวลผลและนำเข้าข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-current" />
                      <span>
                        {overwrite
                          ? 'ยืนยันล้างข้อมูลเดิมและเขียนทับ'
                          : importAllSheets
                          ? `ยืนยันนำเข้ารายชื่อเพิ่ม (ทุกชีต)`
                          : 'ยืนยันนำเข้ารายชื่อเพิ่มต่อท้าย'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Existing Recipients Table */}
      <div id="recipients-table" className="glass-panel p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-50 border border-red-100 text-cmtc-800">
              <Users className="w-5 h-5 text-cmtc-800" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              รายชื่อผู้รับเกียรติบัตรในระบบ ({totalCount} คน)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {recipients.length > 0 && (
              <button
                type="button"
                onClick={() => setPreviewCertRecipient(recipients[0])}
                className="px-4 py-2 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-red-900/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="ดูตัวอย่างเกียรติบัตรจริงพร้อมรูปภาพและโลโก้ที่บันทึกไว้"
              >
                <Eye className="w-4 h-4 text-white" />
                <span>👁️ ดูตัวอย่างเกียรติบัตรจริง (พร้อมรูป/โลโก้)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
                if (fileInput && !previewData) {
                  fileInput.click();
                }
              }}
              className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>➕ อัปโหลดไฟล์ Excel เพิ่มเติม</span>
            </button>

            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาชื่อ หรือเลขทะเบียน..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cmtc-700 shadow-xs transition-all"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            กำลังโหลดรายชื่อ...
          </div>
        ) : recipients.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            ยังไม่มีรายชื่อผู้รับเกียรติบัตรในโครงการนี้ อัปโหลดไฟล์ Excel ด้านบนเพื่อนำเข้ารายชื่อ
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">เลขทะเบียน</th>
                  <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                  <th className="py-3 px-4">สถานศึกษา</th>
                  <th className="py-3 px-4">หมายเหตุ</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {recipients.map((recip) => (
                  <tr key={recip.id} className="hover:bg-slate-50/70 group transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-cmtc-800 font-bold bg-red-50/80 px-2 py-0.5 rounded border border-red-200/60 inline-block">
                        {recip.certNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-900 font-semibold">
                      {recip.fullName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {recip.organization || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {recip.note || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewCertRecipient(recip)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-cmtc-800 border border-red-200 text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                          title="ดูตัวอย่างเกียรติบัตรจริงพร้อมโลโก้"
                        >
                          <Eye className="w-3.5 h-3.5 text-cmtc-800" />
                          <span>ดูเกียรติบัตร</span>
                        </button>
                        <Link
                          href={`/cert/${recip.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="เปิดแท็บใหม่ (หน้าตรวจสอบความถูกต้อง)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteRecipient(recip.id, recip.fullName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="ลบรายชื่อ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination: 1 2 3 4 5 */}
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </div>

      {/* Live Certificate Preview Modal */}
      {previewCertRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-cmtc-800" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    ตัวอย่างเกียรติบัตรจริง (Real-Time Render)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {previewCertRecipient.fullName} • เลขทะเบียน: <span className="font-mono text-cmtc-800 font-semibold">{previewCertRecipient.certNumber}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCertRecipient(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Rendered Certificate Image */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-100">
              <div className="relative rounded-2xl overflow-hidden cert-shadow border border-slate-200 max-w-full bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/certificates/render?recipientId=${previewCertRecipient.id}&format=png&v=${Date.now()}`}
                  alt={`เกียรติบัตร ${previewCertRecipient.fullName}`}
                  className="w-full h-auto max-h-[60vh] object-contain block select-none"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>เรนเดอร์ตรงจากแม่แบบระบบ รวมถึงรูปภาพ/โลโก้/ข้อความทั้งหมดที่บันทึกไว้</span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/admin/project/${id}/editor`}
                className="px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-cmtc-800 border border-red-200 text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Palette className="w-4 h-4" />
                <span>✏️ กลับไปปรับแต่งตำแหน่ง/รูปภาพใน Editor</span>
              </Link>

              <div className="flex items-center gap-2.5">
                <a
                  href={`/api/certificates/render?recipientId=${previewCertRecipient.id}&format=pdf&download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-900/15 transition-all hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลด PDF</span>
                </a>
                <a
                  href={`/cert/${previewCertRecipient.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 shadow-xs transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-cmtc-800" />
                  <span>เปิดหน้าดาวน์โหลดเต็ม</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewCertRecipient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
