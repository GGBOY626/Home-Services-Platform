import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/format';
import type { Order } from '@home-services/shared';

interface PageRes {
  content: Order[];
}

export function DashboardPage() {
  const { api } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PageRes>('/merchant/orders?page=0&size=10')
      .then((data) => setOrders(data.content))
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load orders', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast]);

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const active = orders.filter((o) => ['MERCHANT_ASSIGNED', 'WORKER_ASSIGNED', 'ACCEPTED'].includes(o.status));
  const completed = orders.filter((o) => ['COMPLETED', 'CLOSED'].includes(o.status));

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-neutral-900">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Today's Orders" value={todayOrders.length} />
        <KpiCard title="Active Jobs" value={active.length} />
        <KpiCard title="Completed" value={completed.length} />
      </div>

      <section>
        <h3 className="mb-4 text-lg font-medium text-neutral-900">Latest Orders</h3>
        {loading ? (
          <p className="text-neutral-500">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="text-neutral-500">No orders yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left font-medium text-neutral-700">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-700">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-700">Address</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-700">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                    onClick={() => navigate(`/orders?open=${order.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-neutral-600">{order.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-neutral-900 truncate max-w-[200px]">{order.address}</td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
