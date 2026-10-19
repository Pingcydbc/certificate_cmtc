'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldCheck,
  User,
  Key,
  Trash2,
  Edit2,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  FolderKanban,
  Calendar,
  Sparkles
} from 'lucide-react';

interface ManagedUser {
  id: string;
  username: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    projects: number;
  };
}

export default function UserManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Form states for creating
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'user' | 'admin'>('user');
  const [submitting, setSubmitting] = useState(false);

  // Form states for editing / password reset
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editPassword, setEditPassword] = useState('');

  // 1. Fetch current user and all users
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verify current user role
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated || meData.user?.role !== 'admin') {
        router.push('/admin');
        return;
      }
      setCurrentUser(meData.user);

      // Fetch users list
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // 2. Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formPassword.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formUsername.trim(),
          password: formPassword.trim(),
          name: formName.trim() || undefined,
          role: formRole,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'สร้างผู้ใช้งานสำเร็จ');
        setShowCreateModal(false);
        setFormUsername('');
        setFormPassword('');
        setFormName('');
        setFormRole('user');
        loadData();
      } else {
        setError(data.error || 'สร้างผู้ใช้ไม่สำเร็จ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Edit User / Reset Password
  const openEditModal = (user: ManagedUser) => {
    setSelectedUser(user);
    setEditName(user.name || '');
    setEditRole(user.role as 'user' | 'admin');
    setEditPassword('');
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() || undefined,
          role: editRole,
          password: editPassword.trim() ? editPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'อัปเดตข้อมูลผู้ใช้สำเร็จ');
        setShowEditModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        setError(data.error || 'อัปเดตข้อมูลไม่สำเร็จ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดต');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Delete User
  const handleDeleteUser = async (user: ManagedUser) => {
    if (user.id === currentUser?.id) {
      alert('คุณไม่สามารถลบบัญชีของตนเองที่กำลังล็อกอินอยู่ได้');
      return;
    }

    const confirmMsg = `ยืนยันการลบบัญชีผู้ใช้ "${user.username}" (${user.name || 'ไม่มีชื่อ'}) หรือไม่?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'ลบผู้ใช้สำเร็จ');
        loadData();
      } else {
        alert(data.error || 'ลบผู้ใช้ไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q))
    );
  });

  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalOfficers = users.filter((u) => u.role === 'user').length;

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Top Header */}
      <section className="bg-white border-b border-slate-200/80 pt-8 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb / Back button */}
          <div className="mb-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-red-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับสู่แดชบอร์ดโครงการ
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-bold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                สิทธิ์ผู้ดูแลระบบสูงสุด (Super Admin Only)
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Users className="w-8 h-8 text-red-700" />
                จัดการบัญชีผู้ใช้งานระบบ (User Management)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                สร้างและกำหนดสิทธิ์ผู้ใช้งาน เจ้าหน้าที่สามารถสร้างโครงการของตนเองได้ ส่วน Admin มีสิทธิ์ดูแลทั้งระบบ
              </p>
            </div>

            <button
              onClick={() => {
                setError(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มผู้ใช้ใหม่</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold">ผู้ใช้งานทั้งหมด</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{users.length} บัญชี</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 font-semibold">ผู้ดูแลระบบ (Admin)</p>
                <p className="text-2xl font-black text-red-800 mt-0.5">{totalAdmins} คน</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white border border-red-200 flex items-center justify-center text-red-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold">เจ้าหน้าที่ (User)</p>
                <p className="text-2xl font-black text-slate-800 mt-0.5">{totalOfficers} คน</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                <User className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-4">
        {/* Toast alerts */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้ หรือชื่อ-สกุล..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all"
            />
          </div>

          <span className="text-xs text-slate-500 font-medium">
            แสดง <strong className="text-slate-800">{filteredUsers.length}</strong> จาก {users.length} รายการ
          </span>
        </div>

        {/* Table of users */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-red-100 border-t-red-700 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">กำลังโหลดรายชื่อผู้ใช้งาน...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">ไม่พบข้อมูลผู้ใช้งาน</p>
              <p className="text-xs text-slate-400">ลองค้นหาด้วยคำอื่น หรือคลิกปุ่ม &quot;เพิ่มผู้ใช้ใหม่&quot;</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">ชื่อผู้ใช้ (Username)</th>
                    <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-4">บทบาท (Role)</th>
                    <th className="py-3 px-4 text-center">โครงการที่สร้าง</th>
                    <th className="py-3 px-4">วันที่สร้าง</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isAdmin = user.role === 'admin';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isAdmin ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{user.username}</span>
                              {isSelf && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  คุณ
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal">ID: {user.id.slice(0, 8)}...</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {user.name || <span className="text-slate-400 italic">ไม่ได้ระบุ</span>}
                        </td>

                        <td className="py-3.5 px-4">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold text-[11px]">
                              <ShieldCheck className="w-3 h-3 text-red-600" />
                              Admin (ผู้ดูแลระบบ)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px]">
                              <User className="w-3 h-3 text-slate-500" />
                              User (เจ้าหน้าที่)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">
                            <FolderKanban className="w-3 h-3 text-slate-500" />
                            {user._count?.projects || 0}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(user.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditModal(user)}
                              title="แก้ไขหรือเปลี่ยนรหัสผ่าน"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={isSelf}
                              title={isSelf ? 'ไม่สามารถลบบัญชีตนเองได้' : 'ลบผู้ใช้นี้'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isSelf
                                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                  : 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal 1: Create New User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-50 text-red-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">เพิ่มผู้ใช้งานใหม่</h3>
                  <p className="text-xs text-slate-500">สร้างบัญชีสำหรับเจ้าหน้าที่หรือผู้ดูแลระบบ</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน (Username) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="เช่น somchai หรือ officer1"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่าน (Password) <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="อย่างน้อย 4 ตัวอักษร"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุลจริง (Optional)
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  บทบาทและสิทธิ์ (Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormRole('user')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formRole === 'user'
                        ? 'border-red-600 bg-red-50/50 text-red-900 ring-1 ring-red-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <User className="w-3.5 h-3.5 text-slate-600" />
                      <span>User (เจ้าหน้าที่)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      สร้างโครงการได้ ลบได้เฉพาะโครงการตนเอง
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole('admin')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formRole === 'admin'
                        ? 'border-red-600 bg-red-50/50 text-red-900 ring-1 ring-red-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-red-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-red-700" />
                      <span>Admin (ผู้ดูแล)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      จัดการได้ทุกโครงการ และจัดการ User ได้
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-800 text-white shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit User & Change Password */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    แก้ไขผู้ใช้: {selectedUser.username}
                  </h3>
                  <p className="text-xs text-slate-500">ปรับเปลี่ยนข้อมูลส่วนตัว สิทธิ์ หรือเปลี่ยนรหัสผ่าน</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="ชื่อ-นามสกุลจริง"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  บทบาท (Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('user')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      editRole === 'user'
                        ? 'border-red-600 bg-red-50/50 text-red-900 ring-1 ring-red-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <User className="w-3.5 h-3.5" />
                      <span>User (เจ้าหน้าที่)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      editRole === 'admin'
                        ? 'border-red-600 bg-red-50/50 text-red-900 ring-1 ring-red-600'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-red-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-red-700" />
                      <span>Admin (ผู้ดูแล)</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-red-700" />
                    รีเซ็ตรหัสผ่านใหม่ (Reset Password)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">เว้นว่างไว้หากไม่ต้องการเปลี่ยน</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-600 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-800 text-white shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
