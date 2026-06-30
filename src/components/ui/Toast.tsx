import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

export function Toast({ id, message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />,
    error: <AlertCircle className="text-red-500 flex-shrink-0" size={20} />,
    warning: <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />,
    info: <Info className="text-blue-500 flex-shrink-0" size={20} />
  };

  const bgs = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200'
  };

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-xl shadow-lg max-w-sm w-full pointer-events-auto animate-[slideInRight_0.3s_ease-out] ${bgs[type]}`}>
      {icons[type]}
      <div className="flex-1 text-sm font-medium text-gray-800 leading-snug">{message}</div>
      <button 
        onClick={() => onClose(id)} 
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded hover:bg-black/5"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}
