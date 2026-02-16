import * as React from 'react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, className = '' }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/40"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={title ? 'dialog-title' : undefined}
        className={`relative z-50 w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="dialog-title" className="text-lg font-semibold text-neutral-900">
            {title}
          </h2>
        )}
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        <div className={title || description ? 'mt-4' : ''}>{children}</div>
      </div>
    </div>
  );
}

export function DialogFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mt-6 flex justify-end gap-2 ${className}`} {...props} />;
}
