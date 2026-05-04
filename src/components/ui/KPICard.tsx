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
        <h3 className="text-xs font-normal text-gray-500 uppercase tracking-[0.2em] truncate">{title}</h3>
      </div>
      <div>
        <div className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">{value}</div>
      </div>
    </Card>
  );
}
