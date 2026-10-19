'use client';

import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'พิมพ์ชื่อ-นามสกุล, เลขทะเบียนเกียรติบัตร, หรือหน่วยงาน...',
  className = '',
  debounceMs = 300,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [localValue, onChange, value, debounceMs]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-4 pointer-events-none text-slate-400">
        <Search className="w-5 h-5 text-red-600" />
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white text-slate-800 placeholder-slate-400 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all text-sm shadow-xs"
      />
      {localValue && (
        <button
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
