import React from 'react';
import { Card } from './Card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

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

export function KPICard({ title, value, icon, trend, colorClass, onClick }: KPICardProps) {
  return (
    <Card 
      className={`p-5 flex flex-col justify-between h-full transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:bg-gray-50/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest whitespace-nowrap">{title}</h3>
        {icon && <div className={`text-gray-400 ${colorClass || ''}`}>{icon}</div>}
      </div>
      <div className="flex-1 flex items-end justify-between min-h-[48px] gap-2">
        <div className={`font-normal text-gray-900 font-outfit uppercase tracking-tight leading-tight ${typeof value === 'string' && value.length > 10 ? 'text-sm' : 'text-2xl'} ${colorClass || ''}`}>
          {value}
        </div>
        {trend && (
          <div className={`flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded ${trend.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {trend.isPositive ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </Card>
  );
}
