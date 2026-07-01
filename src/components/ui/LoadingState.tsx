import React from 'react';

interface LoadingStateProps {
  message?: string;
  mini?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, mini }) => {
  const size = mini ? 'w-5 h-5' : 'w-16 h-16';
  const dotSize = mini ? 'w-1 h-1' : 'w-3 h-3';
  const radius = mini ? 10 : 40;

  return (
    <div
      className={`flex flex-col items-center justify-center ${mini ? 'p-0' : 'p-16'} animate-in fade-in duration-500`}
    >
      <div className={`relative ${size}`}>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`absolute ${dotSize} ${mini ? 'bg-current' : 'bg-primary-500'} rounded-full`}
            style={{
              top: `${50 + radius * Math.sin((i * 45 * Math.PI) / 180)}%`,
              left: `${50 + radius * Math.cos((i * 45 * Math.PI) / 180)}%`,
              animation: `loaderDots 1.2s linear infinite`,
              animationDelay: `${i * 0.15}s`,
              transform: 'translate(-50%, -50%)',
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};
