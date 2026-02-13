import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Order } from '@home-services/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    api<Order>(`/user/orders/${id}`, { token })
      .then(setOrder)
      .catch((err) => {
        addToast('error', 'Failed to load order', err.message);
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [token, id, navigate, addToast]);

  const handleConfirm = async () => {
    if (!token || !id) return;
    setActionLoading(true);
    try {
      await api<Order>(`/user/orders/${id}/confirm`, { method: 'POST', token });
      addToast('success', 'Order closed', 'You confirmed completion. Thank you!');
      setOrder((prev) => (prev ? { ...prev, status: 'CLOSED' } : null));
    } catch (err) {
      addToast('error', 'Action failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!token || !id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/user/orders/${id}/cancel`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      setOrder(updated);
      setShowCancelConfirm(false);
      setCancelReason('');
      addToast('success', 'Order cancelled');
    } catch (err) {
      addToast('error', 'Cancel failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !order) {
    return <p className="text-neutral-600">Loading…</p>;
  }

  const canConfirm = order.status === 'COMPLETED';
  const canCancel = order.status === 'PLACED' || order.status === 'MERCHANT_ASSIGNED';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{order.serviceType} — {order.status}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">Address:</span> {order.address}</p>
          {order.notes && <p><span className="font-medium">Notes:</span> {order.notes}</p>}
          <p className="text-sm text-neutral-500">
            Created {new Date(order.createdAt).toLocaleString()}
          </p>
          {canConfirm && (
            <Button onClick={handleConfirm} disabled={actionLoading} className="mt-4">
              {actionLoading ? 'Confirming…' : 'Confirm completion'}
            </Button>
          )}
          {canCancel && !showCancelConfirm && (
            <Button variant="outline" onClick={() => setShowCancelConfirm(true)} className="mt-4 ml-2">
              Cancel order
            </Button>
          )}
          {canCancel && showCancelConfirm && (
            <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4 space-y-3">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Wrong address"
              />
              <div className="flex gap-2">
                <Button onClick={handleCancelOrder} disabled={actionLoading}>
                  {actionLoading ? 'Cancelling…' : 'Confirm cancel'}
                </Button>
                <Button variant="outline" onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }} disabled={actionLoading}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
