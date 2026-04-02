import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  onClick,
}) => {
  return (
    <div
      className={`glass-card ${hover ? 'hover:shadow-deep hover:border-constellation-cyan/40 hover:bg-white/[0.15]' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
