import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DevToolsAccordion } from '../components/DevToolsAccordion';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';
import type { Order } from '@home-services/shared';

const MERCHANT_ID = 'b0000000-0000-0000-0000-000000000001';

interface PageRes {
  content: Order[];
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const statusFilter = searchParams.get('status') || '';
  const query = searchParams.get('q') || '';
  const { api } = useApi();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [timeoutJobLoading, setTimeoutJobLoading] = useState(false);

  const selectedOrder = orders.find((o) => o.id === openId) || null;
  const drawerOpen = !!openId;

  useEffect(() => {
    api<PageRes>('/admin/orders?page=0&size=100')
      .then((data) => setOrders(data.content))
      .catch((err) => addToast('error', 'Failed to load orders', err.message))
      .finally(() => setLoading(false));
  }, [api, addToast]);

  let filtered = orders;
  if (statusFilter) filtered = filtered.filter((o) => o.status === statusFilter);
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (o) => o.id.toLowerCase().includes(q) || o.address.toLowerCase().includes(q)
    );
  }

  const closeDrawer = () => setSearchParams({});

  const handleAssignMerchant = async () => {
    if (!selectedOrder) return;
    setAssignLoading(true);
    try {
      const updated = await api<Order>(`/admin/orders/${selectedOrder.id}/assign-merchant`, {
        method: 'POST',
        body: JSON.stringify({ merchantId: MERCHANT_ID }),
      });
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updated : o)));
      addToast('success', 'Merchant assigned');
      closeDrawer();
    } catch (err) {
      addToast('error', 'Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleCancelClick = () => {
    if (selectedOrder) {
      setCancelOrderId(selectedOrder.id);
      setCancelReason('');
      setCancelOpen(true);
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelOrderId) return;
    setCancelLoading(true);
    try {
      const updated = await api<Order>(`/admin/orders/${cancelOrderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      setOrders((prev) => prev.map((o) => (o.id === cancelOrderId ? updated : o)));
      setCancelOpen(false);
      setCancelOrderId(null);
      closeDrawer();
      addToast('success', 'Order cancelled');
    } catch (err) {
      addToast('error', 'Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRunTimeoutJob = async () => {
    setTimeoutJobLoading(true);
    try {
      const result = await api<{ merchantAssignExpired: number; workerAcceptRollback: number }>(
        '/admin/jobs/run-timeouts',
        { method: 'POST' }
      );
      addToast('success', 'Timeout job run', `Expired: ${result.merchantAssignExpired}, Rollback: ${result.workerAcceptRollback}`);
      setOrders((prev) => prev.map((o) => o)); // trigger refetch by re-requesting
      api<PageRes>('/admin/orders?page=0&size=100').then((data) => setOrders(data.content));
    } catch (err) {
      addToast('error', 'Job failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTimeoutJobLoading(false);
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-semibold text-neutral-900">Orders</h2>
        <select
          value={statusFilter}
          onChange={(e) => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('status', e.target.value || ''); return n; })}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PLACED">PLACED</option>
          <option value="MERCHANT_ASSIGNED">MERCHANT_ASSIGNED</option>
          <option value="WORKER_ASSIGNED">WORKER_ASSIGNED</option>
          <option value="ACCEPTED">ACCEPTED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="EXPIRED">EXPIRED</option>
        </select>
        <input
          type="search"
          placeholder="Search ID or address"
          value={query}
          onChange={(e) => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('q', e.target.value); return n; })}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm w-48"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-3 py-2 text-left font-medium text-neutral-700">Order ID</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-700">Status</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-700">Merchant</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-700">Worker</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-700">Address</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-700">Scheduled</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-700">Created</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-500">No orders match.</td>
              </tr>
            ) : filtered.map((order) => (
              <tr
                key={order.id}
                className="border-b border-neutral-100 hover:bg-neutral-50"
              >
                <td className="px-3 py-2 font-mono text-neutral-600">{order.id.slice(0, 8)}…</td>
                <td className="px-3 py-2">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-3 py-2 text-neutral-600">{order.merchantId ? 'Assigned' : 'Unassigned'}</td>
                <td className="px-3 py-2 text-neutral-600">{order.workerId ? '—' : '—'}</td>
                <td className="px-3 py-2 text-neutral-900 truncate max-w-[160px]">{order.address}</td>
                <td className="px-3 py-2 text-neutral-600">{formatScheduled(order.scheduledAt)}</td>
                <td className="px-3 py-2 text-neutral-500">{formatDate(order.createdAt)}</td>
                <td className="px-3 py-2">
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

      <Drawer open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()} title={selectedOrder ? `Order ${selectedOrder.id.slice(0, 8)}…` : ''} side="right">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedOrder.status} />
              <span className="font-medium text-neutral-700">{selectedOrder.serviceNameSnapshot}</span>
            </div>
            <p className="text-sm text-neutral-600">{formatCurrency(selectedOrder.priceCents)} · {selectedOrder.durationMinutesSnapshot} min</p>
            <p className="text-sm font-medium text-neutral-700">Scheduled: {formatScheduled(selectedOrder.scheduledAt)}</p>
            <p className="text-neutral-900">{selectedOrder.address}</p>
            {selectedOrder.notes && <p className="text-sm text-neutral-600">Notes: {selectedOrder.notes}</p>}
            {selectedOrder.cancelReason && <p className="text-sm text-neutral-500">Cancel reason: {selectedOrder.cancelReason}</p>}
            <p className="text-sm text-neutral-500">Created {formatDate(selectedOrder.createdAt)}</p>

            {selectedOrder.status === 'PLACED' && (
              <Button onClick={handleAssignMerchant} disabled={assignLoading}>
                {assignLoading ? 'Assigning…' : 'Assign to Demo Merchant'}
              </Button>
            )}
            {selectedOrder.status !== 'CLOSED' && (
              <Button variant="destructive" onClick={handleCancelClick} disabled={cancelLoading}>
                Cancel order
              </Button>
            )}

            <div className="pt-4 border-t border-neutral-200">
              <DevToolsAccordion onRunTimeoutJob={handleRunTimeoutJob} loading={timeoutJobLoading} />
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel order"
        description="This order will be marked as CANCELLED."
        confirmLabel="Confirm cancel"
        variant="destructive"
        reasonLabel="Reason (optional)"
        reasonPlaceholder="e.g. Customer request"
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
      />
    </div>
  );
}
