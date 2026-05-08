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

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
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

  return (
    <div className="max-w-5xl">
      <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4">Payments</h2>

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
                    {p.paidAt && <p>Paid: {formatDate(p.paidAt)}</p>}
                    {p.stripePaymentIntentId && (
                      <p className="truncate">Intent: <span className="font-mono">{p.stripePaymentIntentId}</span></p>
                    )}
                    {p.refundedAmountCents && (
                      <p>Refunded: {formatCurrency(p.refundedAmountCents)} on {formatDate(p.refundedAt ?? '')}</p>
                    )}
                    {p.stripeRefundId && (
                      <p className="truncate">Refund ID: <span className="font-mono">{p.stripeRefundId}</span></p>
                    )}
                  </div>

                  {p.paymentStatus === 'PAID' && (
                    <div className="mt-3">
                      {refundingId === p.orderId ? (
                        <div className="flex flex-wrap items-end gap-2">
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
