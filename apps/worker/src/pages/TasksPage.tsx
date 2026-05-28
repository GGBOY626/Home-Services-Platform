import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { TaskCard } from '../components/TaskCard';
import { Card, CardContent } from '@home-services/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { haversineKm, formatDistance } from '@home-services/shared';
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
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load', err.message);
      })
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

  const currentDistance = (() => {
    if (!current || !profile) return null;
    const { homeLat, homeLng } = profile;
    const { addressLat, addressLng } = current;
    if (homeLat != null && homeLng != null && addressLat != null && addressLng != null) {
      return formatDistance(haversineKm(homeLat, homeLng, addressLat, addressLng));
    }
    return null;
  })();

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
        <p className="text-[var(--app-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-[var(--app-text)]">Current Task</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">Availability</span>
          <div className="flex rounded-xl border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-1">
            <button
              type="button"
              onClick={() => handleSetAvailability('ONLINE')}
              disabled={availabilityLoading}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                availability === 'ONLINE'
                  ? 'bg-[var(--app-online)] text-white shadow-md'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              ONLINE
            </button>
            <button
              type="button"
              onClick={() => handleSetAvailability('OFFLINE')}
              disabled={availabilityLoading}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                availability === 'OFFLINE'
                  ? 'bg-[var(--app-offline)] text-[var(--app-text)] shadow-md'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              OFFLINE
            </button>
          </div>
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
          distanceLine={currentDistance}
        />
      ) : (
        <Card className="rounded-xl border-[var(--app-border)] bg-[var(--app-surface)]">
          <CardContent className="py-16 text-center text-[var(--app-text-muted)]">
            <p className="text-lg font-medium">No tasks assigned</p>
            <p className="mt-1 text-sm">You'll see new jobs here when your merchant assigns them.</p>
          </CardContent>
        </Card>
      )}

      {orders.length > 1 && (
        <>
          <h2 className="mt-10 mb-4 text-base font-semibold text-[var(--app-text)]">All Assigned</h2>
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Card
                  className="rounded-xl border-[var(--app-border)] bg-[var(--app-surface)] cursor-pointer hover:border-[var(--app-primary)] transition-colors"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-[var(--app-text)]">{order.address}</p>
                        <p className="text-sm text-[var(--app-text-muted)]">{order.status}</p>
                      </div>
                      <span className="text-sm font-medium text-[var(--app-primary)]">View →</span>
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
