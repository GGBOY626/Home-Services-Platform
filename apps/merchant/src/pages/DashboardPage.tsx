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
      {/* Page title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--app-text)' }}>
          👋 Welcome back
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--app-text-muted)' }}>
          Here's what's happening with your business today.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard title="Today's Orders" value={todayOrders.length} icon="📦" />
        <KpiCard title="Active Jobs" value={active.length} icon="🔧" />
        <KpiCard title="Completed" value={completed.length} icon="✅" />
      </div>

      {/* Latest orders */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--app-text)' }}>
            Latest Orders
          </h3>
          <button
            onClick={() => navigate('/orders')}
            className="text-sm font-medium transition-colors hover:underline"
            style={{ color: 'var(--app-primary)' }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>Loading…</p>
        ) : orders.length === 0 ? (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface)' }}
          >
            <span className="text-4xl">📭</span>
            <p className="mt-2 text-sm" style={{ color: 'var(--app-text-muted)' }}>
              No orders yet. Orders assigned to your merchant will appear here.
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl border shadow-sm"
            style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface-alt)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--app-text-muted)' }}>ID</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--app-text-muted)' }}>Status</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--app-text-muted)' }}>Address</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--app-text-muted)' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr
                    key={order.id}
                    className="border-b cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--app-border)' }}
                    onClick={() => navigate(`/orders?open=${order.id}`)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--app-nav-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--app-text-muted)' }}>
                      {order.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 truncate max-w-[200px]" style={{ color: 'var(--app-text)' }}>
                      {order.address}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                      {formatDate(order.createdAt)}
                    </td>
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
