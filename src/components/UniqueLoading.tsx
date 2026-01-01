'use client';

import { cn } from '@/lib/utils';

interface UniqueLoadingProps {
  variant?: 'morph';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UniqueLoading = ({
  variant = 'morph',
  size = 'md',
  className,
}: UniqueLoadingProps) => {
  const containerSizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  } as const;

  if (variant === 'morph') {
    return (
      <div className={cn('relative flex items-center justify-center', containerSizes[size], className)}>
        {/* Pulsing background glow */}
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse blur-xl" />

        <div className="relative flex items-center justify-center w-full h-full">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute w-4 h-4 rounded-full gradient-primary shadow-glow shadow-primary/20"
              style={{
                animation: `morph-${i} 2.4s infinite ease-in-out`,
                animationDelay: `${i * 0.2}s`,
                left: i % 2 === 0 ? '25%' : '55%',
                top: i < 2 ? '25%' : '55%',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default UniqueLoading;

