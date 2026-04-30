import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-[10px] font-normal text-slate-700 block font-outfit uppercase tracking-widest">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 rounded-xl border border-slate-200 
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            ${!className.includes('bg-') ? 'bg-white/50 backdrop-blur-sm' : ''}
            ${!className.includes('text-') ? 'text-slate-900' : ''}
            ${!className.includes('placeholder:') ? 'placeholder:text-slate-400' : ''}
            ${error ? 'border-error-500 focus:ring-error-500/20 focus:border-error-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-error-500 font-normal">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
