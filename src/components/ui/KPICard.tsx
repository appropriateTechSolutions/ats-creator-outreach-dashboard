import React from 'react';
import { Card } from './Card';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
  onClick?: () => void;
}

export function KPICard({ title, value, onClick }: KPICardProps) {
  return (
    <Card 
      className={`p-5 flex flex-col justify-between h-full transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:bg-gray-50/50' : ''}`}
      onClick={onClick}
    >
      <div className="mb-2">
        <h3 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest whitespace-nowrap">{title}</h3>
      </div>
      <div className="flex-1 flex items-center min-h-[48px]">
        <div className={`font-normal text-gray-900 font-outfit uppercase tracking-tight leading-tight ${typeof value === 'string' && value.length > 10 ? 'text-sm' : 'text-2xl'}`}>
          {value}
        </div>
      </div>
    </Card>
  );
}
