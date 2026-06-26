import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/format';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import type { Order, MerchantDashboardStatsDTO } from '@home-services/shared';
import { formatCurrency } from '@home-services/shared';

interface PageRes {
  content: Order[];
}

const PAYMENT_METHOD_COLORS = {
  cash: '#10b981',   // green for cash
  online: '#6366f1', // indigo for online
};

export function DashboardPage() {
  const { api } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MerchantDashboardStatsDTO | null>(null);

  useEffect(() => {
    api<PageRes>('/merchant/orders?page=0&size=10')
      .then((data) => setOrders(data.content))
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load orders', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast]);

  useEffect(() => {
    api<MerchantDashboardStatsDTO>('/merchant/dashboard/stats')
      .then((data) => setStats(data))
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        // Silently fail - stats are supplementary
      });
  }, [api]);

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const active = orders.filter((o) => ['MERCHANT_ASSIGNED', 'WORKER_ASSIGNED', 'ACCEPTED'].includes(o.status));
  const completed = orders.filter((o) => ['COMPLETED', 'CLOSED'].includes(o.status));

  // Payment method breakdown for donut chart
  const breakdown = stats?.paymentMethodBreakdown;
  const totalPaymentOrders = breakdown
    ? breakdown.cashOrderCount + breakdown.onlineOrderCount
    : 0;
  const donutData = breakdown && totalPaymentOrders > 0
    ? [
        { name: 'Cash', value: breakdown.cashOrderCount, color: PAYMENT_METHOD_COLORS.cash },
        { name: 'Online', value: breakdown.onlineOrderCount, color: PAYMENT_METHOD_COLORS.online },
      ].filter(d => d.value > 0)
    : [];

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Today's Orders" value={todayOrders.length} icon="📦" />
        <KpiCard title="Active Jobs" value={active.length} icon="🔧" />
        <KpiCard title="Completed" value={completed.length} icon="✅" />
        <KpiCard
          title="Employees"
          value={stats ? stats.workerCount : '…'}
          icon="👥"
        />
      </div>

      {/* Charts row: Payment Method Breakdown + Income Summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment Method Donut Chart */}
        <div
          className="rounded-xl border shadow-sm p-5"
          style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
            💳 Payment Method Breakdown
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>
            Cash vs Online · {totalPaymentOrders} total order{totalPaymentOrders !== 1 ? 's' : ''}
          </p>
          {!stats ? (
            <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--app-text-muted)' }}>
              Loading…
            </div>
          ) : donutData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm" style={{ color: 'var(--app-text-muted)' }}>
              No payment data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [`${v} orders`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => {
                    const d = donutData.find(d => d.name === v);
                    return d ? `${v} (${d.value})` : v;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Income Summary Card */}
        <div
          className="rounded-xl border shadow-sm p-5"
          style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-surface)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
            💰 Income by Payment Type
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>
            Total revenue breakdown
          </p>
          {!breakdown ? (
            <div className="mt-8 space-y-4">
              <div className="h-4 w-3/4 rounded animate-pulse" style={{ backgroundColor: 'var(--app-surface-alt)' }} />
              <div className="h-4 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'var(--app-surface-alt)' }} />
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {/* Cash income */}
              <div className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PAYMENT_METHOD_COLORS.cash }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Cash</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: PAYMENT_METHOD_COLORS.cash }}>
                      {formatCurrency(breakdown.cashTotalCents)}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                    {breakdown.cashOrderCount} order{breakdown.cashOrderCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Online income */}
              <div className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PAYMENT_METHOD_COLORS.online }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>Online (Stripe)</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: PAYMENT_METHOD_COLORS.online }}>
                      {formatCurrency(breakdown.onlineTotalCents)}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                    {breakdown.onlineOrderCount} order{breakdown.onlineOrderCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Total */}
              <div
                className="pt-4 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--app-border)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>Total</span>
                <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--app-text)' }}>
                  {formatCurrency(breakdown.cashTotalCents + breakdown.onlineTotalCents)}
                </span>
              </div>
            </div>
          )}
        </div>
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
