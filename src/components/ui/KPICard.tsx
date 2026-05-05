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
}

export function KPICard({ title, value, icon, trend, colorClass = 'text-primary-600' }: KPICardProps) {
  return (
    <Card className="p-5 flex flex-col justify-between h-full">
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
