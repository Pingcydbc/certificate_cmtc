'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  Search,
  FolderKanban,
  ShieldCheck,
  Menu,
  X,
  PlusCircle,
  LogOut,
  UserCheck
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<{ username: string; name?: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Check auth status
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setAdminUser(data.user);
        } else {
          setAdminUser(null);
        }
      } catch (e) {
        setAdminUser(null);
      }
    }
    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    if (!confirm('ยืนยันการออกจากระบบผู้ดูแล?')) return;
    try {
      setLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      setAdminUser(null);
      router.push('/admin/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoggingOut(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'โครงการทั้งหมด', icon: FolderKanban },
    { href: '/search', label: 'ค้นหาเกียรติบัตร', icon: Search },
    { href: '/admin', label: 'จัดการระบบ (Admin)', icon: ShieldCheck },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
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
                  CMTC e-Cert
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500 -mt-0.5 hidden sm:block">
                ระบบจัดการและตรวจสอบเกียรติบัตร วิทยาลัยเทคนิคเชียงใหม่
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1.5">
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

            {/* Admin Action & Status - Only visible when logged in */}
            {adminUser && (
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
                  <span className="text-xs text-slate-600 hidden lg:inline flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <strong className="text-slate-800">{adminUser.username}</strong>
                  </span>
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
          {adminUser && (
            <div className="flex items-center justify-between p-2.5 mb-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                เข้าสู่ระบบโดย: <strong className="text-slate-900">{adminUser.username}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="text-red-700 font-bold hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                ออกจากระบบ
              </button>
            </div>
          )}

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

          {/* Mobile Admin Controls - Only visible when logged in */}
          {adminUser && (
            <div className="pt-2 space-y-2 border-t border-slate-200/80 mt-1">
              <div className="flex items-center justify-between px-1 text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  เข้าสู่ระบบโดย: <strong className="text-slate-900">{adminUser.username}</strong>
                </span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-red-700 hover:underline font-semibold flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออกจากระบบ
                </button>
              </div>
              <Link
                href="/admin/project/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                สร้างโครงการใหม่
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
