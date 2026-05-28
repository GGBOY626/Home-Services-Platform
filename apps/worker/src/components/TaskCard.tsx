import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatScheduled } from '../lib/format';
import type { Order } from '@home-services/shared';

export interface TaskCardProps {
  order: Order;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryLoading?: boolean;
  secondaryLoading?: boolean;
  distanceLine?: string | null;
}

export function TaskCard({
  order,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryLoading = false,
  secondaryLoading = false,
  distanceLine,
}: TaskCardProps) {
  return (
    <Card className="rounded-xl border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg">
      <CardContent className="p-6">
        <div className="mb-4">
          <StatusBadge status={order.status} />
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">{order.serviceNameSnapshot} · {formatCurrency(order.priceCents)} · {order.durationMinutesSnapshot} min</p>
        </div>
        <p className="text-2xl font-bold text-[var(--app-text)] leading-tight">{formatScheduled(order.scheduledAt)}</p>
        <p className="mt-1 text-lg font-semibold text-[var(--app-text)] leading-tight">{order.address}</p>
        {distanceLine && (
          <p className="mt-1 text-sm text-[var(--app-primary)] font-medium">📍 {distanceLine}</p>
        )}
        {order.notes && (
          <p className="mt-3 text-base text-[var(--app-text-muted)]">
            <span className="font-medium text-[var(--app-text)]">Notes:</span> {order.notes}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="flex-1 min-h-12 text-base bg-[var(--app-cta)] hover:bg-[var(--app-cta-hover)] text-white border-0" onClick={onPrimary} disabled={primaryLoading}>
            {primaryLoading ? 'Please wait…' : primaryLabel}
          </Button>
          {secondaryLabel && onSecondary && (
            <Button
              variant="destructive"
              size="lg"
              className="min-h-12 text-base"
              onClick={onSecondary}
              disabled={secondaryLoading}
            >
              {secondaryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
