'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Layers
} from 'lucide-react';
import CertificateCanvas, { CanvasElement } from '@/components/CertificateCanvas';

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
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const isInitialLoad = useRef(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveTemplate = useCallback(
    async (currentElements: CanvasElement[], currentBgImage: string, isAutoSave = false) => {
      if (!id) return;
      try {
        setSaving(true);
        if (!isAutoSave) setError(null);

        const res = await fetch(`/api/templates/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            backgroundImage: currentBgImage,
            width: 990,
            height: 698,
            elements: currentElements,
          }),
        });

        const data = await res.json();
        if (data.success) {
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
          if (!isAutoSave) setError(data.error || 'บันทึกไม่สำเร็จ');
        }
      } catch (err: any) {
        if (!isAutoSave) setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกแม่แบบ');
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  const handleSaveImmediately = useCallback(
    (newElements: CanvasElement[]) => {
      setElements(newElements);
      saveTemplate(newElements, bgImage, false);
    },
    [bgImage, saveTemplate]
  );

  // Auto-save effect: automatically saves changes 700ms after editing
  useEffect(() => {
    if (isInitialLoad.current) {
      if (!loading && elements.length > 0) {
        isInitialLoad.current = false;
      }
      return;
    }

    setIsDirty(true);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveTemplate(elements, bgImage, true);
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [elements, bgImage, loading, saveTemplate]);

  // Keyboard shortcut: Ctrl+S or Cmd+S to save immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveTemplate(elements, bgImage, false);
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

        const projData = await projRes.json();
        const recipData = await recipRes.json();

        if (projData.success && projData.project) {
          const p = projData.project;
          setProject({
            ...p,
            recipients: recipData.recipients || [],
          });

          if (p.template) {
            setBgImage(p.template.backgroundImage || '/uploads/NSDV01.jpg');
            if (p.template.elements && p.template.elements.length > 0) {
              setElements(
                p.template.elements.map((el: any) => ({
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
                }))
              );
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
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setBgImage(data.url);
        // Automatically save new background image immediately
        saveTemplate(elements, data.url, false);
      } else {
        alert(data.error || 'อัปโหลดไม่สำเร็จ');
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปพื้นหลัง');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    saveTemplate(elements, bgImage, false);
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
    certNumber: `${project.code || 'CMTC'}-ศขม.0001`,
    fullName: 'นายสมชาย ยิ่งยง',
    organization: project.location || 'วิทยาลัยเทคนิคเชียงใหม่',
  };

  return (
    <div className="min-h-screen py-4 px-3 sm:px-6 w-full space-y-3">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cmtc-800 font-semibold mb-1">
            <button
              type="button"
              onClick={async () => {
                if (isDirty) {
                  await saveTemplate(elements, bgImage, false);
                }
                router.push('/admin');
              }}
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
          {lastSavedTime && (
            <span className="text-[11px] text-emerald-700 font-mono hidden sm:flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>บันทึกอัตโนมัติแล้ว ({lastSavedTime} น.)</span>
            </span>
          )}

          <button
            type="button"
            onClick={async () => {
              if (isDirty) {
                await saveTemplate(elements, bgImage, false);
              }
              router.push(`/admin/project/${project.id}/recipients`);
            }}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            ไปจัดการรายชื่อ Excel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all ${
              savedSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-cmtc-800 hover:bg-cmtc-900 text-white shadow-red-900/15 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title="บันทึกการจัดวาง (Ctrl+S)"
          >
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

      {/* Background Template Bar */}
      <div className="glass-panel px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">ภาพพื้นหลังปัจจุบัน:</span>
          <span className="font-mono text-cmtc-800 bg-red-50 px-2 py-1 rounded border border-red-200/60 truncate max-w-xs font-medium">
            {bgImage}
          </span>
        </div>

        <label className="px-3.5 py-1.5 rounded-lg bg-white text-cmtc-800 border border-red-200 font-semibold hover:bg-red-50 cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
          <Upload className="w-3.5 h-3.5 text-cmtc-800" />
          {uploading ? 'กำลังเปลี่ยนรูป...' : 'เปลี่ยนรูปพื้นหลัง (JPG/PNG)'}
          <input
            type="file"
            accept="image/jpeg,image/png"
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
          onElementsChange={setElements}
          onSaveImmediately={handleSaveImmediately}
          width={990}
          height={698}
          sampleData={{
            certNumber: sampleRecipient.certNumber,
            fullName: sampleRecipient.fullName,
            organization: sampleRecipient.organization || 'วิทยาลัยเทคนิคตาก',
            eventDate: project.eventDate || '12-14 พฤษภาคม 2569',
            location: project.location || 'วิทยาลัยเทคนิคตาก',
          }}
        />
      </div>
    </div>
  );
}
