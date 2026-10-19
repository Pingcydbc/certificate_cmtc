'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderPlus, ArrowLeft, Upload, Sparkles, Check, AlertCircle } from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('วิทยาลัยเทคนิคเชียงใหม่');
  const [bgImage, setBgImage] = useState('/uploads/NSDV01.jpg');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setBgImage(data.url);
      } else {
        setError(data.error || 'อัปโหลดรูปไม่สำเร็จ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      setError('กรุณากรอกรหัสโครงการและชื่อโครงการ');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          title: title.trim(),
          description: description.trim() || null,
          eventDate: eventDate.trim() || null,
          location: location.trim() || null,
          backgroundImage: bgImage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Redirect to visual editor for this project
        router.push(`/admin/project/${data.project.id}/editor`);
      } else {
        setError(data.error || 'สร้างโครงการไม่สำเร็จ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-cmtc-800 font-semibold">
        <Link href="/admin" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับไปแดชบอร์ดโครงการ
        </Link>
        <span>/</span>
        <span className="text-slate-400">สร้างโครงการใหม่</span>
      </div>

      <div className="glass-panel p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-cmtc-800">
            <FolderPlus className="w-6 h-6 text-cmtc-800" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">สร้างโครงการเกียรติบัตรใหม่</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              สร้างโฟลเดอร์โครงการใหม่เพื่อจัดการแม่แบบเกียรติบัตรและรายชื่อผู้ได้รับเกียรติบัตร
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                รหัสโครงการอ้างอิง <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น NSDV-2569"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 font-mono text-sm border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none transition-all"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">ใช้สำหรับสร้าง prefix เลขทะเบียน</span>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                ชื่อโครงการ / หลักสูตร <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น โครงการนิเทศปฏิบัติการการพัฒนาครูอาชีวศึกษาในการประยุกต์ใช้ AI"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-sm border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              รายละเอียดโครงการ / คำอธิบายเพิ่มเติม
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น เพื่อยกระดับการจัดการเรียนรู้จัดทำแผนจัดการเรียนรู้รายวิชาตามหลักสูตรอาชีวศึกษา พุทธศักราช 2567"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-sm border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                วันที่จัดงาน (แสดงบนเกียรติบัตร)
              </label>
              <input
                type="text"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                placeholder="เช่น 12-14 พฤษภาคม 2569"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-sm border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                สถานที่จัดงาน
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น วิทยาลัยเทคนิคเชียงใหม่"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-sm border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Background Template upload */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">รูปภาพพื้นหลังเกียรติบัตร (Background)</h3>
                <p className="text-[11px] text-slate-500">สัดส่วนมาตรฐาน A4 แนวนอน (990 x 698 px แนะนำ)</p>
              </div>
              <label className="px-3.5 py-1.5 rounded-lg bg-white text-cmtc-800 border border-red-200 text-xs font-semibold hover:bg-red-50 cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                <Upload className="w-3.5 h-3.5 text-cmtc-800" />
                {uploading ? 'กำลังอัปโหลด...' : 'เลือกรูปภาพใหม่'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-36 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bgImage}
                  alt="Template Background Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-mono text-slate-700 truncate max-w-xs">{bgImage}</p>
                <p className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  พร้อมใช้งานใน Visual Editor ทันที
                </p>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Link
              href="/admin"
              className="px-5 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-red-900/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-white" />
              {submitting ? 'กำลังบันทึก...' : 'สร้างและไปหน้า Visual Editor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
