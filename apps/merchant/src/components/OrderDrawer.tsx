import { Drawer } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';
import type { Order } from '@home-services/shared';
import type { WorkerSummary } from '@home-services/shared';

export interface OrderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  workers: WorkerSummary[];
  onAssignWorker: (workerId: string) => void;
  onRejectClick: () => void;
  assignLoading?: boolean;
}

export function OrderDrawer({
  open,
  onOpenChange,
  order,
  workers,
  onAssignWorker,
  onRejectClick,
  assignLoading = false,
}: OrderDrawerProps) {
  if (!order) return null;

  const canAssign = order.status === 'MERCHANT_ASSIGNED';
  const waitingWorker = order.status === 'WORKER_ASSIGNED';

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={`Order ${order.id.slice(0, 8)}…`} side="right">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="font-medium text-neutral-700">{order.serviceNameSnapshot}</span>
        </div>
        <p className="text-sm text-neutral-600">{formatCurrency(order.priceCents)} · {order.durationMinutesSnapshot} min</p>
        <p className="text-sm font-medium text-neutral-700">Scheduled: {formatScheduled(order.scheduledAt)}</p>
        <p className="text-neutral-900">{order.address}</p>
        {order.notes && <p className="text-sm text-neutral-600"><span className="font-medium">Notes:</span> {order.notes}</p>}
        {order.cancelReason && <p className="text-sm text-neutral-500"><span className="font-medium">Cancel reason:</span> {order.cancelReason}</p>}
        <p className="text-sm text-neutral-500">Created {formatDate(order.createdAt)}</p>

        {canAssign && (
          <div className="space-y-2 pt-4 border-t border-neutral-200">
            <p className="text-sm font-medium text-neutral-700">Assign worker</p>
            {workers.length === 0 ? (
              <p className="text-sm text-neutral-500">No online workers available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workers.map((w) => (
                  <Button key={w.id} size="sm" onClick={() => onAssignWorker(w.id)} disabled={assignLoading}>
                    {w.displayName}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {canAssign && (
          <Button variant="destructive" className="mt-4" onClick={onRejectClick}>
            Reject order
          </Button>
        )}

        {waitingWorker && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            Waiting for worker acceptance
          </p>
        )}
      </div>
    </Drawer>
  );
}
