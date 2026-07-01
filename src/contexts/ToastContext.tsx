import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Toast, ToastType } from '../components/ui/Toast';
import { setToastEmitter } from '../lib/toast';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Monotonic counter — guarantees unique, collision-free keys (unlike Math.random).
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = String((nextId.current += 1));
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  // Bridge the imperative `toast` module (src/lib/toast) to this provider so
  // non-hook code can raise the same toasts.
  useEffect(() => {
    setToastEmitter(showToast);
    return () => setToastEmitter(null);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none"
        role="region"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <Toast key={t.id} id={t.id} message={t.message} type={t.type} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
