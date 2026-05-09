import { useEffect, useState } from 'react';
import type { RefundRequestDTO, RefundRequestStatus } from '@home-services/shared';
import { formatCurrency, formatDate } from '@home-services/shared';
import { Card, CardContent, Button } from '@home-services/ui';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';

const STATUS_STYLE: Record<RefundRequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-600',
};

interface Page<T> { content: T[]; totalElements: number; totalPages: number; number: number; }

export function RefundRequestsPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [page, setPage] = useState<Page<RefundRequestDTO> | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<RefundRequestStatus | ''>('PENDING');
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  const load = () => {
    setLoading(true);
    const q = statusFilter ? `&status=${statusFilter}` : '';
    api<Page<RefundRequestDTO>>(`/admin/refund-requests?page=${currentPage}&size=20${q}`)
      .then(setPage)
      .catch(() => addToast('error', 'Failed to load refund requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentPage, statusFilter]);

  const handleApprove = async (req: RefundRequestDTO) => {
    const amountCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;
    try {
      await api(`/admin/refund-requests/${req.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: adminNote || null, refundAmountCents: amountCents ?? null }),
      });
      addToast('success', 'Refund approved and payment returned to customer.');
      setDecidingId(null); setAdminNote(''); setRefundAmount('');
      load();
    } catch (err) {
      addToast('error', 'Approve failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleReject = async (req: RefundRequestDTO) => {
    try {
      await api(`/admin/refund-requests/${req.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: adminNote || null }),
      });
      addToast('success', 'Refund request rejected.');
      setDecidingId(null); setAdminNote(''); setRefundAmount('');
      load();
    } catch (err) {
      addToast('error', 'Reject failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Refund Requests</h2>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as RefundRequestStatus | ''); setCurrentPage(0); }}
          className="rounded border border-[var(--app-border)] px-2 py-1 text-xs text-[var(--app-text)]"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {loading && <p className="text-sm text-[var(--app-text-muted)]">Loading…</p>}

      {!loading && page && page.content.length === 0 && (
        <p className="text-sm text-[var(--app-text-muted)]">No refund requests found.</p>
      )}

      {!loading && page && page.content.map((req) => (
        <Card key={req.id} className="rounded-xl border-[var(--app-border)] mb-3">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--app-text)]">
                  {req.serviceNameSnapshot ?? 'Order'}
                  {req.priceCents && <span className="ml-2 font-semibold">{formatCurrency(req.priceCents)}</span>}
                </p>
                <p className="text-xs text-[var(--app-text-muted)] font-mono mt-0.5">{req.orderId}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[req.status]}`}>
                {req.status}
              </span>
            </div>

            {req.reason && (
              <p className="mt-2 text-sm text-[var(--app-text)]">
                <span className="font-medium">Customer reason: </span>{req.reason}
              </p>
            )}
            {req.adminNote && (
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                <span className="font-medium">Admin note: </span>{req.adminNote}
              </p>
            )}

            <p className="mt-2 text-xs text-[var(--app-text-muted)]">Submitted {formatDate(req.createdAt)}</p>
            {req.decidedAt && <p className="text-xs text-[var(--app-text-muted)]">Decided {formatDate(req.decidedAt)}</p>}

            {req.status === 'PENDING' && (
              <div className="mt-3">
                {decidingId === req.id ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <div>
                        <label className="block text-xs text-[var(--app-text-muted)] mb-1">Refund amount NZD (blank = full)</label>
                        <input
                          type="number" min="0.01" step="0.01"
                          value={refundAmount}
                          onChange={(e) => setRefundAmount(e.target.value)}
                          placeholder={req.priceCents ? `Max ${(req.priceCents / 100).toFixed(2)}` : ''}
                          className="rounded border border-[var(--app-border)] px-2 py-1 text-xs text-[var(--app-text)] w-36"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--app-text-muted)] mb-1">Admin note (optional)</label>
                        <input
                          type="text" value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
                          placeholder="Reason for decision"
                          className="rounded border border-[var(--app-border)] px-2 py-1 text-xs text-[var(--app-text)] w-52"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(req)}>Approve & Refund</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(req)}>Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => { setDecidingId(null); setAdminNote(''); setRefundAmount(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setDecidingId(req.id)}>
                    Review
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {page && page.totalPages > 1 && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-[var(--app-text-muted)] self-center">Page {currentPage + 1} of {page.totalPages}</span>
          <Button size="sm" variant="outline" disabled={currentPage >= page.totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
