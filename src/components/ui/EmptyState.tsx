import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 animate-[fadeIn_0.4s_ease]">
      <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-5 border border-gray-100">
        <Icon size={32} className="text-primary-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2 font-outfit uppercase tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
