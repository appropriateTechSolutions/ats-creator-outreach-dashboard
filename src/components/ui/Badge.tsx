import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray';
  className?: string;
}

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  const variants = {
    primary: 'bg-primary-100 text-primary-700',
    secondary: 'bg-indigo-100 text-indigo-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-800',
    error: 'bg-error-100 text-error-700',
    gray: 'bg-gray-100 text-gray-700'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-normal uppercase tracking-widest ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
