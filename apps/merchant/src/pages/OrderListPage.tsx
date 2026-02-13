import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Order } from '@home-services/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@home-services/ui';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';

export function OrderListPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!token) return;
    api<{ content: Order[] }>('/merchant/orders?page=0&size=50', { token })
      .then((d) => setOrders(d.content))
      .catch((e) => addToast('error', 'Failed to load orders', e.message))
      .finally(() => setLoading(false));
  }, [token, addToast]);

  if (loading) return <p className="text-neutral-600">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Assigned Orders</h1>
      {orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-neutral-600">No orders assigned to your merchant yet.</CardContent></Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`}>
                <Card className="transition hover:border-neutral-400">
                  <CardHeader className="pb-2"><CardTitle className="text-base">{o.serviceType} — {o.status}</CardTitle></CardHeader>
                  <CardContent className="pt-0"><p className="text-sm text-neutral-600">{o.address}</p></CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
