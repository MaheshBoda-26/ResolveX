'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-secondary-soft text-secondary-default',
      success: 'bg-success-soft text-success-default',
      warning: 'bg-warning-soft text-warning-default',
      error: 'bg-error-soft text-error-default',
      info: 'bg-accent-soft text-accent-default',
      primary: 'bg-brand-primary-soft text-brand-primary-dark',
      secondary: 'bg-border-default text-text-secondary',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };