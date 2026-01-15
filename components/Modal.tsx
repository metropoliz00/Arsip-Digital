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
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      {/* 
        Responsive Modal Container:
        Mobile: Full height/width or Bottom Sheet style (using h-full or similar)
        Desktop: Centered, max-w-2xl, rounded
      */}
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl shadow-2xl overflow-y-auto transform transition-transform animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 flex flex-col">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 sticky top-0 bg-white z-10 shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 line-clamp-1">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors active:scale-90"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-4 md:p-6 grow">
          {children}
        </div>
      </div>
    </div>
  );
};