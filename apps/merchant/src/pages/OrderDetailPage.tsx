import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Order, WorkerSummary } from '@home-services/shared';
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
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([
      api<Order>(`/merchant/orders/${id}`, { token }).catch(() => null),
      api<WorkerSummary[]>('/merchant/workers', { token }).catch(() => []),
    ]).then(([o, w]) => {
      if (o) setOrder(o);
      else navigate('/');
      setWorkers(Array.isArray(w) ? w : []);
    }).finally(() => setLoading(false));
  }, [token, id, navigate]);

  const handleAssignWorker = async (workerId: string) => {
    if (!token || !id) return;
    setAssigning(true);
    try {
      const updated = await api<Order>(`/merchant/orders/${id}/assign-worker`, {
        method: 'POST',
        token,
        body: JSON.stringify({ workerId }),
      });
      setOrder(updated);
      addToast('success', 'Worker assigned');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAssigning(false);
    }
  };

  const handleReject = async () => {
    if (!token || !id) return;
    setAssigning(true);
    try {
      const updated = await api<Order>(`/merchant/orders/${id}/reject`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      setOrder(updated);
      setShowRejectConfirm(false);
      setRejectReason('');
      addToast('success', 'Order rejected', 'Order returned to PLACED.');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAssigning(false);
    }
  };

  if (loading || !order) return <p className="text-neutral-600">Loading…</p>;

  const canAssign = order.status === 'MERCHANT_ASSIGNED';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{order.serviceType} — {order.status}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p><span className="font-medium">Address:</span> {order.address}</p>
          {order.notes && <p><span className="font-medium">Notes:</span> {order.notes}</p>}
          {canAssign && workers.length > 0 && !showRejectConfirm && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-neutral-700">Assign worker:</p>
              <div className="flex gap-2 flex-wrap">
                {workers.map((w) => (
                  <Button key={w.id} onClick={() => handleAssignWorker(w.id)} disabled={assigning}>
                    {assigning ? 'Assigning…' : w.displayName}
                  </Button>
                ))}
                <Button variant="outline" onClick={() => setShowRejectConfirm(true)} disabled={assigning}>
                  Reject order
                </Button>
              </div>
            </div>
          )}
          {canAssign && showRejectConfirm && (
            <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-4 space-y-3">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Input id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Cannot fulfil" />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleReject} disabled={assigning}>{assigning ? 'Rejecting…' : 'Confirm reject'}</Button>
                <Button variant="outline" onClick={() => { setShowRejectConfirm(false); setRejectReason(''); }} disabled={assigning}>Back</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
