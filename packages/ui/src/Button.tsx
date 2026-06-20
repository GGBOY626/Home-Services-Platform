import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
}

const variants: Record<string, string> = {
  default: 'bg-neutral-900 text-white hover:bg-neutral-800',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
  outline: 'border border-neutral-300 bg-transparent hover:bg-neutral-50',
  ghost: 'hover:bg-neutral-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  primary: '',
};

const sizes = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
};

export function Button({
  className = '',
  variant = 'default',
  size = 'md',
  style,
  ...props
}: ButtonProps) {
  const variantClass = variants[variant];
  const sizeClass = sizes[size];

  // Primary variant uses CSS custom properties for app-specific theming
  const primaryStyle =
    variant === 'primary'
      ? {
          backgroundColor: 'var(--app-primary)',
          color: '#ffffff',
          '--app-btn-hover': 'var(--app-primary-hover)',
        } as React.CSSProperties
      : {};

  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantClass} ${sizeClass} ${className}`}
      style={{
        ...primaryStyle,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (variant === 'primary') {
          (e.target as HTMLElement).style.backgroundColor = 'var(--app-primary-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') {
          (e.target as HTMLElement).style.backgroundColor = 'var(--app-primary)';
        }
      }}
      {...props}
    />
  );
}
