'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  Home,
  FolderKanban,
  ShieldCheck,
  Menu,
  X,
  PlusCircle,
  LogOut,
  UserCheck,
  Users,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchAuthMe, clearAuthMeCache, ClientAuthUser } from '@/lib/clientAuth';

type AuthUser = ClientAuthUser;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Change own password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrPw, setShowCurrPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const openChangePasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPwError(null);
    setPwSuccess(null);
    setShowPasswordModal(true);
    setMobileMenuOpen(false);
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword.trim() || !newPassword.trim()) {
      setPwError('กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่');
      return;
    }
    if (newPassword.trim().length < 4) {
      setPwError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setPwError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setPwSaving(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPwSuccess(data.message || 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPwSuccess(null);
        }, 1200);
      } else {
        setPwError(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    } catch (err: any) {
      setPwError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setPwSaving(false);
    }
  };

  // Check auth status on initial load or admin route transitions
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      const data = await fetchAuthMe();
      if (isMounted) {
        if (data.authenticated && data.user) {
          setAdminUser(data.user);
        } else {
          setAdminUser(null);
        }
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [pathname === '/admin/login' || pathname === '/admin']);

  const handleLogout = async () => {
    if (!confirm('ยืนยันการออกจากระบบ?')) return;
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      clearAuthMeCache();
      setAdminUser(null);
      router.push('/admin/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingOut(false);
    }
  };

  // Nav links based on auth state
  const navLinks = adminUser
    ? [
        { href: '/', label: 'หน้าแรก', icon: Home },
        { href: '/admin', label: 'จัดการระบบ', icon: FolderKanban },
        ...(adminUser.role === 'admin'
          ? [{ href: '/admin/users', label: 'จัดการผู้ใช้งาน', icon: Users }]
          : []),
      ]
    : [
        { href: '/', label: 'หน้าแรก', icon: Home },
      ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/admin') {
      return (
        pathname === '/admin' ||
        (pathname.startsWith('/admin/') &&
          !pathname.startsWith('/admin/users') &&
          !pathname.startsWith('/admin/login'))
      );
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-800 to-red-600 p-0.5 shadow-md shadow-red-700/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-red-700 rounded-[10px] flex items-center justify-center">
                <Award className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 group-hover:text-red-700 transition-colors">
                  ระบบเกียรติบัตรออนไลน์
                </span>
              </div>
              <p className="text-xs text-slate-500 -mt-0.5 hidden sm:block">
                ระบบจัดการและตรวจสอบเกียรติบัตร
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    active
                      ? 'bg-red-700 text-white shadow-sm shadow-red-700/20'
                      : 'text-slate-600 hover:text-red-700 hover:bg-red-50/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}

            {/* If Authenticated: Show Create Project and User Actions */}
            {adminUser ? (
              <>
                <div className="h-6 w-px bg-slate-200 mx-1.5" />

                <Link
                  href="/admin/project/new"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white shadow-sm shadow-red-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-white" />
                  สร้างโครงการใหม่
                </Link>

                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                  <span className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <strong className="text-slate-800">{adminUser.username}</strong>
                    {adminUser.role === 'admin' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700 border border-red-200">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        เจ้าหน้าที่
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={openChangePasswordModal}
                    title="เปลี่ยนรหัสผ่านของฉัน"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-cmtc-800 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">เปลี่ยนรหัสผ่าน</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    title="ออกจากระบบ"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">ออกระบบ</span>
                  </button>
                </div>
              </>
            ) : (
              /* If Guest: Login link */
              <Link
                href="/admin/login"
                className="flex items-center gap-1.5 ml-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                title="เข้าสู่ระบบ"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {adminUser ? (
            <>
              <div className="flex items-center justify-between p-2.5 mb-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>{adminUser.username}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-700">
                    {adminUser.role === 'admin' ? 'Admin' : 'เจ้าหน้าที่'}
                  </span>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-red-700 font-bold hover:underline flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออกจากระบบ
                </button>
              </div>

              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                      active
                        ? 'bg-red-700 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                    {link.label}
                  </Link>
                );
              })}

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={openChangePasswordModal}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  <KeyRound className="w-4 h-4" />
                  เปลี่ยนรหัสผ่านของฉัน
                </button>
                <Link
                  href="/admin/project/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  สร้างโครงการใหม่
                </Link>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
                  pathname === '/' ? 'bg-red-700 text-white' : 'text-slate-700 hover:bg-red-50'
                }`}
              >
                <Home className="w-5 h-5" />
                หน้าแรก
              </Link>
              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700"
              >
                <Lock className="w-5 h-5 text-slate-400" />
                เข้าสู่ระบบ
              </Link>
            </>
          )}
        </div>
      )}
      {/* Change Own Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-50 text-red-700 border border-red-100">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    เปลี่ยนรหัสผ่าน ({adminUser?.username})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ตั้งรหัสผ่านใหม่สำหรับเข้าสู่ระบบบัญชีของคุณ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeOwnPassword} className="p-5 space-y-4">
              {pwError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}
              {pwSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pwSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่านเดิม <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrPw ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านปัจจุบัน"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrPw(!showCurrPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่านใหม่ <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 4 ตัวอักษร"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 bg-slate-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่ <span className="text-red-600">*</span>
                </label>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-800 text-white shadow-xs disabled:opacity-50"
                >
                  {pwSaving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
