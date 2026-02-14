import { Badge } from '@home-services/ui';
import { formatStatus } from '../lib/format';
import type { OrderStatus } from '@home-services/shared';
import { statusBadgeVariant } from '../lib/format';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={statusBadgeVariant(status)}>{formatStatus(status)}</Badge>;
}
