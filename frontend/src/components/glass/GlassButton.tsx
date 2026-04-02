import React from 'react';

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'default';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
  icon,
  iconPosition = 'left',
}) => {
  const baseClass = 'glass-button';
  const sizeClass = size === 'sm' ? 'glass-button-sm' : size === 'lg' ? 'glass-button-lg' : '';
  const variantClass =
    variant === 'primary'
      ? 'glass-button-primary'
      : variant === 'secondary'
        ? 'glass-button-secondary'
        : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${sizeClass} ${variantClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {icon && iconPosition === 'left' && <span>{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
};
