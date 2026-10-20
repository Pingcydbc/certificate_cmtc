'use client';

import { Search, X, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  loading?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'พิมพ์ชื่อ-นามสกุล, เลขทะเบียนเกียรติบัตร, หรือหน่วยงาน...',
  className = '',
  debounceMs = 250,
  loading = false,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newVal: string) => {
    setLocalValue(newVal);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      onChange(newVal);
    }, debounceMs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      onChange(localValue);
      if (onSearch) {
        onSearch(localValue);
      }
    }
  };

  const handleClear = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    setLocalValue('');
    onChange('');
    if (onSearch) {
      onSearch('');
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-4 pointer-events-none text-slate-400">
        {loading ? (
          <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
        ) : (
          <Search className="w-5 h-5 text-red-600" />
        )}
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white text-slate-800 placeholder-slate-400 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all text-sm shadow-xs"
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3.5 p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors"
          title="ล้างข้อความค้นหา"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
