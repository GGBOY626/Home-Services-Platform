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
    if (fromIso) params.set('from', fromIso);
    if (toIsoStr) params.set('to', toIsoStr);
    const qs = params.toString();
    const base = qs ? `?${qs}` : '';
    Promise.all([
      api<RatingSummaryDTO>(`/worker/ratings/summary${base}`),
      api<{ content: RatingDTO[] }>(`/worker/ratings${base ? base + '&' : '?'}page=0&size=50`),
    ])
      .then(([s, p]) => {
        setSummary(s);
        setRatings(p.content || []);
      })
      .catch((err) => addToast('error', 'Failed to load ratings', err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [from, to, api, addToast]);

  const total = summary?.totalCount ?? 0;
  const avg = summary?.averageStars ?? 0;
  const dist = summary?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">My Ratings</h1>

      <div className="flex flex-wrap items-center gap-4 mb-4">
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
      </div>

      {loading && <p className="text-neutral-500">Loading…</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="rounded-xl border-neutral-200">
              <CardContent className="p-4">
                <p className="text-sm text-neutral-500">Average</p>
                <p className="text-2xl font-semibold text-neutral-900">{total > 0 ? avg.toFixed(1) : '—'}</p>
                <p className="text-xs text-neutral-500">stars</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-neutral-200">
              <CardContent className="p-4">
                <p className="text-sm text-neutral-500">Total</p>
                <p className="text-2xl font-semibold text-neutral-900">{total}</p>
                <p className="text-xs text-neutral-500">ratings</p>
              </CardContent>
            </Card>
          </div>

          {total > 0 && (
            <Card className="rounded-xl border-neutral-200 mb-6">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-neutral-700 mb-3">Star distribution</p>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const cnt = dist[s] ?? 0;
                    const pct = total > 0 ? (cnt / total) * 100 : 0;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className="w-8 text-sm">{s}★</span>
                        <div className="flex-1 h-4 bg-neutral-100 rounded overflow-hidden">
                          <div className="h-full bg-amber-500 rounded" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-neutral-500 w-6">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-sm font-medium text-neutral-700 mb-2">Recent ratings</p>
          {ratings.length === 0 ? (
            <p className="text-neutral-500 text-sm">No ratings yet.</p>
          ) : (
            <ul className="space-y-3">
              {ratings.map((r) => (
                <li key={r.id}>
                  <Card className="rounded-xl border-neutral-200">
                    <CardContent className="p-4">
                      <div className="flex gap-1 text-amber-500 mb-1">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                      {r.comment && <p className="text-sm text-neutral-700">{r.comment}</p>}
                      <p className="text-xs text-neutral-500 mt-1">{formatDate(r.createdAt)}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
