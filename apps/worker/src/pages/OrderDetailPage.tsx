import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Order } from '@home-services/shared';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<Order>(`/worker/orders/${id}`)
      .then(setOrder)
      .catch(() => {
        addToast('error', 'Order not found');
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, addToast, api]);

  const handleAccept = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/accept`, { method: 'POST' });
      setOrder(updated);
      addToast('success', 'Order accepted');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/complete`, { method: 'POST' });
      setOrder(updated);
      addToast('success', 'Job completed');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      setOrder(updated);
      addToast('success', 'Order rejected');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
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

  const canAccept = order.status === 'WORKER_ASSIGNED';
  const canComplete = order.status === 'ACCEPTED';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <StatusBadge status={order.status} />
            <span className="text-lg font-medium text-neutral-700">{order.serviceNameSnapshot}</span>
          </div>
          <p className="text-sm text-neutral-600">{formatCurrency(order.priceCents)} · {order.durationMinutesSnapshot} min</p>
          <p className="text-2xl font-bold text-neutral-900">{formatScheduled(order.scheduledAt)}</p>
          <p className="mt-1 text-lg font-medium text-neutral-700">{order.address}</p>
          {order.notes && (
            <p className="mt-3 text-neutral-600"><span className="font-medium">Notes:</span> {order.notes}</p>
          )}
          <p className="mt-4 text-sm text-neutral-500">Created {formatDate(order.createdAt)}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {canAccept && (
              <>
                <Button size="lg" onClick={handleAccept} disabled={actionLoading}>
                  {actionLoading ? 'Processing…' : 'Accept Job'}
                </Button>
                <Button variant="destructive" size="lg" onClick={() => setRejectOpen(true)} disabled={actionLoading}>
                  Reject
                </Button>
              </>
            )}
            {canComplete && (
              <Button size="lg" onClick={handleComplete} disabled={actionLoading}>
                {actionLoading ? 'Processing…' : 'Complete Job'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject job"
        description="This order will be returned to the merchant."
        confirmLabel="Confirm reject"
        variant="destructive"
        reasonLabel="Reason (optional)"
        reasonPlaceholder="e.g. Not available"
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </div>
  );
}
