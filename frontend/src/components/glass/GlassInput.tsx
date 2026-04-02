import React from 'react';

interface GlassInputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  required?: boolean;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  type = 'text',
  placeholder = '',
  value,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  className = '',
  label,
  error,
  icon,
  iconPosition = 'right',
  required = false,
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-constellation-silver mb-2">
          {label}
          {required && <span className="text-constellation-cyan ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-constellation-cyan opacity-50">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          className={`glass-input ${icon && iconPosition === 'left' ? 'pl-10' : ''} ${icon && iconPosition === 'right' ? 'pr-10' : ''} ${error ? 'border-constellation-cyan border-opacity-60' : ''} ${className}`}
        />
        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-constellation-cyan opacity-50">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-constellation-cyan text-xs mt-1 opacity-75">{error}</p>
      )}
    </div>
  );
};
