import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'neutral';
}

const variants: Record<string, string> = {
  default: 'bg-neutral-100 text-neutral-800 border-neutral-200',
  success: 'bg-green-50 text-green-800 border-green-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  destructive: 'bg-red-50 text-red-800 border-red-200',
  neutral: 'bg-neutral-50 text-neutral-600 border-neutral-200',
};

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
