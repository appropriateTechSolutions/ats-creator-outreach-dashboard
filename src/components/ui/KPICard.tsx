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
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
        {icon && <div className={`${colorClass}`}>{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div className={`text-xs mt-1 font-medium ${trend.isPositive ? 'text-success-600' : 'text-error-600'}`}>
            {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last week
          </div>
        )}
      </div>
    </Card>
  );
}
