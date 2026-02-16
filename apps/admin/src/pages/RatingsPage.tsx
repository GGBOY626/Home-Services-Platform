import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { formatDate } from '../lib/format';
import type { RatingDTO, RatingSummaryDTO } from '@home-services/shared';

function toIsoStart(d: string): string {
  return d ? new Date(d + 'T00:00:00').toISOString() : '';
}
function toIsoEnd(d: string): string {
  return d ? new Date(d + 'T23:59:59.999').toISOString() : '';
}

export function RatingsPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [summary, setSummary] = useState<RatingSummaryDTO | null>(null);
  const [ratings, setRatings] = useState<RatingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = () => {
    setLoading(true);
    const fromIso = toIsoStart(from);
    const toIsoStr = toIsoEnd(to);
    const params = new URLSearchParams();
    if (merchantId) params.set('merchantId', merchantId);
    if (workerId) params.set('workerId', workerId);
    if (fromIso) params.set('from', fromIso);
    if (toIsoStr) params.set('to', toIsoStr);
    params.set('page', '0');
    params.set('size', '50');
    const qs = params.toString();
    const summaryParams = new URLSearchParams();
    if (fromIso) summaryParams.set('from', fromIso);
    if (toIsoStr) summaryParams.set('to', toIsoStr);
    const summaryQs = summaryParams.toString();
    Promise.all([
      api<RatingSummaryDTO>(`/admin/ratings/summary${summaryQs ? '?' + summaryQs : ''}`),
      api<{ content: RatingDTO[] }>(`/admin/ratings?${qs}`),
    ])
      .then(([s, p]) => {
        setSummary(s);
        setRatings(p.content || []);
      })
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load ratings', err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [from, to, merchantId, workerId, api, addToast]);

  const total = summary?.totalCount ?? 0;
  const avg = summary?.averageStars ?? 0;
  const dist = summary?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Ratings</h1>

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
          Merchant ID
          <input
            type="text"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            placeholder="UUID (optional)"
            className="rounded-lg border border-neutral-300 px-2 py-1.5 w-64 font-mono text-xs"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          Worker ID
          <input
            type="text"
            value={workerId}
            onChange={(e) => setWorkerId(e.target.value)}
            placeholder="UUID (optional)"
            className="rounded-lg border border-neutral-300 px-2 py-1.5 w-64 font-mono text-xs"
          />
        </label>
      </div>

      {loading && <p className="text-neutral-500">Loading…</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="rounded-xl border-neutral-200">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-neutral-500">Platform average</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">{total > 0 ? avg.toFixed(1) : '—'}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-neutral-200">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-neutral-500">Total ratings</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">{String(total)}</p>
              </CardContent>
            </Card>
          </div>

          {total > 0 && (
            <Card className="rounded-xl border-neutral-200">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-neutral-700 mb-3">Star distribution</p>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const cnt = dist[s] ?? 0;
                    const pct = total > 0 ? (cnt / total) * 100 : 0;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className="w-8 text-sm text-neutral-600">{s}★</span>
                        <div className="flex-1 h-5 bg-neutral-100 rounded overflow-hidden">
                          <div className="h-full bg-amber-500 rounded" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-neutral-500 w-8">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <p className="text-sm font-medium text-neutral-700 p-4 border-b border-neutral-200">Ratings</p>
            {ratings.length === 0 ? (
              <p className="p-6 text-neutral-500 text-sm">No ratings match filters.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 font-medium text-neutral-700">Stars</th>
                    <th className="px-4 py-3 font-medium text-neutral-700">Comment</th>
                    <th className="px-4 py-3 font-medium text-neutral-700">Order</th>
                    <th className="px-4 py-3 font-medium text-neutral-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((r) => (
                    <tr key={r.id} className="border-b border-neutral-100">
                      <td className="px-4 py-3"><span className="text-amber-500">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span></td>
                      <td className="px-4 py-3 text-neutral-700 max-w-xs truncate">{r.comment || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-600">{r.orderId.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-neutral-500">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
