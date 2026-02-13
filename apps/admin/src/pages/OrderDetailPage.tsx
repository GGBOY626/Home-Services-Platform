import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Order } from '@home-services/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';

const MERCHANT_ID = 'b0000000-0000-0000-0000-000000000001';

function StatusBadge({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">CANCELLED</span>;
  }
  if (status === 'EXPIRED') {
    return <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">EXPIRED</span>;
  }
  return null;
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [timeoutJobLoading, setTimeoutJobLoading] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api<Order>(`/admin/orders/${id}`, { token })
      .then(setOrder)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [token, id, navigate]);

  const handleAssignMerchant = async () => {
    if (!token || !id) return;
    setAssigning(true);
    try {
      const updated = await api<Order>(`/admin/orders/${id}/assign-merchant`, {
        method: 'POST',
        token,
        body: JSON.stringify({ merchantId: MERCHANT_ID }),
      });
      setOrder(updated);
      addToast('success', 'Merchant assigned');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!token || !id) return;
    setAssigning(true);
    try {
      const updated = await api<Order>(`/admin/orders/${id}/cancel`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      setOrder(updated);
      setShowCancelConfirm(false);
      setCancelReason('');
      addToast('success', 'Order cancelled');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAssigning(false);
    }
  };

  const handleRunTimeoutJob = async () => {
    if (!token) return;
    setTimeoutJobLoading(true);
    try {
      const result = await api<{ merchantAssignExpired: number; workerAcceptRollback: number }>('/admin/jobs/run-timeouts', {
        method: 'POST',
        token,
      });
      addToast('success', 'Timeout job run', `Expired: ${result.merchantAssignExpired}, Rollback: ${result.workerAcceptRollback}`);
      if (id) {
        const updated = await api<Order>(`/admin/orders/${id}`, { token });
        setOrder(updated);
      }
    } catch (e) {
      addToast('error', 'Job failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setTimeoutJobLoading(false);
    }
  };

  if (loading || !order) return <p className="text-neutral-600">Loading…</p>;

  const canAssign = order.status === 'PLACED';
  const canCancel = order.status !== 'CLOSED';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 flex-wrap">
          <CardTitle>{order.serviceType} — {order.status}</CardTitle>
          <StatusBadge status={order.status} />
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">Address:</span> {order.address}</p>
          {order.notes && <p><span className="font-medium">Notes:</span> {order.notes}</p>}
          {canAssign && (
            <Button onClick={handleAssignMerchant} disabled={assigning} className="mt-4">
              {assigning ? 'Assigning…' : 'Assign to Demo Merchant'}
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
              <Input id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Customer request" />
              <div className="flex gap-2">
                <Button onClick={handleCancelOrder} disabled={assigning}>{assigning ? 'Cancelling…' : 'Confirm cancel'}</Button>
                <Button variant="outline" onClick={() => { setShowCancelConfirm(false); setCancelReason(''); }} disabled={assigning}>Back</Button>
              </div>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <Button variant="ghost" size="sm" onClick={handleRunTimeoutJob} disabled={timeoutJobLoading}>
              {timeoutJobLoading ? 'Running…' : 'Run Timeout Job'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
