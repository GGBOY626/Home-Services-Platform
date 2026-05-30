import { useEffect, useState } from 'react';
import type { PaymentSummaryDTO, PaymentStatus } from '@home-services/shared';
import { formatCurrency, formatDate } from '@home-services/shared';
import { Card, CardContent, Button } from '@home-services/ui';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  UNPAID: 'bg-neutral-100 text-neutral-600',
  AWAITING: 'bg-blue-50 text-blue-700',
  PAID: 'bg-green-50 text-green-700',
  REFUNDED: 'bg-amber-50 text-amber-700',
  PARTIALLY_REFUNDED: 'bg-orange-50 text-orange-700',
  FAILED: 'bg-red-50 text-red-600',
};

const ACTION_COLORS: Record<string, string> = {
  FIXED_PAID: 'bg-green-50 text-green-700',
  FIXED_FAILED: 'bg-red-50 text-red-600',
  OK: 'bg-neutral-100 text-neutral-600',
  SKIPPED: 'bg-amber-50 text-amber-700',
};

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

interface PaymentEventLogDTO {
  id: number;
  orderId: string;
  eventType: string;
  oldStatus: string | null;
  newStatus: string;
  actor: string | null;
  stripeRef: string | null;
  amountCents: number | null;
  note: string | null;
  createdAt: string;
}

interface ReconciliationItem {
  orderId: string;
  stripeIntentId: string;
  stripeStatus: string;
  dbStatus: string;
  action: string;
}

interface ReconciliationResultDTO {
  ranAt: string;
  checkedCount: number;
  fixedCount: number;
  items: ReconciliationItem[];
}

export function PaymentsPage() {
  const { api: apiRequest } = useApi();
  const { addToast } = useToast();
  const [page, setPage] = useState<Page<PaymentSummaryDTO> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  // Reconciliation state
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<ReconciliationResultDTO | null>(null);

  // Payment events state
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderEvents, setOrderEvents] = useState<Record<string, PaymentEventLogDTO[]>>({});
  const [loadingEvents, setLoadingEvents] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiRequest<Page<PaymentSummaryDTO>>(`/admin/payments?page=${currentPage}&size=20`)
      .then(setPage)
      .catch(() => addToast('error', 'Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentPage]);

  const handleRefund = async (orderId: string, priceCents: number) => {
    const amountCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;
    if (amountCents !== undefined && (isNaN(amountCents) || amountCents <= 0 || amountCents > priceCents)) {
      addToast('error', 'Invalid refund amount');
      return;
    }
    try {
      await apiRequest(`/admin/payments/${orderId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amountCents: amountCents ?? null, reason: refundReason || null }),
      });
      addToast('success', 'Refund issued successfully');
      setRefundingId(null);
      setRefundAmount('');
      setRefundReason('');
      load();
    } catch (err) {
      addToast('error', 'Refund failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const result = await apiRequest<ReconciliationResultDTO>('/admin/payments/reconciliation', { method: 'POST' });
      setReconcileResult(result);
      if (result.fixedCount > 0) {
        addToast('success', `Reconciliation fixed ${result.fixedCount} order(s)`);
        load();
      } else {
        addToast('success', `Reconciliation complete — ${result.checkedCount} checked, no issues found`);
      }
    } catch {
      addToast('error', 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  const toggleEvents = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (orderEvents[orderId]) return;
    setLoadingEvents(orderId);
    try {
      const events = await apiRequest<PaymentEventLogDTO[]>(`/admin/payments/${orderId}/events`);
      setOrderEvents((prev) => ({ ...prev, [orderId]: events }));
    } catch {
      addToast('error', 'Failed to load payment events');
    } finally {
      setLoadingEvents(null);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Payments</h2>
        <Button size="sm" variant="outline" onClick={handleReconcile} disabled={reconciling}>
          {reconciling ? 'Running…' : 'Run Reconciliation'}
        </Button>
      </div>

      {reconcileResult && (
        <Card className="mb-5 rounded-xl border-[var(--app-border)]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[var(--app-text)]">
                Reconciliation Result
                <span className="ml-2 text-xs font-normal text-[var(--app-text-muted)]">
                  ran at {formatDate(reconcileResult.ranAt)}
                </span>
              </p>
              <div className="flex gap-3 text-xs">
                <span className="text-[var(--app-text-muted)]">Checked: <strong>{reconcileResult.checkedCount}</strong></span>
                <span className={reconcileResult.fixedCount > 0 ? 'text-green-700 font-semibold' : 'text-[var(--app-text-muted)]'}>
                  Fixed: {reconcileResult.fixedCount}
                </span>
              </div>
            </div>
            {reconcileResult.items.length === 0 ? (
              <p className="text-xs text-[var(--app-text-muted)]">No stale AWAITING orders found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--app-text-muted)] border-b border-[var(--app-border)]">
                      <th className="text-left pb-1 pr-3 font-medium">Order</th>
                      <th className="text-left pb-1 pr-3 font-medium">Stripe Intent</th>
                      <th className="text-left pb-1 pr-3 font-medium">Stripe Status</th>
                      <th className="text-left pb-1 pr-3 font-medium">DB Status</th>
                      <th className="text-left pb-1 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconcileResult.items.map((item) => (
                      <tr key={item.orderId} className="border-b border-[var(--app-border)] last:border-0">
                        <td className="py-1 pr-3 font-mono text-[var(--app-text-muted)]">{item.orderId.slice(0, 8)}…</td>
                        <td className="py-1 pr-3 font-mono text-[var(--app-text-muted)]">{item.stripeIntentId}</td>
                        <td className="py-1 pr-3 text-[var(--app-text)]">{item.stripeStatus}</td>
                        <td className="py-1 pr-3 text-[var(--app-text)]">{item.dbStatus}</td>
                        <td className="py-1">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[item.action] ?? 'bg-neutral-100 text-neutral-600'}`}>
                            {item.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-sm text-[var(--app-text-muted)]">Loading…</p>}

      {!loading && page && (
        <>
          <p className="text-sm text-[var(--app-text-muted)] mb-3">{page.totalElements} orders total</p>
          <div className="space-y-3">
            {page.content.map((p) => (
              <Card key={p.orderId} className="rounded-xl border-[var(--app-border)]">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--app-text)] truncate">{p.serviceNameSnapshot}</p>
                      <p className="text-xs text-[var(--app-text-muted)] mt-0.5 font-mono">{p.orderId}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.paymentStatus]}`}>
                        {p.paymentStatus.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-semibold text-[var(--app-text)]">{formatCurrency(p.priceCents)}</span>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-[var(--app-text-muted)]">
                    <p>Created: {formatDate(p.createdAt)}</p>
                    {p.paidAt && <p>Paid: {formatDate(p.paidAt)}</p>}
                    {p.stripePaymentIntentId && (
                      <p className="truncate col-span-2">Intent: <span className="font-mono">{p.stripePaymentIntentId}</span></p>
                    )}
                    {p.refundedAmountCents != null && (
                      <p>Refunded: {formatCurrency(p.refundedAmountCents)} on {formatDate(p.refundedAt ?? '')}</p>
                    )}
                    {p.stripeRefundId && (
                      <p className="truncate">Refund ID: <span className="font-mono">{p.stripeRefundId}</span></p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleEvents(p.orderId)}
                    >
                      {expandedOrderId === p.orderId ? 'Hide Events' : 'View Events'}
                    </Button>

                    {p.paymentStatus === 'PAID' && (
                      <>
                        {refundingId === p.orderId ? (
                          <div className="flex flex-wrap items-end gap-2 w-full mt-1">
                            <div>
                              <label className="block text-xs text-[var(--app-text-muted)] mb-1">Amount (NZD, blank = full refund)</label>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                                placeholder={`Max ${(p.priceCents / 100).toFixed(2)}`}
                                className="rounded border border-[var(--app-border)] px-2 py-1 text-xs text-[var(--app-text)] w-36"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[var(--app-text-muted)] mb-1">Reason (optional)</label>
                              <input
                                type="text"
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                placeholder="e.g. Service not provided"
                                className="rounded border border-[var(--app-border)] px-2 py-1 text-xs text-[var(--app-text)] w-48"
                              />
                            </div>
                            <Button size="sm" variant="destructive" onClick={() => handleRefund(p.orderId, p.priceCents)}>
                              Confirm Refund
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setRefundingId(null); setRefundAmount(''); setRefundReason(''); }}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setRefundingId(p.orderId)}>
                            Issue Refund
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {expandedOrderId === p.orderId && (
                    <div className="mt-3 border-t border-[var(--app-border)] pt-3">
                      {loadingEvents === p.orderId ? (
                        <p className="text-xs text-[var(--app-text-muted)]">Loading events…</p>
                      ) : orderEvents[p.orderId]?.length === 0 ? (
                        <p className="text-xs text-[var(--app-text-muted)]">No payment events recorded.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-[var(--app-text-muted)] border-b border-[var(--app-border)]">
                                <th className="text-left pb-1 pr-3 font-medium">Time</th>
                                <th className="text-left pb-1 pr-3 font-medium">Event</th>
                                <th className="text-left pb-1 pr-3 font-medium">Transition</th>
                                <th className="text-left pb-1 pr-3 font-medium">Actor</th>
                                <th className="text-left pb-1 pr-3 font-medium">Amount</th>
                                <th className="text-left pb-1 font-medium">Note</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(orderEvents[p.orderId] ?? []).map((ev) => (
                                <tr key={ev.id} className="border-b border-[var(--app-border)] last:border-0">
                                  <td className="py-1 pr-3 text-[var(--app-text-muted)] whitespace-nowrap">{formatDate(ev.createdAt)}</td>
                                  <td className="py-1 pr-3 font-mono font-medium text-[var(--app-text)]">{ev.eventType}</td>
                                  <td className="py-1 pr-3 text-[var(--app-text-muted)] whitespace-nowrap">
                                    {ev.oldStatus
                                      ? <>{ev.oldStatus.replace(/_/g, ' ')} → {ev.newStatus.replace(/_/g, ' ')}</>
                                      : ev.newStatus.replace(/_/g, ' ')}
                                  </td>
                                  <td className="py-1 pr-3 font-mono text-[var(--app-text-muted)] max-w-[140px] truncate">{ev.actor ?? '—'}</td>
                                  <td className="py-1 pr-3 text-[var(--app-text)]">
                                    {ev.amountCents != null ? formatCurrency(ev.amountCents) : '—'}
                                  </td>
                                  <td className="py-1 text-[var(--app-text-muted)] max-w-[200px] truncate">{ev.note ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {page.totalPages > 1 && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-[var(--app-text-muted)] self-center">
                Page {currentPage + 1} of {page.totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={currentPage >= page.totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
