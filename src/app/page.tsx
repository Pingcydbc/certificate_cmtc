'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Award,
  Calendar,
  Download,
  Sparkles,
  Building2,
  FolderKanban,
  AlertCircle,
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';

interface CertificateResult {
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

export default function HomePage() {
  const [searchInput, setSearchInput] = useState('');
  const [currentQuery, setCurrentQuery] = useState('');
  const [results, setResults] = useState<CertificateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Perform search across all projects
  const performSearch = async (query: string, page = 1) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setHasSearched(false);
      setResults([]);
      setCurrentQuery('');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      setCurrentQuery(query);
      setCurrentPage(page);

      const params = new URLSearchParams({
        query: cleanQuery,
        page: page.toString(),
        limit: '12',
      });

      const res = await fetch(`/api/recipients?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.recipients || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalResults(data.pagination?.total || 0);
      } else {
        setResults([]);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (err) {
      console.error('Failed to search certificates:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setSearchInput(val);
    if (!val.trim()) {
      setHasSearched(false);
      setResults([]);
      setCurrentQuery('');
    } else {
      performSearch(val, 1);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      performSearch(searchInput, 1);
    }
  };

  const handlePageChange = (page: number) => {
    performSearch(currentQuery, page);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* Hero Section with Search */}
      <section
        className={`relative overflow-hidden w-full flex flex-col justify-center transition-all duration-300 ${
          hasSearched
            ? 'pt-8 pb-8 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 bg-white'
            : 'flex-1 py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-red-50/70 via-white to-slate-50'
        }`}
      >
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 w-full">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-bold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            ระบบบริการเกียรติบัตรออนไลน์ วิทยาลัยเทคนิคเชียงใหม่ (CMTC)
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            ค้นหาและดาวน์โหลด <span className="text-gradient-red">เกียรติบัตรของคุณ</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            พิมพ์ชื่อ-นามสกุลของคุณ ระบบจะค้นหาและรวบรวมใบเกียรติบัตรที่คุณได้รับจากทุกโครงการจัดอบรมและกิจกรรมขึ้นมาให้ดาวน์โหลดได้ทันที
          </p>

          {/* Direct Search Box Form */}
          <div className="mt-8 max-w-2xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="bg-white p-2.5 rounded-2xl shadow-lg border border-slate-200/90 flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <SearchBar
                  value={searchInput}
                  onChange={handleQueryChange}
                  onSearch={(val) => {
                    if (val.trim()) performSearch(val, 1);
                  }}
                  placeholder="พิมพ์ชื่อ-นามสกุล หรือเลขที่เกียรติบัตร..."
                  className="w-full"
                  loading={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !searchInput.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-red-700/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังค้นหา...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>ค้นหาเกียรติบัตร</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span>💡 คำแนะนำ:</span>
              <span className="text-slate-600">ค้นหาด้วย <strong>ชื่อ-นามสกุล</strong> เช่น <em>&quot;สมชาย&quot;</em> หรือ <strong>เลขที่เกียรติบัตร</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Area */}
      {hasSearched && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 space-y-6 flex-1 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <Award className="w-6 h-6 text-red-700" />
                <span>ผลการค้นหาเกียรติบัตร</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                คำค้นหา: <strong className="text-red-700">&quot;{currentQuery}&quot;</strong>
              </p>
            </div>

            <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
              พบทั้งหมด <strong className="text-red-700 text-sm font-black">{totalResults}</strong> ฉบับ
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white border border-slate-200 p-6 rounded-2xl animate-pulse space-y-4 shadow-xs">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-10 bg-slate-100 rounded mt-4" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            /* Not Found State */
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 max-w-xl mx-auto shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                ไม่พบเกียรติบัตรที่ตรงกับ &quot;{currentQuery}&quot;
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                กรุณาตรวจสอบการสะกดชื่อ-นามสกุล หรือลองค้นหาด้วยเฉพาะชื่อจริง หรือเลขที่เกียรติบัตร (ไม่ต้องพิมพ์คำนำหน้า เช่น นาย/นาง/นางสาว)
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSearchInput('');
                    setHasSearched(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  ล้างคำค้นหา
                </button>
              </div>
            </div>
          ) : (
            /* Results Cards Grid */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((item) => {
                  const pdfUrl = `/api/certificates/render?recipientId=${item.id}&format=pdf&download=true`;
                  const pngUrl = `/api/certificates/render?recipientId=${item.id}&format=png&download=true`;

                  return (
                    <div
                      key={item.id}
                      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-red-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Project Header Tag */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-800 text-[11px] font-bold border border-red-200/80">
                            <FolderKanban className="w-3.5 h-3.5 text-red-700 shrink-0" />
                            <span className="truncate max-w-[220px]">{item.project.title}</span>
                          </span>

                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {item.project.code}
                          </span>
                        </div>

                        {/* Recipient Full Name */}
                        <div>
                          <p className="text-xs text-slate-400 font-medium">ผู้ได้รับเกียรติบัตร</p>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-red-700 transition-colors mt-0.5">
                            {item.fullName}
                          </h3>
                        </div>

                        {/* Meta details */}
                        <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                          {item.organization && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{item.organization}</span>
                            </div>
                          )}

                          {item.project.eventDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.project.eventDate}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 pt-1">
                            <span className="font-semibold text-slate-700">เลขที่:</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{item.certNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                        {/* View Certificate */}
                        <Link
                          href={`/cert/${item.id}`}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-red-700/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>ดูเกียรติบัตร</span>
                        </Link>

                        {/* Direct Download PDF */}
                        <a
                          href={pdfUrl}
                          download
                          title="ดาวน์โหลด PDF สำหรับพิมพ์"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination if multiple pages */}
              {totalPages > 1 && (
                <div className="pt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </main>
      )}
    </div>
  );
}
