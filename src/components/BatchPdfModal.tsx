'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FileDown,
  X,
  Layers,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';

interface BatchGroupItem {
  key: string;
  label: string;
  count: number;
}

interface BatchPdfModalProps {
  projectId: string;
  projectCode: string;
  projectTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BatchPdfModal({
  projectId,
  projectCode,
  projectTitle,
  isOpen,
  onClose,
}: BatchPdfModalProps) {
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groups, setGroups] = useState<BatchGroupItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [completedMsg, setCompletedMsg] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen || !projectId) return;

    let active = true;
    async function loadGroups() {
      try {
        setLoadingGroups(true);
        setError(null);
        setCompletedMsg(null);
        const res = await fetch(
          `/api/certificates/batch-data?projectId=${encodeURIComponent(projectId)}&mode=groups`
        );
        const data = await res.json();
        if (!active) return;
        if (data.success) {
          setGroups(data.groups || []);
          setTotalCount(data.totalCount || 0);
        } else {
          setError(data.error || 'ไม่สามารถโหลดข้อมูลชีต/สังกัดได้');
        }
      } catch (e: any) {
        if (active) setError(e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      } finally {
        if (active) setLoadingGroups(false);
      }
    }

    loadGroups();
    return () => {
      active = false;
      abortControllerRef.current?.abort();
    };
  }, [isOpen, projectId]);

  const handleDownloadGroup = async (groupKey: string, groupLabel: string) => {
    try {
      setError(null);
      setCompletedMsg(null);
      setGeneratingKey(groupKey);
      setProgress({ current: 0, total: 0 });

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const res = await fetch(
        `/api/certificates/batch-data?projectId=${encodeURIComponent(projectId)}&organization=${encodeURIComponent(groupKey)}`,
        { signal: controller.signal }
      );
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'ไม่สามารถโหลดรายชื่อสำหรับสร้าง PDF ได้');
        return;
      }

      if (!data.recipients || data.recipients.length === 0) {
        setError('ไม่พบรายชื่อในกลุ่มที่เลือก');
        return;
      }

      setProgress({ current: 0, total: data.recipients.length });

      const { generateBatchCertificatePdf } = await import('@/lib/clientPdfBatch');
      const pdfBytes = await generateBatchCertificatePdf(
        {
          project: data.project,
          template: data.template,
          recipients: data.recipients,
        },
        {
          signal: controller.signal,
          onProgress: (current, total) => setProgress({ current, total }),
        }
      );

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeGroup = groupLabel.replace(/[\\/:*?"<>|]/g, '_').trim() || 'all';
      a.href = blobUrl;
      a.download = `${projectCode}-${safeGroup}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

      setCompletedMsg(`ดาวน์โหลด PDF "${groupLabel}" (${data.recipients.length} หน้า) เรียบร้อยแล้ว`);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF');
      }
    } finally {
      setGeneratingKey(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = () => {
    abortControllerRef.current?.abort();
    setGeneratingKey(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5 text-cmtc-800" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900">
                ดาวน์โหลด PDF แยกตามชีต / สถานศึกษา
              </h3>
              <p className="text-xs text-slate-500 truncate">
                <span className="font-mono text-cmtc-800 font-semibold">{projectCode}</span> • {projectTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              handleCancelGeneration();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/70">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {completedMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">{completedMsg}</span>
            </div>
          )}

          {generatingKey && (
            <div className="p-4 rounded-2xl bg-white border border-red-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cmtc-800 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังสร้างไฟล์ PDF ขนาด A4...{' '}
                  {progress.total > 0 ? `(${progress.current} / ${progress.total} หน้า)` : ''}
                </span>
                <button
                  type="button"
                  onClick={handleCancelGeneration}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600"
                >
                  ยกเลิก
                </button>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cmtc-800 transition-all duration-150"
                  style={{
                    width:
                      progress.total > 0
                        ? `${Math.round((progress.current / progress.total) * 100)}%`
                        : '10%',
                  }}
                />
              </div>
            </div>
          )}

          {loadingGroups ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-cmtc-800" />
              <span>กำลังโหลดรายการชีต / สถานศึกษา...</span>
            </div>
          ) : totalCount === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 p-6">
              ยังไม่มีรายชื่อผู้รับเกียรติบัตรในโครงการนี้
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* All Recipients Option */}
              <div className="p-4 rounded-2xl bg-white border border-red-200 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-50 text-cmtc-800 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">ดาวน์โหลดทั้งหมด (รวมทุกชีต)</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cmtc-800" />
                      <span>{totalCount} คน • {groups.length} กลุ่ม</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={Boolean(generatingKey)}
                  onClick={() => handleDownloadGroup('__ALL__', 'ทั้งหมด')}
                  className="px-4 py-2 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดทั้งหมด</span>
                </button>
              </div>

              {/* Per-Sheet / Organization List */}
              <div className="pt-1 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  เลือกดาวน์โหลดแยกตามชีต / สถานศึกษา ({groups.length} รายการ)
                </p>
                {groups.map((grp, idx) => (
                  <div
                    key={grp.key}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-red-200 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {grp.label}
                        </p>
                        <p className="text-[11px] text-slate-500">{grp.count} คน</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(generatingKey)}
                      onClick={() => handleDownloadGroup(grp.key, grp.label)}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-cmtc-800 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF ({grp.count})</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between text-[11px] text-slate-500">
          <span>ขนาดกระดาษ A4 เต็มขอบ (ความละเอียดสูง 2x)</span>
          <button
            type="button"
            onClick={() => {
              handleCancelGeneration();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
