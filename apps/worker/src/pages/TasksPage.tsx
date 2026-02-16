import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { TaskCard } from '../components/TaskCard';
import { Card, CardContent } from '@home-services/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Order, WorkerMeResponse } from '@home-services/shared';

interface PageRes {
  content: Order[];
}

export function TasksPage() {
  const { api } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<WorkerMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);

  const availability = profile?.availability ?? 'OFFLINE';

  useEffect(() => {
    Promise.all([
      api<PageRes>('/worker/orders?page=0&size=20'),
      api<WorkerMeResponse>('/worker/me'),
    ])
      .then(([ordersRes, meRes]) => {
        setOrders(ordersRes.content);
        setProfile(meRes);
      })
      .catch((err) => addToast('error', 'Failed to load', err.message))
      .finally(() => setLoading(false));
  }, [api, addToast]);

  const handleSetAvailability = async (next: 'ONLINE' | 'OFFLINE') => {
    if (next === availability) return;
    setAvailabilityLoading(true);
    try {
      const updated = await api<WorkerMeResponse>('/worker/availability', {
        method: 'POST',
        body: JSON.stringify({ availability: next }),
      });
      setProfile(updated);
      addToast('success', next === 'ONLINE' ? 'You are now ONLINE' : 'You are now OFFLINE');
    } catch (err) {
      addToast('error', 'Failed to update', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const active = orders.filter((o) => o.status === 'WORKER_ASSIGNED' || o.status === 'ACCEPTED');
  const current = active[0];

  const handleAccept = async (id: string) => {
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/accept`, { method: 'POST' });
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      addToast('success', 'Job accepted');
    } catch (err) {
      addToast('error', 'Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectOrderId) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${rejectOrderId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      setOrders((prev) => prev.map((o) => (o.id === rejectOrderId ? updated : o)));
      setRejectOrderId(null);
      addToast('success', 'Order rejected');
    } catch (err) {
      addToast('error', 'Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-neutral-900">Current Task</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-600">Availability</span>
          <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
            <button
              type="button"
              onClick={() => handleSetAvailability('ONLINE')}
              disabled={availabilityLoading}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                availability === 'ONLINE'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              ONLINE
            </button>
            <button
              type="button"
              onClick={() => handleSetAvailability('OFFLINE')}
              disabled={availabilityLoading}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                availability === 'OFFLINE'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              OFFLINE
            </button>
          </div>
          <span className="text-xs text-neutral-500">({availability})</span>
        </div>
      </div>
      {current ? (
        <TaskCard
          order={current}
          primaryLabel={current.status === 'WORKER_ASSIGNED' ? 'Accept Job' : 'Submit Proof & Complete'}
          onPrimary={() =>
            current.status === 'WORKER_ASSIGNED' ? handleAccept(current.id) : navigate(`/orders/${current.id}`)
          }
          secondaryLabel={current.status === 'WORKER_ASSIGNED' ? 'Reject' : undefined}
          onSecondary={current.status === 'WORKER_ASSIGNED' ? () => setRejectOrderId(current.id) : undefined}
          primaryLoading={actionLoading}
        />
      ) : (
        <Card className="rounded-2xl border-neutral-200">
          <CardContent className="py-12 text-center text-neutral-500 text-lg">
            No tasks assigned
          </CardContent>
        </Card>
      )}

      {orders.length > 1 && (
        <>
          <h2 className="mt-10 mb-4 text-xl font-semibold text-neutral-900">All Assigned</h2>
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <Card
                  className="rounded-2xl border-neutral-200 cursor-pointer hover:border-neutral-300 transition"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-neutral-900">{order.address}</p>
                        <p className="text-sm text-neutral-500">{order.status}</p>
                      </div>
                      <span className="text-sm text-neutral-500">View →</span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={!!rejectOrderId}
        onOpenChange={(open) => !open && setRejectOrderId(null)}
        title="Reject job"
        description="This order will be returned to the merchant."
        confirmLabel="Confirm reject"
        variant="destructive"
        reasonLabel="Reason (optional)"
        reasonPlaceholder="e.g. Not available"
        onConfirm={handleRejectConfirm}
        loading={actionLoading}
      />
    </div>
  );
}
