'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to show: e.g. [1, 2, 3, 4, 5]
  const getPageNumbers = () => {
    const delta = 2; // how many pages around current
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const pages = getPageNumbers();

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1.5 sm:gap-2 select-none ${className}`}
    >
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
          currentPage <= 1
            ? 'text-slate-300 bg-slate-100 cursor-not-allowed border border-slate-200'
            : 'text-slate-700 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 shadow-2xs'
        }`}
        aria-label="หน้าก่อนหน้า"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">ก่อนหน้า</span>
      </button>

      {/* Number buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {pages.map((page, idx) => {
          if (page === '...') {
            return (
              <span
                key={`dots-${idx}`}
                className="px-2.5 py-1.5 text-sm text-slate-400 font-medium"
              >
                ...
              </span>
            );
          }

          const pageNum = Number(page);
          const isCurrent = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              aria-current={isCurrent ? 'page' : undefined}
              className={`min-w-[38px] h-[38px] flex items-center justify-center rounded-xl text-xs sm:text-sm transition-all ${
                isCurrent
                  ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm shadow-red-700/20 font-bold'
                  : 'text-slate-700 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 shadow-2xs font-semibold'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
          currentPage >= totalPages
            ? 'text-slate-300 bg-slate-100 cursor-not-allowed border border-slate-200'
            : 'text-slate-700 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 shadow-2xs'
        }`}
        aria-label="หน้าถัดไป"
      >
        <span className="hidden sm:inline">ถัดไป</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
