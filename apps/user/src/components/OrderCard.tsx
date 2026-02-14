import { Link } from 'react-router-dom';
import { Card, CardContent } from '@home-services/ui';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';
import type { Order } from '@home-services/shared';

export function OrderCard({ order, highlight }: { order: Order; highlight?: boolean }) {
  return (
    <Link to={`/orders/${order.id}`}>
      <Card
        className={`rounded-2xl border-neutral-200 shadow-sm transition hover:border-neutral-300 hover:shadow-md ${
          highlight ? 'ring-2 ring-neutral-900' : ''
        }`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={order.status} />
                <span className="text-sm font-medium text-neutral-700">{order.serviceNameSnapshot}</span>
              </div>
              <p className="mt-2 text-neutral-900 truncate">{order.address}</p>
              <p className="mt-1 text-sm text-neutral-600">Scheduled: {formatScheduled(order.scheduledAt)}</p>
              <p className="mt-1 text-sm text-neutral-500">{formatCurrency(order.priceCents)} · {formatDate(order.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
