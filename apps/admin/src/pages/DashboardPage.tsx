import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, Label,
} from 'recharts';
import { Card, CardContent } from '@home-services/ui';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { formatCurrency } from '../lib/format';
import type { FinanceSummaryDTO } from '@home-services/shared';

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = [
  { key: 'PLACED',            label: 'Placed',            color: '#f59e0b' },
  { key: 'MERCHANT_ASSIGNED', label: 'Merchant Assigned', color: '#3b82f6' },
  { key: 'WORKER_ASSIGNED',   label: 'Worker Assigned',   color: '#06b6d4' },
  { key: 'ACCEPTED',          label: 'Accepted',          color: '#10b981' },
  { key: 'COMPLETED',         label: 'Completed',         color: '#22c55e' },
  { key: 'CLOSED',            label: 'Closed',            color: '#94a3b8' },
  { key: 'CANCELLED',         label: 'Cancelled',         color: '#ef4444' },
  { key: 'EXPIRED',           label: 'Expired',           color: '#d1d5db' },
];

const NZD = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 });

// ── types ─────────────────────────────────────────────────────────────────────

interface WeekPoint { day: string; gross: number; fee: number; }
interface PageMeta  { totalElements: number; }

interface DashData {
  monthSummary:   FinanceSummaryDTO | null;
  todaySummary:   FinanceSummaryDTO | null;
  orderCounts:    Record<string, number>;
  pendingRefunds: number;
  pendingApps:    number;
  openComplaints: number;
  weeklyData:     WeekPoint[];
}

const EMPTY: DashData = {
  monthSummary: null, todaySummary: null, orderCounts: {},
  pendingRefunds: 0, pendingApps: 0, openComplaints: 0, weeklyData: [],
};

// ── sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="rounded-xl border-[var(--app-border)]">
      <CardContent className="p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--app-text-muted)]">{label}</p>
        <p className="mt-2 text-2xl font-bold text-[var(--app-text)] tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs text-[var(--app-text-muted)]">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ActionCard({
  label, count, to, color,
}: { label: string; count: number; to: string; color: string }) {
  return (
    <Link to={to} className="block">
      <Card className="rounded-xl border-[var(--app-border)] hover:border-blue-300 transition-colors">
        <CardContent className="p-5 flex items-center gap-4">
          <span className={`text-3xl font-bold tabular-nums ${color}`}>{count}</span>
          <p className="text-sm text-[var(--app-text-muted)] leading-tight">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashData>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      const today     = toDateParam(new Date());
      const monthFrom = toDateParam(daysAgo(29));

      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = daysAgo(6 - i);
        const label = d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
        return { d, label };
      });

      const [
        monthRes, todayRes, weekRes,
        statusRes, refundRes, workerAppRes, merchantAppRes, complaintRes,
      ] = await Promise.allSettled([
        // Finance summaries
        api<FinanceSummaryDTO>(`/admin/finance/summary?from=${monthFrom}&to=${today}`),
        api<FinanceSummaryDTO>(`/admin/finance/summary?from=${today}&to=${today}`),
        // 7-day daily breakdown (parallel)
        Promise.allSettled(
          weekDays.map(({ d, label }) =>
            api<FinanceSummaryDTO>(`/admin/finance/summary?from=${toDateParam(d)}&to=${toDateParam(d)}`)
              .then(s => ({ day: label, gross: s.totalGrossCents / 100, fee: s.totalPlatformFeeCents / 100 }))
          )
        ),
        // Order counts per status (parallel, size=1 for efficiency)
        Promise.allSettled(
          STATUS_CONFIG.map(({ key }) =>
            api<PageMeta>(`/admin/orders?status=${key}&page=0&size=1`).then(p => ({ key, count: p.totalElements }))
          )
        ),
        // Pending action counts
        api<PageMeta>('/admin/refund-requests?status=PENDING&page=0&size=1'),
        api<PageMeta>('/admin/applications/workers?status=PENDING&page=0&size=1'),
        api<PageMeta>('/admin/applications/merchants?status=PENDING&page=0&size=1'),
        api<PageMeta>('/admin/complaints?status=OPEN&page=0&size=1'),
      ]);

      if (cancelled) return;

      const monthSummary = monthRes.status === 'fulfilled' ? monthRes.value : null;
      const todaySummary = todayRes.status === 'fulfilled' ? todayRes.value : null;

      const weeklyData: WeekPoint[] =
        weekRes.status === 'fulfilled'
          ? weekRes.value.map((r, i) =>
              r.status === 'fulfilled'
                ? r.value
                : { day: weekDays[i].label, gross: 0, fee: 0 }
            )
          : weekDays.map(({ label }) => ({ day: label, gross: 0, fee: 0 }));

      const orderCounts: Record<string, number> = {};
      if (statusRes.status === 'fulfilled') {
        statusRes.value.forEach((r, i) => {
          orderCounts[STATUS_CONFIG[i].key] = r.status === 'fulfilled' ? r.value.count : 0;
        });
      }

      setData({
        monthSummary,
        todaySummary,
        orderCounts,
        pendingRefunds:  refundRes.status      === 'fulfilled' ? refundRes.value.totalElements      : 0,
        pendingApps:    (workerAppRes.status   === 'fulfilled' ? workerAppRes.value.totalElements   : 0) +
                        (merchantAppRes.status === 'fulfilled' ? merchantAppRes.value.totalElements : 0),
        openComplaints:  complaintRes.status   === 'fulfilled' ? complaintRes.value.totalElements   : 0,
        weeklyData,
      });
      setLoading(false);
    }

    loadAll().catch(() => {
      if (!cancelled) {
        addToast('error', 'Dashboard failed to load');
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── derived values ──────────────────────────────────────────────────────────

  const activeOrders =
    (data.orderCounts['PLACED']            ?? 0) +
    (data.orderCounts['MERCHANT_ASSIGNED'] ?? 0) +
    (data.orderCounts['WORKER_ASSIGNED']   ?? 0) +
    (data.orderCounts['ACCEPTED']          ?? 0);

  const donutData = STATUS_CONFIG
    .map(({ key, label, color }) => ({ name: label, value: data.orderCounts[key] ?? 0, color }))
    .filter(d => d.value > 0);

  const totalOrders = donutData.reduce((s, d) => s + d.value, 0);

  const dash = loading ? '—' : undefined;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">Dashboard</h2>
        <p className="text-xs text-[var(--app-text-muted)]">
          {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Revenue (30d)"
          value={dash ?? (data.monthSummary ? formatCurrency(data.monthSummary.totalGrossCents) : '—')}
          sub="Total gross"
        />
        <KpiCard
          label="Platform Fee (30d)"
          value={dash ?? (data.monthSummary ? formatCurrency(data.monthSummary.totalPlatformFeeCents) : '—')}
          sub="Net platform revenue"
        />
        <KpiCard
          label="Active Orders"
          value={dash ?? String(activeOrders)}
          sub="Placed → Accepted"
        />
        <KpiCard
          label="Today's Revenue"
          value={dash ?? (data.todaySummary ? formatCurrency(data.todaySummary.totalGrossCents) : '—')}
          sub={!loading && data.todaySummary?.ledgerCount
            ? `${data.todaySummary.ledgerCount} order${data.todaySummary.ledgerCount !== 1 ? 's' : ''}`
            : undefined}
        />
        <KpiCard
          label="Pending Actions"
          value={dash ?? String(data.pendingRefunds + data.pendingApps)}
          sub={`${data.pendingRefunds} refunds · ${data.pendingApps} apps`}
        />
        <KpiCard
          label="Settled (30d)"
          value={dash ?? (data.monthSummary ? String(data.monthSummary.paidCount) : '—')}
          sub={!loading && data.monthSummary ? `of ${data.monthSummary.ledgerCount} ledgers` : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* 7-Day Revenue Bar Chart */}
        <Card className="rounded-xl border-[var(--app-border)]">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-[var(--app-text)] mb-4">7-Day Revenue</p>
            {loading ? (
              <div className="h-56 flex items-center justify-center text-sm text-[var(--app-text-muted)]">
                Loading…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={data.weeklyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(v: number, key: string) => [NZD.format(v), key === 'gross' ? 'Gross Revenue' : 'Platform Fee']}
                    labelStyle={{ fontSize: 12, fontWeight: 600 }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    cursor={{ fill: '#f3f4f6' }}
                  />
                  <Legend
                    formatter={(v) => v === 'gross' ? 'Gross Revenue' : 'Platform Fee'}
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Bar dataKey="gross" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="fee"   fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Status Donut Chart */}
        <Card className="rounded-xl border-[var(--app-border)]">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-[var(--app-text)] mb-1">Order Distribution</p>
            <p className="text-xs text-[var(--app-text-muted)] mb-3">All time · {loading ? '…' : `${totalOrders} total`}</p>
            {loading ? (
              <div className="h-56 flex items-center justify-center text-sm text-[var(--app-text-muted)]">
                Loading…
              </div>
            ) : donutData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-[var(--app-text-muted)]">
                No orders yet
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
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                    <Label
                      value={totalOrders}
                      position="center"
                      style={{ fontSize: 28, fontWeight: 700, fill: '#111827' }}
                    />
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(v) => `${v} (${donutData.find(d => d.name === v)?.value ?? 0})`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          label="Pending Refund Requests"
          count={data.pendingRefunds}
          to="/refund-requests"
          color={data.pendingRefunds > 0 ? 'text-amber-500' : 'text-[var(--app-text-muted)]'}
        />
        <ActionCard
          label="Pending Applications"
          count={data.pendingApps}
          to="/applications/workers"
          color={data.pendingApps > 0 ? 'text-blue-500' : 'text-[var(--app-text-muted)]'}
        />
        <ActionCard
          label="Open Complaints"
          count={data.openComplaints}
          to="/complaints"
          color={data.openComplaints > 0 ? 'text-red-500' : 'text-[var(--app-text-muted)]'}
        />
      </div>

    </div>
  );
}
