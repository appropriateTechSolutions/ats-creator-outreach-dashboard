import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variants = {
    primary: 'bg-primary-50 text-primary-700 border border-primary-200/60',
    secondary: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
    success: 'bg-success-50 text-success-700 border border-success-200/60',
    warning: 'bg-warning-50 text-warning-800 border border-warning-200/60',
    error: 'bg-error-50 text-error-700 border border-error-200/60',
    gray: 'bg-gray-50 text-gray-700 border border-gray-200/60'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide shadow-sm ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
