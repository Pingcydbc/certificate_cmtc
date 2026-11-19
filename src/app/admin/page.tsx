'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  PlusCircle,
  FileSpreadsheet,
  Palette,
  Users,
  Calendar,
  MapPin,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  LogOut,
  User,
  Edit3,
  FileDown,
  X,
  Save,
  Loader2
} from 'lucide-react';
import Pagination from '@/components/Pagination';
import BatchPdfModal from '@/components/BatchPdfModal';
import { fetchAuthMe, clearAuthMeCache } from '@/lib/clientAuth';

interface AdminProject {
  id: string;
  code: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  createdById?: string | null;
  createdBy?: {
    id: string;
    username: string;
    name?: string | null;
    role: string;
  } | null;
  _count: {
    recipients: number;
  };
  template?: {
    id: string;
    width: number;
    height: number;
  } | null;
  recipients?: Array<{
    id: string;
    certNumber: string;
    fullName: string;
    organization: string | null;
  }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(null);

  // Edit project modal state
  const [editingProject, setEditingProject] = useState<AdminProject | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Batch PDF modal state
  const [batchPdfProject, setBatchPdfProject] = useState<AdminProject | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchAuthMe()
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    if (!confirm('ยืนยันการออกจากระบบผู้ดูแล?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      clearAuthMeCache();
      router.push('/admin/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: debouncedSearch.trim(),
        scope: 'manage',
      });
      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDeleteProject = async (id: string, title: string) => {
    if (!confirm(`ยืนยันการลบโครงการ "${title}" หรือไม่?\n(ข้อมูลแม่แบบและรายชื่อผู้รับทั้งหมดในโครงการนี้จะถูกลบถาวร)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
      } else {
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการลบโครงการ');
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      const data = await res.json();
      if (data.success) {
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: !current } : p))
        );
      } else {
        alert(data.error || 'อัปเดตสถานะไม่สำเร็จ');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditModal = (project: AdminProject) => {
    setEditingProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description || '');
    setEditEventDate(project.eventDate || '');
    setEditLocation(project.location || '');
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editTitle.trim()) return;

    try {
      setSavingEdit(true);
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          eventDate: editEventDate.trim() || null,
          location: editLocation.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === editingProject.id
              ? {
                  ...p,
                  title: data.project.title,
                  description: data.project.description,
                  eventDate: data.project.eventDate,
                  location: data.project.location,
                }
              : p
          )
        );
        setEditingProject(null);
      } else {
        alert(data.error || 'บันทึกข้อมูลโครงการไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลโครงการ');
    } finally {
      setSavingEdit(false);
    }
  };

  const totalRecipients = projects.reduce((acc, p) => acc + (p._count?.recipients || 0), 0);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cmtc-800 font-semibold mb-1">
            <span>ผู้ดูแลระบบ</span>
            <span>/</span>
            <span>จัดการโครงการ (Projects)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 border border-red-100 text-cmtc-800">
              <FolderKanban className="w-7 h-7 text-cmtc-800" />
            </div>
            แดชบอร์ดจัดการโครงการเกียรติบัตร
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            โครงสร้างแบบ Folder แยกตามโครงการ • ตกแต่งแม่แบบด้วย Visual Editor • นำเข้า Excel รายชื่อ
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentUser?.role === 'admin' && (
            <Link
              href="/admin/users"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Users className="w-4 h-4 text-red-700" />
              <span>จัดการผู้ใช้งาน</span>
            </Link>
          )}
          <Link
            href="/admin/project/new"
            className="px-5 py-2.5 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-red-900/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            สร้างโครงการใหม่
          </Link>
          <button
            onClick={handleLogout}
            title="ออกจากระบบ"
            className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <FolderKanban className="w-6 h-6 text-cmtc-800" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{totalCount}</p>
            <p className="text-xs text-slate-500">
              {currentUser?.role === 'admin' ? 'โครงการทั้งหมดในระบบ' : 'โครงการของคุณ'}
            </p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{totalRecipients}</p>
            <p className="text-xs text-slate-500">รายชื่อผู้ได้รับเกียรติบัตร</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 bg-white border border-slate-200/80 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Award className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">พร้อมใช้งาน</p>
            <p className="text-xs text-slate-500">สถานะระบบ Rendering ปกติ</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel p-4 rounded-xl flex items-center justify-between gap-4 bg-white border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาชื่อโครงการ, รหัส, หรือชื่อ-นามสกุลผู้รับเกียรติบัตร..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cmtc-700 focus:border-cmtc-700 focus:bg-white transition-all"
          />
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline font-medium">
          แสดงหน้าละ 10 โครงการ
        </span>
      </div>

      {/* Projects Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card p-6 rounded-2xl animate-pulse space-y-4 bg-white border border-slate-200">
              <div className="h-6 bg-slate-100 rounded w-1/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl p-8 bg-white border border-slate-200">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">ยังไม่มีโครงการในระบบ</h3>
          <p className="text-xs text-slate-500 mt-1">
            เริ่มต้นด้วยการกดปุ่ม &quot;สร้างโครงการใหม่&quot; เพื่อเพิ่มโครงการแรกของคุณ
          </p>
          <Link
            href="/admin/project/new"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white font-bold text-xs shadow-md shadow-red-900/15"
          >
            <PlusCircle className="w-4 h-4" />
            สร้างโครงการใหม่
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass-card rounded-2xl p-6 bg-white border border-slate-200 hover:border-red-300 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                {/* Project Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-red-50 text-cmtc-800 border border-red-200/60">
                      {project.code}
                    </span>
                    <button
                      onClick={() => handleToggleActive(project.id, project.isActive)}
                      className={`text-xs px-2.5 py-0.5 rounded-md flex items-center gap-1 font-semibold transition-colors ${
                        project.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                      title="คลิกเพื่อเปิด/ปิดสถานะให้ผู้ใช้ค้นหา"
                    >
                      {project.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          เปิดค้นหาออนไลน์
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-400" />
                          ปิดการค้นหา
                        </>
                      )}
                    </button>
                    <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-cmtc-800" />
                      {project._count.recipients} รายชื่อ
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-cmtc-800 transition-colors">
                    {project.title}
                  </h3>

                  {project.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    {project.eventDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cmtc-800" />
                        {project.eventDate}
                      </span>
                    )}
                    {project.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-cmtc-800" />
                        {project.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>สร้างโดย: <strong className="text-slate-700">{project.createdBy?.name || project.createdBy?.username || 'ผู้ดูแลระบบ'}</strong></span>
                    </span>
                  </div>

                  {/* Matched Recipients (when searching by person's name) */}
                  {project.recipients && project.recipients.length > 0 && (
                    <div className="mt-3 p-3.5 rounded-xl bg-red-50/70 border border-red-200/70 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-cmtc-900">
                        <span className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-cmtc-800" />
                          พบผู้ได้รับเกียรติบัตรตรงกับคำค้นหา:
                        </span>
                        <span className="text-[11px] text-cmtc-800 font-semibold">
                          {project.recipients.length} คน
                        </span>
                      </div>
                      <div className="divide-y divide-red-200/50">
                        {project.recipients.map((recip) => (
                          <div key={recip.id} className="py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{recip.fullName}</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                {recip.certNumber} {recip.organization ? `• ${recip.organization}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/cert/${recip.id}`}
                                target="_blank"
                                className="px-2.5 py-1 rounded-md bg-white hover:bg-red-50 text-cmtc-800 border border-red-200 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors shadow-xs"
                              >
                                <span>ดูใบประกาศ</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Management Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {(() => {
                    const canManage =
                      currentUser?.role === 'admin' ||
                      (Boolean(currentUser?.id) && project.createdById === currentUser?.id);

                    return (
                      <>
                        {/* Visual Editor Button */}
                        <Link
                          href={`/admin/project/${project.id}/editor`}
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-cmtc-800 border border-red-200 hover:border-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          <Palette className="w-4 h-4 text-cmtc-800" />
                          <span>Visual Editor</span>
                        </Link>

                        {/* Excel Recipients Button */}
                        <Link
                          href={`/admin/project/${project.id}/recipients`}
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>จัดการ Excel ({project._count.recipients})</span>
                        </Link>

                        {/* Batch PDF by Sheet/Org Button */}
                        {canManage && project._count.recipients > 0 && (
                          <button
                            type="button"
                            onClick={() => setBatchPdfProject(project)}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                            title="ดาวน์โหลด PDF แยกตามชีต / สถานศึกษา"
                          >
                            <FileDown className="w-4 h-4 text-rose-600" />
                            <span>PDF แยกชีต</span>
                          </button>
                        )}

                        {/* Edit Project Details (Date, Location, Title, Description) */}
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openEditModal(project)}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 hover:border-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                            title="แก้ไขวันที่จัดงาน สถานที่ และรายละเอียดโครงการ"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                            <span>แก้ไขข้อมูล</span>
                          </button>
                        )}

                        {/* Delete Button */}
                        {canManage ? (
                          <button
                            onClick={() => handleDeleteProject(project.id, project.title)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                            title="ลบโครงการ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-2 rounded-xl text-slate-200 cursor-not-allowed opacity-50"
                            title="คุณไม่มีสิทธิ์จัดการโครงการนี้ (จัดการได้เฉพาะโครงการที่ตนเองสร้าง)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination: 1 2 3 4 5 */}
      <div className="mt-8">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {/* Edit Project Modal (Date, Location, Title, Description) */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleSaveProjectEdit}
            className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-700">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    แก้ไขข้อมูลโครงการ ({editingProject.code})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    แก้ไขวันที่จัดงาน สถานที่ และรายละเอียดที่จะแสดงบนเกียรติบัตร
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cmtc-800" />
                    วันที่จัดงาน (แสดงบนเกียรติบัตร)
                  </label>
                  <input
                    type="text"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    placeholder="เช่น 12-14 พฤษภาคม 2569"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-xs border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cmtc-800" />
                    ณ สถานที่จัดงาน
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="เช่น วิทยาลัยเทคนิคเชียงใหม่"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-xs border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  ชื่อโครงการ / หลักสูตร <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-xs border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-slate-900 text-xs border border-slate-200 focus:bg-white focus:ring-2 focus:ring-cmtc-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingEdit || !editTitle.trim()}
                className="px-5 py-2 rounded-xl bg-cmtc-800 hover:bg-cmtc-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savingEdit ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch PDF Download Modal */}
      {batchPdfProject && (
        <BatchPdfModal
          projectId={batchPdfProject.id}
          projectCode={batchPdfProject.code}
          projectTitle={batchPdfProject.title}
          isOpen={Boolean(batchPdfProject)}
          onClose={() => setBatchPdfProject(null)}
        />
      )}
    </div>
  );
}
