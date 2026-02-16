import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';
import type { Order } from '@home-services/shared';

interface PageRes {
  content: Order[];
}

export function OrdersPage() {
  const { api } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PageRes>('/worker/orders?page=0&size=50&sort=scheduledAt,asc')
      .then((data) => setOrders(data.content))
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load orders', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-[var(--app-text-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-[var(--app-text)]">Assigned Orders</h1>
      {orders.length === 0 ? (
        <Card className="rounded-xl border-[var(--app-border)] bg-[var(--app-surface)]">
          <CardContent className="py-12 text-center text-[var(--app-text-muted)]">No orders assigned yet.</CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Card
                className="rounded-xl border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm cursor-pointer transition hover:border-[var(--app-primary)]"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={order.status} />
                        <span className="text-sm font-medium text-[var(--app-text-muted)]">{order.serviceNameSnapshot}</span>
                      </div>
                      <p className="mt-2 text-[var(--app-text)] font-medium">{order.address}</p>
                      <p className="mt-1 text-sm font-medium text-[var(--app-text-muted)]">Scheduled: {formatScheduled(order.scheduledAt)}</p>
                      <p className="mt-1 text-sm text-[var(--app-text-muted)]">{formatCurrency(order.priceCents)} · {formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
