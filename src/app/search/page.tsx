'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Award,
  Download,
  Eye,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';

interface RecipientItem {
  id: string;
  certNumber: string;
  fullName: string;
  organization: string | null;
  note: string | null;
  issuedDate: string;
  project: {
    id: string;
    code: string;
    title: string;
    eventDate: string | null;
    location: string | null;
  };
}

interface ProjectOption {
  id: string;
  code: string;
  title: string;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';
  const initialQuery = searchParams.get('query') || searchParams.get('search') || '';

  const [query, setQuery] = useState(initialQuery);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [projectsList, setProjectsList] = useState<ProjectOption[]>([]);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Load project list for dropdown filter
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects?limit=100&activeOnly=true');
        const data = await res.json();
        if (data.success) {
          setProjectsList(data.projects);
        }
      } catch (e) {
        console.error('Failed to load project list:', e);
      }
    }
    loadProjects();
  }, []);

  const searchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        query: query.trim(),
        page: currentPage.toString(),
        limit: '15',
      });
      if (selectedProjectId) {
        params.append('projectId', selectedProjectId);
      }

      const res = await fetch(`/api/recipients?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecipients(data.recipients);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalItems(data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedProjectId, currentPage]);

  useEffect(() => {
    searchCertificates();
  }, [searchCertificates]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  const handleProjectFilterChange = (id: string) => {
    setSelectedProjectId(id);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-slate-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-red-700 font-semibold mb-2">
          <Link href="/" className="hover:underline">หน้าหลัก</Link>
          <span>/</span>
          <span>ค้นหาเกียรติบัตร</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          ค้นหาและดาวน์โหลด <span className="text-gradient-red">เกียรติบัตรออนไลน์</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          กรอกชื่อ-นามสกุล, เลขทะเบียนเกียรติบัตร, หรือชื่อสถานศึกษา เพื่อค้นหาเกียรติบัตรของคุณ
        </p>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white p-5 rounded-2xl mb-8 space-y-4 border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">
              คำค้นหา (ชื่อ-นามสกุล, ชื่อโครงการ, เลขทะเบียน หรือ สังกัด)
            </label>
            <SearchBar
              value={query}
              onChange={handleQueryChange}
              placeholder="ค้นหาด้วย ชื่อ-นามสกุล หรือ ชื่อโครงการ... (เช่น นายสมชาย หรือ CMTC)"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-red-700" />
              กรองตามโครงการ
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectFilterChange(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white text-slate-800 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 text-sm shadow-2xs font-medium"
            >
              <option value="">ทุกโครงการทั้งหมด</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.title.length > 40 ? p.title.slice(0, 40) + '...' : p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 text-xs text-slate-500 border-t border-slate-100">
          <span>
            ผลการค้นหา: พบ <strong className="text-red-700 font-bold">{totalItems}</strong> รายการ
          </span>
          {(query || selectedProjectId) && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedProjectId('');
                setCurrentPage(1);
              }}
              className="text-red-700 hover:text-red-800 font-bold hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="bg-white border border-slate-200 p-5 rounded-2xl animate-pulse flex items-center justify-between shadow-xs">
              <div className="space-y-2 w-1/2">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
              <div className="h-9 bg-slate-100 rounded w-28" />
            </div>
          ))}
        </div>
      ) : recipients.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">ไม่พบข้อมูลเกียรติบัตร</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            กรุณาตรวจสอบการสะกดชื่อ-นามสกุล หรือลองค้นหาด้วยคำที่สั้นลง เช่น เฉพาะชื่อ หรือเฉพาะนามสกุล
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {recipients.map((recipient) => (
            <div
              key={recipient.id}
              className="bg-white border border-slate-200/90 hover:border-red-300 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group shadow-xs hover:shadow-lg transition-all"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    {recipient.certNumber}
                  </span>
                  <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 font-semibold">
                    {recipient.project.code}
                  </span>
                  {recipient.note && (
                    <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                      {recipient.note}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                  {recipient.fullName}
                </h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
                  {recipient.organization && (
                    <span className="flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-red-600" />
                      {recipient.organization}
                    </span>
                  )}
                  <span className="text-slate-500 truncate max-w-md font-medium" title={recipient.project.title}>
                    โครงการ: {recipient.project.title}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <Link
                  href={`/cert/${recipient.id}`}
                  className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-red-700/20 transition-all hover:scale-[1.02]"
                >
                  <Eye className="w-4 h-4" />
                  ดูเกียรติบัตร
                </Link>

                <a
                  href={`/api/certificates/render?recipientId=${recipient.id}&format=pdf&download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  title="ดาวน์โหลด PDF ทันที"
                >
                  <Download className="w-3.5 h-3.5 text-red-700" />
                  PDF
                </a>

                <a
                  href={`/api/certificates/render?recipientId=${recipient.id}&format=png&download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  title="ดาวน์โหลด PNG ทันที"
                >
                  <Download className="w-3.5 h-3.5 text-red-700" />
                  PNG
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-8">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">กำลังโหลด...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
