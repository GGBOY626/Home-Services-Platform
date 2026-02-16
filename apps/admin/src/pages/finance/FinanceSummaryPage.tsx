import { useEffect, useState } from 'react';
import { useApi } from '../../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { formatCurrency } from '../../lib/format';
import type { FinanceSummaryDTO } from '@home-services/shared';

function dateToParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function FinanceSummaryPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [summary, setSummary] = useState<FinanceSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => dateToParam(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => dateToParam(new Date()));

  useEffect(() => {
    setLoading(true);
    api<FinanceSummaryDTO>(`/admin/finance/summary?from=${from}&to=${to}`)
      .then(setSummary)
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load summary', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast, from, to]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Finance Summary</h2>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-neutral-300 px-2 py-1.5" />
        </label>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl border-neutral-200">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-neutral-500">Total Gross</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{formatCurrency(summary.totalGrossCents)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-neutral-200">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-neutral-500">Platform Fee (Revenue)</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{formatCurrency(summary.totalPlatformFeeCents)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-neutral-200">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-neutral-500">Merchant Net</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{formatCurrency(summary.totalMerchantNetCents)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-neutral-200">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-neutral-500">Ledger Count</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{summary.ledgerCount}</p>
              <p className="mt-1 text-xs text-neutral-500">Paid: {summary.paidCount} · Ready: {summary.readyCount}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
