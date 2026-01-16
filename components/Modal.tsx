import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-all duration-300 p-0 md:p-4">
      {/* Mobile: Bottom Sheet, Desktop: Center Modal */}
      <div 
        className="bg-white w-full h-[92vh] md:h-auto md:max-h-[85vh] md:max-w-2xl rounded-t-[2rem] md:rounded-[2rem] shadow-2xl flex flex-col transform transition-all animate-in slide-in-from-bottom-full md:slide-in-from-bottom-10 md:zoom-in-95 duration-300 border-t border-white/20"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-md z-10 shrink-0 rounded-t-[2rem]">
          <h2 className="text-xl font-bold text-gray-800 line-clamp-1 tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 md:p-8 grow overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};