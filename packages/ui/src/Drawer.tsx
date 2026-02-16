import * as React from 'react';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export function Drawer({ open, onOpenChange, title, children, side = 'right', className = '' }: DrawerProps) {
  if (!open) return null;
  const sideClass = side === 'right' ? 'right-0' : 'left-0';
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/30"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`fixed top-0 ${sideClass} z-50 h-full w-full max-w-md overflow-auto border border-neutral-200 bg-white shadow-xl sm:max-w-lg ${className}`}
        role="dialog"
        aria-modal
        aria-labelledby={title ? 'drawer-title' : undefined}
      >
        {title && (
          <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-6 py-4">
            <h2 id="drawer-title" className="text-lg font-semibold text-neutral-900">
              {title}
            </h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
