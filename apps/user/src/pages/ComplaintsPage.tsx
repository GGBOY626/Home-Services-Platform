import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent, Badge } from '@home-services/ui';
import { formatDate, formatStatus, complaintStatusBadgeVariant } from '../lib/format';
import type { ComplaintTicketDTO } from '@home-services/shared';

interface PageRes {
  content: ComplaintTicketDTO[];
  totalElements: number;
}

export function ComplaintsPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<ComplaintTicketDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PageRes>('/user/complaints?page=0&size=50')
      .then((data) => setComplaints(data.content))
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load complaints', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">My Complaints</h1>
      {complaints.length === 0 ? (
        <Card className="rounded-2xl border-neutral-200">
          <CardContent className="py-12 text-center text-neutral-500">
            No complaints yet. You can raise a complaint from an order detail page.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {complaints.map((c) => (
            <li key={c.id}>
              <Link to={`/complaints/${c.id}`}>
                <Card className="rounded-2xl border-neutral-200 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={complaintStatusBadgeVariant(c.status)}>{formatStatus(c.status)}</Badge>
                      <span className="text-sm text-neutral-500">{formatDate(c.createdAt)}</span>
                    </div>
                    <p className="mt-2 font-medium text-neutral-900">{c.subject}</p>
                    <p className="mt-1 text-sm text-neutral-600">{formatStatus(c.category)}</p>
                    <p className="mt-1 text-xs text-neutral-500">Order: {c.orderId.slice(0, 8)}…</p>
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
