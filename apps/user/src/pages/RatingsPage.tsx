import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { formatDate } from '../lib/format';
import type { RatingDTO } from '@home-services/shared';

interface PageRes {
  content: RatingDTO[];
}

export function RatingsPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [ratings, setRatings] = useState<RatingDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PageRes>('/user/ratings?page=0&size=50')
      .then((data) => setRatings(data.content))
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load ratings', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">My Ratings</h1>
      {ratings.length === 0 ? (
        <Card className="rounded-2xl border-neutral-200">
          <CardContent className="py-12 text-center text-neutral-500">
            No ratings yet. Rate your closed orders from the order detail page.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {ratings.map((r) => (
            <li key={r.id}>
              <Link to={`/orders/${r.orderId}`}>
                <Card className="rounded-2xl border-neutral-200 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= r.stars ? 'text-amber-500' : 'text-neutral-300'}>★</span>
                      ))}
                    </div>
                    <p className="font-medium text-neutral-900">{r.serviceNameSnapshot || 'Service'}</p>
                    {r.comment && <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{r.comment}</p>}
                    <p className="mt-2 text-xs text-neutral-500">Order {r.orderId.slice(0, 8)}… · {formatDate(r.createdAt)}</p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
