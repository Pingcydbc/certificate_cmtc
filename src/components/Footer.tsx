import { Award, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10 text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <Award className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                ระบบจัดการและตรวจสอบเกียรติบัตรออนไลน์ (CMTC e-Cert System)
              </p>
              <p className="text-slate-500 mt-0.5">
                วิทยาลัยเทคนิคเชียงใหม่ สถาบันการอาชีวศึกษาภาคเหนือ 1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-slate-500">
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ระบบรหัสอ้างอิงและลายมือชื่อตรวจสอบได้จริง
            </span>
            <span>•</span>
            <span className="font-medium text-slate-500">CMTC Next.js System</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} Chiang Mai Technical College (CMTC). All rights reserved.</p>
          <p className="flex items-center gap-1 font-medium">
            มาตรฐานการให้บริการงานทะเบียนและกิจกรรม วิทยาลัยเทคนิคเชียงใหม่
          </p>
        </div>
      </div>
    </footer>
  );
}
