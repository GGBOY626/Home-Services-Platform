export { formatDate, formatStatus, formatCurrency, formatScheduled } from '@home-services/shared';
import type { OrderStatus } from '@home-services/shared';

export function statusBadgeVariant(status: OrderStatus): 'default' | 'success' | 'warning' | 'destructive' | 'neutral' {
  switch (status) {
    case 'COMPLETED':
    case 'CLOSED':
      return 'success';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'destructive';
    case 'WORKER_ASSIGNED':
    case 'ACCEPTED':
      return 'warning';
    default:
      return 'neutral';
  }
}
