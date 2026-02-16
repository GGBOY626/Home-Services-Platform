import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import type { WorkerSummary } from '@home-services/shared';

type AvailabilityFilter = 'ALL' | 'ONLINE' | 'OFFLINE';

export function WorkersPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AvailabilityFilter>('ALL');

  useEffect(() => {
    api<WorkerSummary[]>('/merchant/workers')
      .then((data) => setWorkers(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load workers', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast]);

  const filtered =
    filter === 'ALL'
      ? workers
      : workers.filter((w) => (w.availability ?? 'OFFLINE') === filter);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-neutral-900">Workers</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as AvailabilityFilter)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
        >
          <option value="ALL">All</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <Card className="rounded-xl border-neutral-200">
          <CardContent className="py-12 text-center text-neutral-500">
            {workers.length === 0 ? 'No workers yet.' : 'No workers match the filter.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((w) => (
            <Card key={w.id} className="rounded-xl border-neutral-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-neutral-900">{w.displayName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      (w.availability ?? 'OFFLINE') === 'ONLINE'
                        ? 'bg-neutral-200 text-neutral-800'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {w.availability ?? 'OFFLINE'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">ID: {w.id.slice(0, 8)}…</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
