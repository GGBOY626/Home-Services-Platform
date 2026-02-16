import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { OrderCard } from '../components/OrderCard';
import { Card, CardContent } from '@home-services/ui';
import type { Order } from '@home-services/shared';

interface PageRes {
  content: Order[];
}

export function OrdersPage() {
  const { api } = useApi();
  const location = useLocation();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const highlightOrderId = (location.state as { highlightOrderId?: string })?.highlightOrderId;

  useEffect(() => {
    api<PageRes>('/user/orders?page=0&size=50')
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
        <p className="text-neutral-500">Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">My Orders</h1>
      {orders.length === 0 ? (
        <Card className="rounded-2xl border-neutral-200">
          <CardContent className="py-12 text-center text-neutral-500">
            No orders yet. Book a service from Home.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} highlight={order.id === highlightOrderId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
