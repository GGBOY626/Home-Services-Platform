import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { Drawer } from '@home-services/ui';
import { KpiCard } from '../components/KpiCard';
import { formatCurrency, formatDate } from '../lib/format';
import type { FinanceSummaryDTO, PayoutLedgerDTO, LedgerStatus } from '@home-services/shared';

function dateToParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function FinancePage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [summary, setSummary] = useState<FinanceSummaryDTO | null>(null);
  const [ledgers, setLedgers] = useState<PayoutLedgerDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<LedgerStatus | ''>('');
  const [from, setFrom] = useState(() => dateToParam(new Date(Date.now() - 7 * 86400000)));
  const [to, setTo] = useState(() => dateToParam(new Date()));
  const [drawerLedger, setDrawerLedger] = useState<PayoutLedgerDTO | null>(null);

  const load = () => {
    setLoading(true);
    const statusParam = status ? `&status=${status}` : '';
    Promise.all([
      api<FinanceSummaryDTO>(`/merchant/finance/summary?from=${from}&to=${to}${statusParam}`),
      api<{ content: PayoutLedgerDTO[] }>(`/merchant/finance/ledgers?from=${from}&to=${to}${statusParam}&page=0&size=100`),
    ])
      .then(([s, p]) => {
        setSummary(s);
        setLedgers(p.content || []);
      })
      .catch((err) => addToast('error', 'Failed to load finance data', err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [from, to, status, api, addToast]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Finance</h2>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1.5"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1.5"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LedgerStatus | '')}
            className="rounded-lg border border-neutral-300 px-2 py-1.5"
          >
            <option value="">All</option>
            <option value="READY">READY</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard title="Total Gross" value={formatCurrency(summary.totalGrossCents)} />
            <KpiCard title="Platform Fee" value={formatCurrency(summary.totalPlatformFeeCents)} />
            <KpiCard title="Net Earnings" value={formatCurrency(summary.totalMerchantNetCents)} />
          </div>

          <Card className="rounded-2xl border-neutral-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Order ID</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Gross</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Platform Fee</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Net</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Calculated At</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">No ledgers in range.</td>
                      </tr>
                    ) : (
                      ledgers.map((l) => (
                        <tr
                          key={l.id}
                          className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50"
                          onClick={() => setDrawerLedger(l)}
                        >
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
                          <td className="px-4 py-3 text-neutral-600">{l.paidAt ? formatDate(l.paidAt) : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      <Drawer
        open={!!drawerLedger}
        onOpenChange={(open) => !open && setDrawerLedger(null)}
        title={drawerLedger ? `Ledger ${drawerLedger.id}` : ''}
        side="right"
      >
        {drawerLedger && (
          <div className="space-y-4">
            <p><span className="font-medium text-neutral-600">Order ID:</span> <span className="font-mono">{drawerLedger.orderId}</span></p>
            <p><span className="font-medium text-neutral-600">Gross:</span> {formatCurrency(drawerLedger.grossAmountCents)}</p>
            <p><span className="font-medium text-neutral-600">Platform Fee:</span> {formatCurrency(drawerLedger.platformFeeCents)}</p>
            <p><span className="font-medium text-neutral-600">Net:</span> {formatCurrency(drawerLedger.merchantNetCents)}</p>
            <p><span className="font-medium text-neutral-600">Status:</span> {drawerLedger.status}</p>
            <p><span className="font-medium text-neutral-600">Calculated At:</span> {formatDate(drawerLedger.calculatedAt)}</p>
            <p><span className="font-medium text-neutral-600">Paid At:</span> {drawerLedger.paidAt ? formatDate(drawerLedger.paidAt) : '—'}</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
