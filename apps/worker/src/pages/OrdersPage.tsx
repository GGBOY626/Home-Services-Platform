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
      .catch((err) => addToast('error', 'Failed to load orders', err.message))
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
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Assigned Orders</h1>
      {orders.length === 0 ? (
        <Card className="rounded-2xl border-neutral-200">
          <CardContent className="py-12 text-center text-neutral-500">No orders assigned yet.</CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Card
                className="rounded-2xl border-neutral-200 shadow-sm cursor-pointer transition hover:border-neutral-300 hover:shadow-md"
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={order.status} />
                        <span className="text-sm font-medium text-neutral-700">{order.serviceNameSnapshot}</span>
                      </div>
                      <p className="mt-2 text-neutral-900">{order.address}</p>
                      <p className="mt-1 text-sm font-medium text-neutral-600">Scheduled: {formatScheduled(order.scheduledAt)}</p>
                      <p className="mt-1 text-sm text-neutral-500">{formatCurrency(order.priceCents)} · {formatDate(order.createdAt)}</p>
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
