'use client';

import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-md hover:shadow-lg hover:-translate-y-0.5',
        secondary:
          'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100',
        tertiary:
          'text-primary-600 hover:bg-primary-50 active:bg-primary-100',
        danger:
          'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 shadow-md hover:shadow-lg hover:-translate-y-0.5',
        ghost:
          'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
        success:
          'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-md hover:shadow-lg hover:-translate-y-0.5',
      },
      size: {
        xs: 'px-2.5 py-1.5 text-xs rounded-sm',
        sm: 'px-3 py-2 text-sm rounded-md',
        md: 'px-4 py-2.5 text-base rounded-lg',
        lg: 'px-6 py-3 text-lg rounded-lg',
        xl: 'px-8 py-4 text-lg rounded-lg',
        icon: 'p-2 rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
      loading: {
        true: 'relative text-transparent pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: ReactNode;
  children?: ReactNode;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading,
      disabled,
      children,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={clsx(buttonVariants({ variant, size, fullWidth, loading: isLoading }), className)}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
        )}
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
