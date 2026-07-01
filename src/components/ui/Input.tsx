import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-gray-700 block">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            className={`
            ${icon ? 'pl-10' : ''}
            w-full px-4 py-2.5 rounded-xl border border-gray-200/60
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            ${!className.includes('bg-') ? 'bg-gray-50/50 hover:bg-gray-50 focus:bg-white shadow-sm' : ''}
            ${!className.includes('text-') ? 'text-gray-900' : ''}
            ${!className.includes('placeholder:') ? 'placeholder:text-gray-400' : ''}
            ${error ? 'border-error-500 focus:ring-error-500/20 focus:border-error-500' : ''}
            ${className}
          `}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="text-xs text-error-500 font-normal">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
