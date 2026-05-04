import React from 'react';

export function ScoreBadge({ score, label, className = '' }: { score: number, label?: string, className?: string }) {
  let colorClass = 'text-gray-500 bg-gray-100';
  let dotColor = 'bg-gray-400';
  
  if (score >= 70) {
    colorClass = 'text-success-700 bg-success-50';
    dotColor = 'bg-success-500';
  } else if (score >= 40) {
    colorClass = 'text-warning-700 bg-warning-50';
    dotColor = 'bg-warning-500';
  } else if (score > 0) {
    colorClass = 'text-error-700 bg-error-50';
    dotColor = 'bg-error-500';
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-sm font-normal font-outfit ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`}></span>
        {Math.round(score)}
      </span>
      {label && <span className="text-[9px] font-normal text-gray-400 uppercase mt-1 tracking-widest">{label}</span>}
    </div>
  );
}
