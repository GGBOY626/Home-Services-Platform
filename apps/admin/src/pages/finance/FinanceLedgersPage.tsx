import { useEffect, useState } from 'react';
import { useApi } from '../../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { formatCurrency, formatDate } from '../../lib/format';
import type { PayoutLedgerDTO, LedgerStatus } from '@home-services/shared';

function dateToParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function FinanceLedgersPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [ledgers, setLedgers] = useState<PayoutLedgerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LedgerStatus | ''>('');
  const [from, setFrom] = useState(() => dateToParam(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => dateToParam(new Date()));
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);
  const [markPaidLoading, setMarkPaidLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const statusParam = status ? `&status=${status}` : '';
    api<{ content: PayoutLedgerDTO[] }>(`/admin/finance/ledgers?from=${from}&to=${to}${statusParam}&page=0&size=100`)
      .then((p) => setLedgers(p.content || []))
      .catch((err) => addToast('error', 'Failed to load ledgers', err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [from, to, status, api, addToast]);

  const handleMarkPaid = async () => {
    if (markPaidId == null) return;
    setMarkPaidLoading(true);
    try {
      const updated = await api<PayoutLedgerDTO>(`/admin/finance/ledgers/${markPaidId}/mark-paid`, { method: 'POST' });
      setLedgers((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      addToast('success', 'Ledger marked as PAID');
      setMarkPaidId(null);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setMarkPaidLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Ledgers</h2>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as LedgerStatus | '')} className="rounded-lg border border-neutral-300 px-2 py-1.5">
            <option value="">All</option>
            <option value="READY">READY</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : (
        <Card className="rounded-xl border-neutral-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Order ID</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Gross</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Fee</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Net</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Calculated</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">No ledgers.</td>
                    </tr>
                  ) : (
                    ledgers.map((l) => (
                      <tr key={l.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 font-mono">{l.id}</td>
                        <td className="px-4 py-3 font-mono text-neutral-600">{l.orderId.slice(0, 8)}…</td>
                        <td className="px-4 py-3">{formatCurrency(l.grossAmountCents)}</td>
                        <td className="px-4 py-3">{formatCurrency(l.platformFeeCents)}</td>
                        <td className="px-4 py-3">{formatCurrency(l.merchantNetCents)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            l.status === 'PAID' ? 'bg-green-100 text-green-800' :
                            l.status === 'READY' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{formatDate(l.calculatedAt)}</td>
                        <td className="px-4 py-3">
                          {l.status === 'READY' && (
                            <Button size="sm" variant="outline" onClick={() => setMarkPaidId(l.id)}>
                              Mark as Paid
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={markPaidId !== null}
        onOpenChange={(open) => !open && setMarkPaidId(null)}
        title="Mark as paid"
        description="This will set the ledger status to PAID and record the paid date (mock payout)."
        confirmLabel="Mark paid"
        onConfirm={handleMarkPaid}
        loading={markPaidLoading}
      />
    </div>
  );
}
