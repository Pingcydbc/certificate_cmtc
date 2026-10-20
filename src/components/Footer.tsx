import { Award } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-4 sm:py-5 text-slate-600 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center sm:justify-start gap-3 text-center sm:text-left">
          {/* Logo & Org Info */}
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-red-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">
              ระบบจัดการและตรวจสอบเกียรติบัตรออนไลน์ (CMTC e-Cert)
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              งานศูนย์ดิจิทัลและสื่อสารองค์กร วิทยาลัยเทคนิคเชียงใหม่
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
