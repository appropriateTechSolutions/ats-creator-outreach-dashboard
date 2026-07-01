import React from 'react';

export function Card({
  children,
  className = '',
  id,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <div
        id={id}
        className={`bg-white rounded-2xl shadow-soft border border-gray-200/60 ${className} cursor-pointer hover:shadow-hover hover:-translate-y-[2px] transition-all duration-300`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`bg-white rounded-2xl shadow-soft border border-gray-200/60 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-6 py-5 border-b border-gray-100 flex justify-between items-center ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}
