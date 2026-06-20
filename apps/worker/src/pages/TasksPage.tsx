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
  const pendingCount = orders.filter((o) => o.status === 'WORKER_ASSIGNED').length;
  const acceptedCount = orders.filter((o) => o.status === 'ACCEPTED').length;

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
        <p style={{ color: 'var(--app-text-muted)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Welcome & status bar */}
      <div
        className="rounded-2xl p-5 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, var(--app-primary), var(--app-primary-hover))',
          color: '#ffffff',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">👋 Hello, {profile?.displayName || 'Worker'}</p>
            <p className="mt-1 text-xl font-bold text-white">
              {availability === 'ONLINE' ? '🟢 Ready to work' : '🔴 You are offline'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black">{orders.length}</p>
            <p className="text-xs text-white/70">Total orders</p>
          </div>
        </div>

        {/* Availability toggle */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
            Status
          </span>
          <div
            className="flex rounded-xl p-1"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <button
              type="button"
              onClick={() => handleSetAvailability('ONLINE')}
              disabled={availabilityLoading}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                availability === 'ONLINE'
                  ? 'bg-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
              style={availability === 'ONLINE' ? { color: 'var(--app-primary)' } : {}}
            >
              ONLINE
            </button>
            <button
              type="button"
              onClick={() => handleSetAvailability('OFFLINE')}
              disabled={availabilityLoading}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                availability === 'OFFLINE'
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              OFFLINE
            </button>
          </div>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black" style={{ color: 'var(--app-primary)' }}>{pendingCount}</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--app-text-muted)' }}>⏳ Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-black" style={{ color: 'var(--app-accent)' }}>{acceptedCount}</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--app-text-muted)' }}>✅ Accepted</p>
          </CardContent>
        </Card>
      </div>

      {/* Current task */}
      <div>
        <h2 className="mb-3 text-base font-bold" style={{ color: 'var(--app-text)' }}>
          📍 Current Task
        </h2>
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
          <Card>
            <CardContent className="py-12 text-center">
              <span className="text-4xl">📭</span>
              <p className="mt-3 text-base font-semibold" style={{ color: 'var(--app-text)' }}>
                No tasks assigned
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--app-text-muted)' }}>
                New jobs will appear here when your merchant assigns them.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* All assigned orders */}
      {orders.length > 1 && (
        <div>
          <h2 className="mb-3 text-base font-bold" style={{ color: 'var(--app-text)' }}>
            📋 All Assigned ({orders.length})
          </h2>
          <div className="space-y-3">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--app-text)' }}>
                        {order.address}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--app-primary-light)',
                            color: 'var(--app-primary)',
                          }}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                          {order.serviceNameSnapshot}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold shrink-0 ml-3" style={{ color: 'var(--app-primary)' }}>
                      View →
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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
