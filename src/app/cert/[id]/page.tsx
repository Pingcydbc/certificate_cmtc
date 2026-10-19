'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Award,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Calendar,
  FileText,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';

interface RecipientDetail {
  id: string;
  certNumber: string;
  fullName: string;
  organization: string | null;
  note: string | null;
  issuedDate: string;
  project: {
    id: string;
    code: string;
    title: string;
    eventDate: string | null;
    location: string | null;
  };
}

export default function CertificateDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [recipient, setRecipient] = useState<RecipientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadRecipient() {
      try {
        setLoading(true);
        const res = await fetch(`/api/recipients/${id}`);
        const data = await res.json();
        if (data.success) {
          setRecipient(data.recipient);
        } else {
          setError(data.error || 'ไม่พบเกียรติบัตร');
        }
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadRecipient();
    }
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl text-center space-y-4 max-w-sm bg-white border border-slate-200 shadow-sm">
          <div className="w-12 h-12 border-4 border-red-100 border-t-cmtc-800 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-900">กำลังจัดเตรียมเกียรติบัตร...</p>
          <p className="text-xs text-slate-500">ระบบกำลังประมวลผลฟอนต์และเรนเดอร์ภาพความละเอียดสูง</p>
        </div>
      </div>
    );
  }

  if (error || !recipient) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl text-center max-w-md space-y-4 bg-white border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">ไม่พบข้อมูลเกียรติบัตร</h2>
          <p className="text-xs text-slate-500">{error || 'รหัสอ้างอิงไม่ถูกต้องหรือข้อมูลถูกลบแล้ว'}</p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cmtc-800 text-white font-bold text-xs hover:bg-cmtc-900 shadow-md shadow-red-900/15"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้าค้นหา
          </Link>
        </div>
      </div>
    );
  }

  const renderTimestamp = recipient?.issuedDate ? new Date(recipient.issuedDate).getTime() : Date.now();
  const certImageUrl = `/api/certificates/render?recipientId=${recipient.id}&format=png&v=${renderTimestamp}`;
  const pdfDownloadUrl = `/api/certificates/render?recipientId=${recipient.id}&format=pdf&download=true&v=${renderTimestamp}`;
  const pngDownloadUrl = `/api/certificates/render?recipientId=${recipient.id}&format=png&download=true&v=${renderTimestamp}`;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Top breadcrumb & back */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href={`/search?projectId=${recipient.project.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-cmtc-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายชื่อเกียรติบัตร
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            {copied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์ตรวจสอบ'}
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors shadow-xs hidden sm:flex"
          >
            <Printer className="w-3.5 h-3.5 text-cmtc-800" />
            พิมพ์
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Certificate Preview (Large Left Area) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="relative overflow-hidden rounded-xl cert-shadow bg-slate-100 flex items-center justify-center border border-slate-200/80 min-h-[360px] sm:min-h-[460px]">
              {/* Certificate Image generated dynamically by napi-rs/canvas */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={certImageUrl}
                alt={`เกียรติบัตร ${recipient.fullName}`}
                className="w-full h-auto object-contain block select-none"
                loading="eager"
              />
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-6 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-red-900/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-5 h-5 text-white" />
              <span>ดาวน์โหลด PDF (สำหรับพิมพ์งาน)</span>
            </a>

            <a
              href={pngDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-6 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center justify-center gap-2.5 border border-slate-200 hover:border-slate-300 transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-5 h-5 text-cmtc-800" />
              <span>ดาวน์โหลดไฟล์รูปภาพ PNG</span>
            </a>
          </div>
        </div>

        {/* Certificate Details & Verification (Right Card) */}
        <div className="space-y-6">
          {/* Verification Badge Box */}
          <div className="glass-panel p-6 rounded-2xl space-y-4 bg-white border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  ระบบตรวจสอบความถูกต้อง
                </span>
                <h3 className="text-base font-bold text-slate-900">เกียรติบัตรแท้ ตรวจสอบได้</h3>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <p className="text-slate-400 mb-0.5">ชื่อ-นามสกุล ผู้ได้รับเกียรติบัตร</p>
                <p className="text-base font-bold text-slate-900">{recipient.fullName}</p>
              </div>

              <div>
                <p className="text-slate-400 mb-0.5">เลขทะเบียนคุมเกียรติบัตร</p>
                <p className="font-mono text-sm font-bold text-cmtc-800 bg-red-50 px-2 py-0.5 rounded border border-red-200/60 inline-block">{recipient.certNumber}</p>
              </div>

              {recipient.organization && (
                <div>
                  <p className="text-slate-400 mb-0.5">สถานศึกษา / หน่วยงาน</p>
                  <p className="text-slate-800 font-medium">{recipient.organization}</p>
                </div>
              )}

              {recipient.note && (
                <div>
                  <p className="text-slate-400 mb-0.5">หมายเหตุ</p>
                  <p className="text-slate-700">{recipient.note}</p>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-100">
                <p className="text-slate-400 mb-0.5">โครงการ</p>
                <p className="text-slate-900 font-semibold">{recipient.project.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">รหัส: {recipient.project.code}</p>
              </div>

              {recipient.project.eventDate && (
                <div>
                  <p className="text-slate-400 mb-0.5">วันที่จัดกิจกรรม</p>
                  <p className="text-slate-700">{recipient.project.eventDate}</p>
                </div>
              )}

              {recipient.project.location && (
                <div>
                  <p className="text-slate-400 mb-0.5">สถานที่</p>
                  <p className="text-slate-700">{recipient.project.location}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>วันที่ออกเอกสาร</span>
              <span className="font-medium text-slate-600">{new Date(recipient.issuedDate).toLocaleDateString('th-TH')}</span>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="glass-card p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">คำแนะนำในการพิมพ์เกียรติบัตร:</p>
            <p>• เลือกดาวน์โหลดแบบ PDF สำหรับส่งพิมพ์ที่ร้านหรือพิมพ์ด้วยกระดาษการ์ดขาว A4 แนวนอน</p>
            <p>• ปรับการตั้งค่าเครื่องพิมพ์เป็น &quot;Actual size (ขนาดจริง 100%)&quot; เพื่อความคมชัดสูงสุด</p>
          </div>
        </div>
      </div>
    </div>
  );
}
