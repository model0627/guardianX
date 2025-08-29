'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

function Toast({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 마운트 시 애니메이션을 위해 약간의 지연
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // 자동 제거 타이머
    const duration = toast.duration || 5000;
    const hideTimer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    const base = 'border-l-4 shadow-lg';
    switch (toast.type) {
      case 'success':
        return `${base} bg-green-50 border-green-500`;
      case 'error':
        return `${base} bg-red-50 border-red-500`;
      case 'warning':
        return `${base} bg-yellow-50 border-yellow-500`;
      case 'info':
        return `${base} bg-blue-50 border-blue-500`;
    }
  };

  return (
    <div
      className={`
        ${getStyles()}
        rounded-lg p-4 mb-3 flex items-center gap-3 transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
        ${isLeaving ? 'opacity-0 translate-x-full' : ''}
      `}
    >
      {getIcon()}
      <p className="text-gray-800 flex-1 text-sm">{toast.message}</p>
      <button
        onClick={handleRemove}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemoveToast: (id: string) => void;
}

export function ToastContainer({ toasts = [], onRemoveToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 w-80 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemoveToast} />
      ))}
    </div>
  );
}