import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DevToolsAccordion } from '../components/DevToolsAccordion';
import { CompletionProofSection } from '../components/CompletionProofSection';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';
import type { Order, CompletionProof } from '@home-services/shared';

interface MerchantSummary {
  id: string;
  displayName: string;
}

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
  const [eligibleMerchants, setEligibleMerchants] = useState<MerchantSummary[]>([]);
  const [eligibleMerchantsLoading, setEligibleMerchantsLoading] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');
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
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load orders', err.message);
      })
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

  const closeDrawer = () => {
    setSearchParams({});
    setSelectedMerchantId('');
    setEligibleMerchants([]);
  };

  useEffect(() => {
    if (!openId || !selectedOrder) return;
    if (selectedOrder.status !== 'PLACED') return;
    setEligibleMerchantsLoading(true);
    api<MerchantSummary[]>(`/admin/orders/${openId}/eligible-merchants`)
      .then((list) => {
        setEligibleMerchants(list);
        setSelectedMerchantId(list.length > 0 ? list[0].id : '');
      })
      .catch(() => setEligibleMerchants([]))
      .finally(() => setEligibleMerchantsLoading(false));
  }, [openId, selectedOrder?.id, selectedOrder?.status, api]);

  const fetchProof = async (orderId: string) => {
    try {
      return await api<CompletionProof>(`/admin/orders/${orderId}/completion-proof`);
    } catch {
      return null;
    }
  };

  const handleAssignMerchant = async () => {
    if (!selectedOrder || !selectedMerchantId) return;
    setAssignLoading(true);
    try {
      const updated = await api<Order>(`/admin/orders/${selectedOrder.id}/assign-merchant`, {
        method: 'POST',
        body: JSON.stringify({ merchantId: selectedMerchantId }),
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
        <p className="text-[var(--app-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-[var(--app-text)] tracking-tight">Orders</h2>
        <select
          value={statusFilter}
          onChange={(e) => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('status', e.target.value || ''); return n; })}
          className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs text-[var(--app-text)]"
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
          className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs text-[var(--app-text)] w-44 placeholder:text-[var(--app-text-muted)]"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--app-border)] bg-[var(--app-surface-alt)]">
              <th className="px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">Order ID</th>
              <th className="px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">Status</th>
              <th className="px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">Merchant</th>
              <th className="px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">Worker</th>
              <th className="px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">Address</th>
              <th className="px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">Scheduled</th>
              <th className="px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">Created</th>
              <th className="px-3 py-2 text-left font-medium text-[var(--app-text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[var(--app-text-muted)]">No orders match.</td>
              </tr>
            ) : filtered.map((order) => (
              <tr
                key={order.id}
                className="border-b border-[var(--app-border)] hover:bg-[var(--app-nav-hover)]"
              >
                <td className="px-3 py-2 font-mono text-[var(--app-text-muted)]">{order.id.slice(0, 8)}…</td>
                <td className="px-3 py-2">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-3 py-2 text-[var(--app-text-muted)]">{order.merchantId ? 'Assigned' : 'Unassigned'}</td>
                <td className="px-3 py-2 text-[var(--app-text-muted)]">{order.workerId ? '—' : '—'}</td>
                <td className="px-3 py-2 text-[var(--app-text)] truncate max-w-[160px]">{order.address}</td>
                <td className="px-3 py-2 text-[var(--app-text-muted)]">{formatScheduled(order.scheduledAt)}</td>
                <td className="px-3 py-2 text-[var(--app-text-muted)]">{formatDate(order.createdAt)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setSearchParams({ open: order.id })}
                    className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] font-medium"
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
              <span className="font-medium text-[var(--app-text)]">{selectedOrder.serviceNameSnapshot}</span>
            </div>
            <p className="text-sm text-[var(--app-text-muted)]">{formatCurrency(selectedOrder.priceCents)} · {selectedOrder.durationMinutesSnapshot} min</p>
            <p className="text-sm font-medium text-[var(--app-text)]">Scheduled: {formatScheduled(selectedOrder.scheduledAt)}</p>
            <p className="text-[var(--app-text)]">{selectedOrder.address}</p>
            {selectedOrder.notes && <p className="text-sm text-[var(--app-text-muted)]">Notes: {selectedOrder.notes}</p>}
            {selectedOrder.cancelReason && <p className="text-sm text-[var(--app-text-muted)]">Cancel reason: {selectedOrder.cancelReason}</p>}
            <p className="text-sm text-[var(--app-text-muted)]">Created {formatDate(selectedOrder.createdAt)}</p>

            {selectedOrder.status === 'PLACED' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Assign to merchant</label>
                  {eligibleMerchantsLoading ? (
                    <p className="text-sm text-neutral-500">Loading merchants…</p>
                  ) : eligibleMerchants.length === 0 ? (
                    <p className="text-sm text-amber-600">No merchants offer this service ({selectedOrder.serviceNameSnapshot}).</p>
                  ) : (
                    <select
                      value={selectedMerchantId}
                      onChange={(e) => setSelectedMerchantId(e.target.value)}
                      className="w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)]"
                    >
                      {eligibleMerchants.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <Button
                  onClick={handleAssignMerchant}
                  disabled={assignLoading || eligibleMerchantsLoading || eligibleMerchants.length === 0}
                >
                  {assignLoading ? 'Assigning…' : 'Assign merchant'}
                </Button>
              </div>
            )}
            {selectedOrder.status !== 'CLOSED' && (
              <Button variant="destructive" onClick={handleCancelClick} disabled={cancelLoading}>
                Cancel order
              </Button>
            )}

            {(selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'CLOSED') && (
              <CompletionProofSection
                orderId={selectedOrder.id}
                status={selectedOrder.status}
                fetchProof={fetchProof}
              />
            )}

            <div className="pt-4 border-t border-[var(--app-border)]">
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
