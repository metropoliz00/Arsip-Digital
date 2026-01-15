import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  label: string;
  value: string; // Format YYYY-MM-DD
  onChange: (date: string) => void;
  required?: boolean;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // State untuk navigasi kalender (Bulan/Tahun yang sedang dilihat)
  // Default ke tanggal yang dipilih atau hari ini
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const containerRef = useRef<HTMLDivElement>(null);

  // Close ketika klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset view saat modal dibuka kembali dengan value baru
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value, isOpen]);

  // Logic Kalender
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDateClick = (day: number) => {
    // Format YYYY-MM-DD dengan padding 0
    const m = (viewMonth + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const dateString = `${viewYear}-${m}-${d}`;
    onChange(dateString);
    setIsOpen(false);
  };

  // Render Helpers
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const days = [];
  
  // Empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
  }

  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDateStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    const isSelected = value === currentDateStr;
    const isToday = new Date().toISOString().split('T')[0] === currentDateStr;

    days.push(
      <button
        key={i}
        type="button"
        onClick={() => handleDateClick(i)}
        className={`
          h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all
          ${isSelected 
            ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 font-bold scale-110' 
            : 'text-gray-700 hover:bg-brand-100 hover:text-brand-700'}
          ${isToday && !isSelected ? 'border border-brand-300 text-brand-600 font-semibold' : ''}
        `}
      >
        {i}
      </button>
    );
  }

  // Format Tampilan Input
  const formattedDisplayValue = value ? new Date(value).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) : 'Pilih Tanggal';

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {/* Input Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 border rounded-lg flex items-center justify-between cursor-pointer transition-all bg-white
          ${isOpen ? 'ring-2 ring-brand-500 border-transparent' : 'border-gray-300 hover:border-brand-400'}
        `}
      >
        <span className={`text-sm ${value ? 'text-gray-800' : 'text-gray-400'}`}>
          {value ? formattedDisplayValue : 'DD/MM/YYYY'}
        </span>
        <CalendarIcon size={18} className="text-gray-400" />
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 p-4 bg-white rounded-xl shadow-xl border border-gray-100 w-72 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Navigasi */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <div className="font-bold text-gray-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Grid Hari (Min, Sen, ...) */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-xs font-bold text-gray-400 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Grid Tanggal */}
          <div className="grid grid-cols-7 gap-1 place-items-center">
            {days}
          </div>

          {/* Tombol Hari Ini */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const str = today.toISOString().split('T')[0];
                onChange(str);
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Pilih Hari Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
