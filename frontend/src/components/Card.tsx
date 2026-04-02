'use client';

import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverable = false,
  onClick,
  header,
  footer,
  padded = true,
}: CardProps) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-300',
        hoverable && 'hover:shadow-lg hover:border-primary-300 hover:-translate-y-0.5 cursor-pointer',
        'shadow-sm',
        className
      )}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {header}
        </div>
      )}
      <div className={clsx(padded && 'px-6 py-4')}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};
