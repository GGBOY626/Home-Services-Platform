import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Order } from '@home-services/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';

interface PageResponse {
  content: Order[];
  totalPages: number;
  number: number;
}

export function OrderListPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!token) return;
    api<PageResponse>(`/user/orders?page=0&size=50`, { token })
      .then((data) => setOrders(data.content))
      .catch((err) => addToast('error', 'Failed to load orders', err.message))
      .finally(() => setLoading(false));
  }, [token, addToast]);

  if (loading) {
    return <p className="text-neutral-600">Loading orders…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">My Orders</h1>
        <Link to="/create" className="inline-block">
          <Button>New order</Button>
        </Link>
      </div>
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-600">
            No orders yet. Create your first cleaning order.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`}>
                <Card className="transition hover:border-neutral-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      {o.serviceType} — {o.status}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-neutral-600">{o.address}</p>
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
