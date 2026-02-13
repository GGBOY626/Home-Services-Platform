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
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    api<Order>(`/worker/orders/${id}`, { token })
      .then(setOrder)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [token, id, navigate]);

  const handleAccept = async () => {
    if (!token || !id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/accept`, { method: 'POST', token });
      setOrder(updated);
      addToast('success', 'Order accepted');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!token || !id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/complete`, { method: 'POST', token });
      setOrder(updated);
      addToast('success', 'Order marked completed');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token || !id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/reject`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      setOrder(updated);
      setShowRejectConfirm(false);
      setRejectReason('');
      addToast('success', 'Order rejected', 'Order returned to merchant.');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !order) return <p className="text-neutral-600">Loading…</p>;

  const canAccept = order.status === 'WORKER_ASSIGNED';
  const canComplete = order.status === 'ACCEPTED';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{order.serviceType} — {order.status}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">Address:</span> {order.address}</p>
          {order.notes && <p><span className="font-medium">Notes:</span> {order.notes}</p>}
          <div className="mt-4 flex gap-2 flex-wrap">
            {canAccept && !showRejectConfirm && (
              <>
                <Button onClick={handleAccept} disabled={actionLoading}>
                  {actionLoading ? 'Processing…' : 'Accept order'}
                </Button>
                <Button variant="outline" onClick={() => setShowRejectConfirm(true)} disabled={actionLoading}>
                  Reject
                </Button>
              </>
            )}
            {canAccept && showRejectConfirm && (
              <div className="w-full rounded-md border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                <Label htmlFor="reject-reason">Reason (optional)</Label>
                <Input id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Not available" />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleReject} disabled={actionLoading}>{actionLoading ? 'Rejecting…' : 'Confirm reject'}</Button>
                  <Button variant="outline" onClick={() => { setShowRejectConfirm(false); setRejectReason(''); }} disabled={actionLoading}>Back</Button>
                </div>
              </div>
            )}
            {canComplete && (
              <Button onClick={handleComplete} disabled={actionLoading}>
                {actionLoading ? 'Processing…' : 'Mark completed'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
