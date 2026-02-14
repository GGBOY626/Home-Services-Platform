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
}

export function TaskCard({
  order,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryLoading = false,
  secondaryLoading = false,
}: TaskCardProps) {
  return (
    <Card className="rounded-2xl border-neutral-200 shadow-md">
      <CardContent className="p-6">
        <div className="mb-4">
          <StatusBadge status={order.status} />
          <p className="mt-1 text-sm text-neutral-600">{order.serviceNameSnapshot} · {formatCurrency(order.priceCents)} · {order.durationMinutesSnapshot} min</p>
        </div>
        <p className="text-2xl font-bold text-neutral-900 leading-tight">{formatScheduled(order.scheduledAt)}</p>
        <p className="mt-1 text-lg font-medium text-neutral-700 leading-tight">{order.address}</p>
        {order.notes && (
          <p className="mt-3 text-base text-neutral-600">
            <span className="font-medium">Notes:</span> {order.notes}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="flex-1 min-h-12 text-base" onClick={onPrimary} disabled={primaryLoading}>
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
