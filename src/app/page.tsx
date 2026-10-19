'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  FolderKanban,
  Calendar,
  MapPin,
  Users,
  Award,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';

interface ProjectItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    recipients: number;
  };
  template?: {
    backgroundImage: string;
  } | null;
  recipients?: Array<{
    id: string;
    certNumber: string;
    fullName: string;
    organization: string | null;
  }>;
}

export default function HomePage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: search.trim(),
        activeOnly: 'true',
      });

      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalProjects(data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 bg-gradient-to-b from-red-50/70 via-white to-slate-50">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-bold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            ระบบบริการเกียรติบัตรออนไลน์ วิทยาลัยเทคนิคเชียงใหม่ (CMTC)
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            ค้นหาและดาวน์โหลด <span className="text-gradient-red">เกียรติบัตรออนไลน์</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            เข้าถึงเกียรติบัตรการอบรม สัมมนา และกิจกรรมการเรียนรู้ได้อย่างสะดวกรวดเร็ว ตรวจสอบความถูกต้องและดาวน์โหลดไฟล์ความละเอียดสูงได้ทันที
          </p>

          {/* Quick Direct Search Box */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-slate-200/90 flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <SearchBar
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="พิมพ์ชื่อ-นามสกุล หรือชื่อโครงการ เพื่อค้นหา..."
                  className="w-full"
                />
              </div>
              <Link
                href={search.trim() ? `/search?query=${encodeURIComponent(search.trim())}` : '/search'}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-red-700/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                <Search className="w-4 h-4" />
                ค้นหารายชื่อละเอียด
              </Link>
            </div>
            <p className="mt-2.5 text-xs text-slate-500 text-center">
              💡 ค้นหาได้ทั้ง <strong className="text-red-700">ชื่อ-นามสกุลผู้รับเกียรติบัตร</strong> และ <strong className="text-red-700">ชื่อโครงการ</strong> ในช่องเดียวกัน
            </p>
          </div>

          {/* Stats Bar */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <div className="bg-white border border-slate-200/90 shadow-xs p-4 rounded-2xl flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{totalProjects}</p>
                <p className="text-xs text-slate-500 font-medium">โครงการทั้งหมด</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 shadow-xs p-4 rounded-2xl flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">800+</p>
                <p className="text-xs text-slate-500 font-medium">ผู้รับเกียรติบัตรในระบบ</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 shadow-xs p-4 rounded-2xl col-span-2 sm:col-span-1 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">PDF / PNG</p>
                <p className="text-xs text-slate-500 font-medium">พิมพ์ได้คมชัด 100%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects List Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-red-700" />
              รายการโครงการจัดอบรมและกิจกรรม
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              แสดง 10 โครงการต่อหน้า • คลิกเลือกโครงการเพื่อค้นหาและดาวน์โหลดเกียรติบัตร
            </p>
          </div>

          <div className="text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            พบทั้งหมด <span className="font-bold text-red-700">{totalProjects}</span> โครงการ
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white border border-slate-200 p-6 rounded-2xl animate-pulse space-y-4 shadow-xs">
                <div className="h-5 bg-slate-200 rounded w-1/4" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded mt-4" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
            <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">ไม่พบโครงการที่ค้นหา</h3>
            <p className="text-sm text-slate-500 mt-1">
              ลองค้นหาด้วยคำอื่น หรือคลิกดูโครงการทั้งหมด
            </p>
            <button
              onClick={() => setSearch('')}
              className="mt-4 px-4 py-2 text-xs font-bold rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
            >
              ล้างการค้นหา
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-slate-200/90 hover:border-red-300 rounded-2xl p-6 flex flex-col justify-between group shadow-xs hover:shadow-xl transition-all"
              >
                <div>
                  {/* Header badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 font-mono">
                      {project.code}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      <Users className="w-3.5 h-3.5 text-red-700" />
                      {project._count.recipients} รายชื่อ
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-red-700 transition-colors line-clamp-2">
                    {project.title}
                  </h3>

                  {project.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    {project.eventDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>วันที่: {project.eventDate}</span>
                      </div>
                    )}
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span className="truncate">สถานที่: {project.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Matched Recipients (when searching by person's name) */}
                  {project.recipients && project.recipients.length > 0 && (
                    <div className="mt-4 p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-red-900">
                        <span className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-red-700" />
                          พบผู้ได้รับเกียรติบัตรตรงกับคำค้นหา:
                        </span>
                        <span className="text-[11px] text-red-700 font-mono">
                          {project.recipients.length} คน
                        </span>
                      </div>
                      <div className="divide-y divide-red-200/60">
                        {project.recipients.map((recip) => (
                          <div key={recip.id} className="py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{recip.fullName}</p>
                              <p className="text-[11px] text-slate-500 font-mono truncate">
                                {recip.certNumber} {recip.organization ? `• ${recip.organization}` : ''}
                              </p>
                            </div>
                            <Link
                              href={`/cert/${recip.id}`}
                              className="px-2.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition-transform active:scale-95 shadow-xs"
                            >
                              <span>ดูเกียรติบัตร</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="mt-6 pt-2">
                  <Link
                    href={`/search?projectId=${project.id}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-red-700 text-slate-700 hover:text-white border border-slate-200 hover:border-red-700 text-xs font-bold flex items-center justify-center gap-2 transition-all group-hover:shadow-md"
                  >
                    <span>ค้นหาเกียรติบัตรในโครงการนี้</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination: 1 2 3 4 5 */}
        <div className="mt-10">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </section>
    </div>
  );
}
