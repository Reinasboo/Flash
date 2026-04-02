'use client';

import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  variant?: 'success' | 'error' | 'warning' | 'pending' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantClasses = {
  success: 'bg-success-100 text-success-800 border border-success-300',
  error: 'bg-error-100 text-error-800 border border-error-300',
  warning: 'bg-warning-100 text-warning-800 border border-warning-300',
  pending: 'bg-pending-100 text-pending-800 border border-pending-300',
  info: 'bg-primary-100 text-primary-800 border border-primary-300',
  neutral: 'bg-gray-100 text-gray-800 border border-gray-300',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  children,
  icon,
  className,
  dot = false,
}) => {
  const dotColor = {
    success: 'bg-success-600',
    error: 'bg-error-600',
    warning: 'bg-warning-600',
    pending: 'bg-pending-600',
    info: 'bg-primary-600',
    neutral: 'bg-gray-600',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full font-medium transition-colors duration-300 whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && <span className={clsx('inline-block w-1.5 h-1.5 rounded-full', dotColor[variant])}></span>}
      {icon}
      {children}
    </span>
  );
};
