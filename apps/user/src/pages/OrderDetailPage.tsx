import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Order } from '@home-services/shared';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { useAuth } from '../auth';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { api: apiRequest } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    apiRequest<Order>(`/user/orders/${id}`)
      .then(setOrder)
      .catch(() => {
        addToast('error', 'Order not found');
        navigate('/orders');
      })
      .finally(() => setLoading(false));
  }, [token, id, navigate, addToast, apiRequest]);

  const handleConfirm = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await apiRequest<Order>(`/user/orders/${id}/confirm`, { method: 'POST' });
      setOrder(updated);
      addToast('success', 'Order closed', 'Thank you for confirming.');
    } catch (err) {
      addToast('error', 'Action failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await apiRequest<Order>(`/user/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      setOrder(updated);
      addToast('success', 'Order cancelled');
    } catch (err) {
      addToast('error', 'Cancel failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  const canCancel = order.status === 'PLACED' || order.status === 'MERCHANT_ASSIGNED';
  const canConfirm = order.status === 'COMPLETED';
  const terminal = ['CANCELLED', 'EXPIRED', 'CLOSED'].includes(order.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={order.status} />
            <span className="text-lg font-medium text-neutral-700">{order.serviceNameSnapshot}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-600">{formatCurrency(order.priceCents)} · {order.durationMinutesSnapshot} min</p>
          <p className="mt-2 text-sm font-medium text-neutral-700">Scheduled: {formatScheduled(order.scheduledAt)}</p>
          <p className="mt-4 text-neutral-900">{order.address}</p>
          {order.notes && (
            <p className="mt-2 text-sm text-neutral-600">
              <span className="font-medium">Notes:</span> {order.notes}
            </p>
          )}
          {order.cancelReason && (
            <p className="mt-2 text-sm text-neutral-500">
              <span className="font-medium">Cancel reason:</span> {order.cancelReason}
            </p>
          )}
          <p className="mt-4 text-sm text-neutral-500">Created {formatDate(order.createdAt)}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {canConfirm && (
              <Button size="lg" onClick={handleConfirm} disabled={actionLoading}>
                {actionLoading ? 'Confirming…' : 'Confirm Completion'}
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" size="lg" onClick={() => setCancelOpen(true)} disabled={actionLoading}>
                Cancel Order
              </Button>
            )}
            {terminal && (
              <p className="text-sm text-neutral-500">No further actions.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel order"
        description="Your order will be cancelled. You can add a reason below."
        confirmLabel="Confirm cancel"
        cancelLabel="Back"
        variant="destructive"
        reasonLabel="Reason (optional)"
        reasonPlaceholder="e.g. Wrong address"
        onConfirm={handleCancel}
        loading={actionLoading}
      />
    </div>
  );
}
