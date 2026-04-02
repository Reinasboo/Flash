import React from 'react';

interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'idle' | 'warning' | 'pending';
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'idle',
  pulse = false,
  icon,
  className = '',
}) => {
  const variantClass = `glass-badge-${variant}`;
  const pulseClass = pulse && variant === 'active' ? 'pulse' : '';

  return (
    <span className={`glass-badge ${variantClass} ${pulseClass} ${className}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
