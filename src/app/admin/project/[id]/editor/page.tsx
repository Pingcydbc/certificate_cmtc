'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Palette,
  ArrowLeft,
  Save,
  Upload,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Layers,
  Copy,
  X,
  Loader2
} from 'lucide-react';
import CertificateCanvas, { CanvasElement } from '@/components/CertificateCanvas';
import {
  uploadOptimizedImage,
  safeReadJsonResponse,
  formatImageLabel,
} from '@/lib/imageUpload';

interface CloneSourceProject {
  id: string;
  code: string;
  title: string;
  template?: {
    id: string;
    _count?: { elements: number };
  } | null;
}

function normalizeElements(rawElements: any[]): CanvasElement[] {
  return rawElements.map((el: any) => ({
    id: el.id,
    elementType: el.elementType,
    fieldKey: el.fieldKey,
    defaultValue: el.defaultValue,
    posX: el.posX,
    posY: el.posY,
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    fontColor: el.fontColor,
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    maxWidth: el.maxWidth,
    fontWeight: el.fontWeight || 'normal',
    fontStyle: el.fontStyle || 'normal',
    isUnderline: Boolean(el.isUnderline),
    letterSpacing: el.letterSpacing || 0,
    opacity: el.opacity !== undefined && el.opacity !== null ? el.opacity : 1.0,
    width: el.width,
    height: el.height,
  }));
}

interface ProjectData {
  id: string;
  code: string;
  title: string;
  eventDate: string | null;
  location: string | null;
  template?: {
    id: string;
    backgroundImage: string;
    width: number;
    height: number;
    elements: CanvasElement[];
  } | null;
  recipients?: Array<{
    id: string;
    certNumber: string;
    fullName: string;
    organization: string | null;
  }>;
}

export default function CertificateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [bgImage, setBgImage] = useState<string>('/uploads/NSDV01.jpg');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const savedBgImageRef = useRef<string | null>(null);
  const hasTemplateRecordRef = useRef<boolean>(false);

  // Clone template modal state
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSources, setCloneSources] = useState<CloneSourceProject[]>([]);
  const [loadingCloneSources, setLoadingCloneSources] = useState(false);
  const [selectedCloneSourceId, setSelectedCloneSourceId] = useState('');
  const [cloneMode, setCloneMode] = useState<'full' | 'elements_only'>('full');
  const [cloning, setCloning] = useState(false);

  const saveTemplate = useCallback(
    async (currentElements: CanvasElement[], currentBgImage: string) => {
      if (!id) return;
      try {
        setSaving(true);
        setSaveError(null);

        const shouldSendBackground =
          !hasTemplateRecordRef.current || currentBgImage !== savedBgImageRef.current;

        const res = await fetch(`/api/templates/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(shouldSendBackground ? { backgroundImage: currentBgImage } : {}),
            width: 990,
            height: 698,
            elements: currentElements,
          }),
        });

        const data = await safeReadJsonResponse(res);
        if (data.success) {
          savedBgImageRef.current = currentBgImage;
          hasTemplateRecordRef.current = true;
          setIsDirty(false);
          const nowStr = new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          setLastSavedTime(nowStr);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 3000);
        } else {
          setSaveError(data.error || 'บันทึกไม่สำเร็จ');
        }
      } catch (err: any) {
        setSaveError(err.message || 'เกิดข้อผิดพลาดในการบันทึกแม่แบบ');
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  const handleElementsChange = useCallback((newElements: CanvasElement[]) => {
    setElements(newElements);
    setIsDirty(true);
    setSavedSuccess(false);
  }, []);

  // Warn user before closing or refreshing the tab if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Keyboard shortcut: Ctrl+S or Cmd+S to save manually
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveTemplate(elements, bgImage);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [elements, bgImage, saveTemplate]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [projRes, recipRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/recipients?projectId=${id}&limit=1`),
        ]);

        const projData = await safeReadJsonResponse(projRes);
        const recipData = await safeReadJsonResponse(recipRes);

        if (projData.success && projData.project) {
          const p = projData.project;
          setProject({
            ...p,
            recipients: recipData.recipients || [],
          });

          if (p.template) {
            const loadedBg = p.template.backgroundImage || '/uploads/NSDV01.jpg';
            setBgImage(loadedBg);
            savedBgImageRef.current = loadedBg;
            hasTemplateRecordRef.current = true;
            if (p.template.elements && p.template.elements.length > 0) {
              setElements(normalizeElements(p.template.elements));
            }
          }
        } else {
          setError(projData.error || 'ไม่พบข้อมูลโครงการ');
        }
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setSaveError(null);
      const data = await uploadOptimizedImage(file, 'background');
      if (data.success && data.url) {
        setBgImage(data.url);
        setIsDirty(true);
        setSavedSuccess(false);
      } else {
        setSaveError(data.error || 'อัปโหลดไม่สำเร็จ');
      }
    } catch (err: any) {
      setSaveError(err?.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปพื้นหลัง');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    saveTemplate(elements, bgImage);
  };

  const openCloneModal = async () => {
    setShowCloneModal(true);
    setSaveError(null);
    if (cloneSources.length > 0) return;

    try {
      setLoadingCloneSources(true);
      const res = await fetch('/api/projects?scope=manage&limit=100&forTemplateClone=true');
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        const filtered = data.projects.filter((p: CloneSourceProject) => p.id !== id);
        setCloneSources(filtered);
        if (filtered.length > 0) {
          setSelectedCloneSourceId(filtered[0].id);
        }
      }
    } catch {
      setSaveError('ไม่สามารถโหลดรายการแม่แบบโครงการอื่นได้');
    } finally {
      setLoadingCloneSources(false);
    }
  };

  const handleConfirmClone = async () => {
    if (!selectedCloneSourceId) return;
    if (
      isDirty &&
      !window.confirm('คุณมีการแก้ไขที่ยังไม่ได้บันทึก การคัดลอกแม่แบบจะเขียนทับการจัดวางปัจจุบัน ยืนยันหรือไม่?')
    ) {
      return;
    }

    try {
      setCloning(true);
      setSaveError(null);
      const res = await fetch(`/api/templates/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceProjectId: selectedCloneSourceId,
          mode: cloneMode,
        }),
      });
      const data = await safeReadJsonResponse(res);
      if (data.success && data.template) {
        if (cloneMode === 'full' && data.template.backgroundImage) {
          setBgImage(data.template.backgroundImage);
          savedBgImageRef.current = data.template.backgroundImage;
        }
        hasTemplateRecordRef.current = true;
        setElements(normalizeElements(data.template.elements || []));
        setIsDirty(false);
        const nowStr = new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSavedTime(nowStr);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        setShowCloneModal(false);
      } else {
        setSaveError(data.error || 'คัดลอกแม่แบบไม่สำเร็จ');
      }
    } catch (err: any) {
      setSaveError(err.message || 'เกิดข้อผิดพลาดในการคัดลอกแม่แบบ');
    } finally {
      setCloning(false);
    }
  };

  const navigateWithConfirm = (href: string) => {
    if (isDirty) {
      const ok = window.confirm('มีการแก้ไขที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้โดยไม่บันทึกหรือไม่?');
      if (!ok) return;
    }
    router.push(href);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl text-center space-y-4 bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 border-4 border-red-100 border-t-cmtc-800 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">กำลังโหลด Visual Certificate Editor...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl text-center max-w-md space-y-4 bg-white border border-slate-200 shadow-sm">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">เกิดข้อผิดพลาด</h2>
          <p className="text-xs text-slate-500">{error || 'ไม่พบโครงการ'}</p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cmtc-800 text-white font-bold text-xs hover:bg-cmtc-900 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าโครงการ
          </Link>
        </div>
      </div>
    );
  }

  const sampleRecipient = project.recipients?.[0] || {
    certNumber: `${project.code || 'CERT'}-ศขม.0001`,
    fullName: 'นายสมชาย ยิ่งยง',
    organization: project.location || 'ชื่อหน่วยงาน / สถานศึกษา',
  };

  return (
    <div className="min-h-screen py-4 px-3 sm:px-6 w-full space-y-3">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cmtc-800 font-semibold mb-1">
            <button
              type="button"
              onClick={() => navigateWithConfirm('/admin')}
              className="hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              จัดการโครงการ
            </button>
            <span>/</span>
            <span className="text-slate-400 font-mono">{project.code}</span>
            <span>/</span>
            <span>Visual Editor</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 border border-red-100 text-cmtc-800">
              <Palette className="w-6 h-6 text-cmtc-800" />
            </div>
            Visual Certificate Editor: {project.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ลากและวางตำแหน่งตัวหนังสือ ปรับขนาดฟอนต์ สี และการจัดวาง เพื่อให้เกียรติบัตรออกมาสวยงามสมบูรณ์แบบ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isDirty ? (
            <span className="text-[11px] text-amber-700 font-medium hidden sm:flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>ยังไม่บันทึกการเปลี่ยนแปลง</span>
            </span>
          ) : (
            lastSavedTime && (
              <span className="text-[11px] text-emerald-700 font-mono hidden sm:flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>บันทึกล่าสุด ({lastSavedTime} น.)</span>
              </span>
            )
          )}

          <button
            type="button"
            onClick={openCloneModal}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-cmtc-800 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="คัดลอกแม่แบบหรือตำแหน่งการวางตัวหนังสือจากโครงการอื่น"
          >
            <Copy className="w-4 h-4 text-cmtc-800" />
            คัดลอกแม่แบบอื่น
          </button>

          <button
            type="button"
            onClick={() => navigateWithConfirm(`/admin/project/${project.id}/recipients`)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            ไปจัดการรายชื่อ Excel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`relative px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
              savedSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-cmtc-800 hover:bg-cmtc-900 text-white shadow-red-900/15 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="บันทึกการจัดวาง (Ctrl+S)"
          >
            {isDirty && !savedSuccess && !saving && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                aria-hidden="true"
              />
            )}
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                บันทึกเรียบร้อยแล้ว!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึกการจัดวาง (Save)'}
              </>
            )}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="font-semibold hover:underline"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Background Template Bar */}
      <div className="glass-panel px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">ภาพพื้นหลังปัจจุบัน:</span>
          <span className="font-mono text-cmtc-800 bg-red-50 px-2 py-1 rounded border border-red-200/60 truncate max-w-xs font-medium">
            {formatImageLabel(bgImage)}
          </span>
        </div>

        <label className="px-3.5 py-1.5 rounded-lg bg-white text-cmtc-800 border border-red-200 font-semibold hover:bg-red-50 cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
          <Upload className="w-3.5 h-3.5 text-cmtc-800" />
          {uploading ? 'กำลังเปลี่ยนรูป...' : 'เปลี่ยนรูปพื้นหลัง (JPG/PNG)'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUploadBg}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Visual Canvas & Inspector */}
      <div className="pt-2">
        <CertificateCanvas
          backgroundImage={bgImage}
          elements={elements}
          onElementsChange={handleElementsChange}
          width={990}
          height={698}
          sampleData={{
            certNumber: sampleRecipient.certNumber,
            fullName: sampleRecipient.fullName,
            organization: sampleRecipient.organization || 'วิทยาลัยเทคนิคตาก',
            eventDate: project.eventDate || '12-14 พฤษภาคม 2569',
            location: project.location || 'วิทยาลัยเทคนิคตาก',
            projectTitle: project.title,
          }}
        />
      </div>

      {/* Clone Template Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-cmtc-800">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    คัดลอกแม่แบบจากโครงการอื่น
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    นำตำแหน่งข้อความ โลโก้ และ QR Code จากโครงการเดิมมาใช้งานต่อทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {loadingCloneSources ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cmtc-800" />
                  <span>กำลังโหลดรายการโครงการ...</span>
                </div>
              ) : cloneSources.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  ยังไม่มีโครงการอื่นที่สามารถคัดลอกได้
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      เลือกโครงการต้นฉบับ
                    </label>
                    <select
                      value={selectedCloneSourceId}
                      onChange={(e) => setSelectedCloneSourceId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none"
                    >
                      {cloneSources.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.title} ({p.template?._count?.elements ?? 0} องค์ประกอบ)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      เลือกรูปแบบการคัดลอก
                    </label>
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-red-200 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="editorCloneMode"
                        checked={cloneMode === 'full'}
                        onChange={() => setCloneMode('full')}
                        className="mt-0.5 accent-cmtc-800"
                      />
                      <div>
                        <p className="font-bold text-slate-900">คัดลอกทั้งหมด (ภาพพื้นหลัง + การจัดวาง)</p>
                        <p className="text-[11px] text-slate-500">ใช้ภาพพื้นหลัง ข้อความ โลโก้ และตำแหน่งจากต้นฉบับทั้งหมด</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-red-200 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name="editorCloneMode"
                        checked={cloneMode === 'elements_only'}
                        onChange={() => setCloneMode('elements_only')}
                        className="mt-0.5 accent-cmtc-800"
                      />
                      <div>
                        <p className="font-bold text-slate-900">คัดลอกเฉพาะการจัดวาง (เก็บภาพพื้นหลังเดิมไว้)</p>
                        <p className="text-[11px] text-slate-500">นำเฉพาะข้อความ โลโก้ และตำแหน่งมาวางบนภาพพื้นหลังปัจจุบันของโครงการนี้</p>
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={cloning || !selectedCloneSourceId || cloneSources.length === 0}
                onClick={handleConfirmClone}
                className="px-5 py-2 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {cloning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{cloning ? 'กำลังคัดลอก...' : 'ยืนยันคัดลอกแม่แบบ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
