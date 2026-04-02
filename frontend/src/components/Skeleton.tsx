'use client';

import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  circle = false,
  className,
  count = 1,
}) => {
  const skeletons = Array.from({ length: count });

  return (
    <>
      {skeletons.map((_, i) => (
        <div
          key={i}
          className={clsx(
            'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer',
            circle && 'rounded-full',
            !circle && 'rounded-lg',
            className
          )}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
            backgroundSize: '200% 100%',
          }}
        />
      ))}
    </>
  );
};
