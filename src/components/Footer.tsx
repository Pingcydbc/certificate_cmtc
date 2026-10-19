import { Award, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-4 sm:py-5 text-slate-600 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          {/* Logo & Org Info */}
          <div className="flex items-center gap-3">
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

          {/* Verification Badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>ตรวจสอบความถูกต้องด้วย QR Code ออนไลน์ 24 ชม.</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
