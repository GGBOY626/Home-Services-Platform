import { Drawer } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { StatusBadge } from './StatusBadge';
import { CompletionProofSection } from './CompletionProofSection';
import { formatDate, formatCurrency, formatScheduled, haversineKm, formatDistance } from '@home-services/shared';
import type { Order, CompletionProof } from '@home-services/shared';
import type { WorkerSummary } from '@home-services/shared';

export interface OrderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  workers: WorkerSummary[];
  onAssignWorker: (workerId: string) => void;
  onRejectClick: () => void;
  assignLoading?: boolean;
  fetchProof?: (orderId: string) => Promise<CompletionProof | null>;
}

export function OrderDrawer({
  open,
  onOpenChange,
  order,
  workers,
  onAssignWorker,
  onRejectClick,
  assignLoading = false,
  fetchProof,
}: OrderDrawerProps) {
  if (!order) return null;

  const canAssign = order.status === 'MERCHANT_ASSIGNED' || order.status === 'WORKER_ASSIGNED';
  const waitingWorker = order.status === 'WORKER_ASSIGNED';
  const isReassign = order.status === 'WORKER_ASSIGNED' && order.workerId != null;

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

        {/* Show assigned worker info when WORKER_ASSIGNED */}
        {isReassign && order.workerName && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-800">
            Assigned to <span className="font-semibold">{order.workerName}</span> — awaiting acceptance
          </div>
        )}

        {waitingWorker && !isReassign && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            Waiting for worker acceptance
          </p>
        )}

        {canAssign && (
          <div className="space-y-2 pt-4 border-t border-neutral-200">
            <p className="text-sm font-medium text-neutral-700">
              {isReassign ? 'Reassign to a different worker' : 'Assign worker'}
            </p>
            {workers.length === 0 ? (
              <p className="text-sm text-neutral-500">No online workers available.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workers.map((w) => {
                  const dist =
                    w.homeLat != null && w.homeLng != null &&
                    order.addressLat != null && order.addressLng != null
                      ? formatDistance(haversineKm(w.homeLat, w.homeLng, order.addressLat, order.addressLng))
                      : null;
                  const isCurrentWorker = isReassign && w.id === order.workerId;
                  return (
                    <Button
                      key={w.id}
                      size="sm"
                      variant={isCurrentWorker ? 'secondary' : 'default'}
                      onClick={() => onAssignWorker(w.id)}
                      disabled={assignLoading || isCurrentWorker}
                    >
                      {w.displayName}{dist ? ` · ${dist}` : ''}{isCurrentWorker ? ' (current)' : ''}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {canAssign && order.status === 'MERCHANT_ASSIGNED' && (
          <Button variant="destructive" className="mt-4" onClick={onRejectClick}>
            Reject order
          </Button>
        )}

        {fetchProof && (order.status === 'COMPLETED' || order.status === 'CLOSED') && (
          <CompletionProofSection
            orderId={order.id}
            status={order.status}
            fetchProof={fetchProof}
          />
        )}
      </div>
    </Drawer>
  );
}
