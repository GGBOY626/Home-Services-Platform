import * as React from 'react';
import { Dialog, DialogFooter } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { Label } from '@home-services/ui';
import { Input } from '@home-services/ui';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Back',
  variant = 'default',
  reasonLabel,
  reasonPlaceholder,
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState('');
  const handleConfirm = async () => {
    await onConfirm(reason);
    setReason('');
    onOpenChange(false);
  };
  const handleOpenChange = (next: boolean) => {
    if (!next) setReason('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} title={title} description={description}>
      {reasonLabel && (
        <div className="space-y-2">
          <Label>{reasonLabel}</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={reasonPlaceholder} />
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>{cancelLabel}</Button>
        <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={handleConfirm} disabled={loading}>
          {loading ? 'Please wait…' : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
