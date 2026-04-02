'use client';

import React, { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  required?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, fullWidth = true, required, className, ...props }, ref) => {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-gray-900 mb-2">
            {label}
            {required && <span className="text-error-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 border-2 rounded-lg font-medium transition-all duration-300 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-primary-500',
            'placeholder:text-gray-400',
            'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
            error ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : 'border-gray-300',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-error-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
