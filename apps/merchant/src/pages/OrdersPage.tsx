import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';
import { StatusBadge } from '../components/StatusBadge';
import { OrderDrawer } from '../components/OrderDrawer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Link } from 'react-router-dom';
import { formatDate, formatCurrency, formatScheduled, haversineKm, formatDistance, api as sharedApi } from '@home-services/shared';
import type { Order, WorkerSummary, MerchantMeResponse } from '@home-services/shared';

interface PageRes {
  content: Order[];
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const { api } = useApi();
  const { token } = useAuth();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [merchantMe, setMerchantMe] = useState<MerchantMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  const selectedOrder = orders.find((o) => o.id === openId) || null;
  const drawerOpen = !!openId;

  useEffect(() => {
    Promise.all([
      api<PageRes>('/merchant/orders?page=0&size=50'),
      api<WorkerSummary[]>('/merchant/workers?availability=ONLINE'),
      sharedApi<MerchantMeResponse>('/merchant/me', { token }),
    ])
      .then(([ordersRes, workersRes, meRes]) => {
        setOrders([...ordersRes.content].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setWorkers(Array.isArray(workersRes) ? workersRes : []);
        setMerchantMe(meRes);
      })
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast, token]);

  const closeDrawer = () => setSearchParams({});

  const fetchProof = async (orderId: string) => {
    try {
      return await api<import('@home-services/shared').CompletionProof>(`/merchant/orders/${orderId}/completion-proof`);
    } catch {
      return null;
    }
  };

  const handleAssignWorker = async (workerId: string) => {
    if (!selectedOrder) return;
    setAssignLoading(true);
    try {
      const updated = await api<Order>(`/merchant/orders/${selectedOrder.id}/assign-worker`, {
        method: 'POST',
        body: JSON.stringify({ workerId }),
      });
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updated : o)));
      addToast('success', 'Worker assigned');
      closeDrawer();
    } catch (err) {
      addToast('error', 'Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRejectClick = () => {
    if (selectedOrder) {
      setRejectOrderId(selectedOrder.id);
      setRejectOpen(true);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectOrderId) return;
    setRejectLoading(true);
    try {
      const updated = await api<Order>(`/merchant/orders/${rejectOrderId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      setOrders((prev) => prev.map((o) => (o.id === rejectOrderId ? updated : o)));
      setRejectOpen(false);
      setRejectOrderId(null);
      closeDrawer();
      addToast('success', 'Order rejected');
    } catch (err) {
      addToast('error', 'Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRejectLoading(false);
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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Orders</h2>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Order ID</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Service</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Address</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Distance</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Scheduled</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Created</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-neutral-100 hover:bg-neutral-50"
              >
                <td className="px-4 py-3 font-mono text-neutral-600">{order.id.slice(0, 8)}…</td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-neutral-700">{order.serviceNameSnapshot} · {formatCurrency(order.priceCents)}</td>
                <td className="px-4 py-3 text-neutral-900 truncate max-w-[180px]">{order.address}</td>
                <td className="px-4 py-3 text-sm">
                  {merchantMe?.businessLat != null && merchantMe?.businessLng != null && order.addressLat != null && order.addressLng != null ? (
                    <span className="text-blue-600 font-medium">
                      📍 {formatDistance(haversineKm(merchantMe.businessLat, merchantMe.businessLng, order.addressLat, order.addressLng))}
                    </span>
                  ) : merchantMe?.businessLat == null ? (
                    <Link to="/settings" className="text-amber-600 text-xs hover:underline">Set address</Link>
                  ) : (
                    <span className="text-neutral-400 text-xs">No coordinates</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-600">{formatScheduled(order.scheduledAt)}</td>
                <td className="px-4 py-3 text-neutral-500">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSearchParams({ open: order.id })}
                    className="text-neutral-600 hover:text-neutral-900 font-medium"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OrderDrawer
        open={drawerOpen}
        onOpenChange={(open) => !open && closeDrawer()}
        order={selectedOrder}
        workers={workers}
        onAssignWorker={handleAssignWorker}
        onRejectClick={handleRejectClick}
        assignLoading={assignLoading}
        fetchProof={fetchProof}
      />

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject order"
        description="Order will return to PLACED. Optional reason below."
        confirmLabel="Confirm reject"
        variant="destructive"
        reasonLabel="Reason (optional)"
        reasonPlaceholder="e.g. Cannot fulfil"
        onConfirm={handleRejectConfirm}
        loading={rejectLoading}
      />
    </div>
  );
}
