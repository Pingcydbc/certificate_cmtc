'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  KeyRound,
  AlertCircle,
  Home
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = redirectUrl;
      } else {
        setError(data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername('admin');
    setPassword('admin1234');
    setError(null);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-red-50 border border-red-200 shadow-md shadow-red-700/10">
          <div className="p-2.5 rounded-xl bg-red-700 text-white">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            เข้าสู่ระบบผู้ดูแล
            <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              Admin
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            ระบบจัดการและออกเกียรติบัตรออนไลน์ วิทยาลัยเทคนิคเชียงใหม่ (CMTC)
          </p>
        </div>
      </div>

      {/* Card Box */}
      <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-100 rounded-xl text-sm text-slate-900 placeholder-slate-400 transition-all outline-none"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-red-600 focus:ring-2 focus:ring-red-100 rounded-xl text-sm text-slate-900 placeholder-slate-400 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white shadow-md shadow-red-700/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังตรวจสอบ...</span>
              </>
            ) : (
              <>
                <span>เข้าสู่ระบบจัดการ</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Credential Helper Pill */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <KeyRound className="w-3.5 h-3.5 text-red-700" />
            <span>บัญชีเริ่มต้น: <strong>admin</strong> / <strong>admin1234</strong></span>
          </div>
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="text-red-700 hover:text-red-800 hover:underline font-bold text-[11px] flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            คลิกเพื่อกรอกข้อมูลเริ่มต้นอัตโนมัติ
          </button>
        </div>
      </div>

      {/* Back to Home Link */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-700 font-medium transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          กลับสู่หน้าหลักสำหรับบุคคลทั่วไป
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-slate-50">
      <Suspense fallback={<div className="text-slate-500 text-xs">กำลังโหลดหน้าเข้าสู่ระบบ...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
