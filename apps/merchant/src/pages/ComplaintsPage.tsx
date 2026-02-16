import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Badge } from '@home-services/ui';
import { formatDate, formatStatus, complaintStatusBadgeVariant } from '../lib/format';
import type { ComplaintTicketDTO } from '@home-services/shared';
import { ComplaintDrawer } from '../components/ComplaintDrawer';

interface PageRes {
  content: ComplaintTicketDTO[];
}

export function ComplaintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const { api } = useApi();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<ComplaintTicketDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<PageRes>('/merchant/complaints?page=0&size=100')
      .then((data) => setComplaints(data.content))
      .catch((err) => addToast('error', 'Failed to load complaints', err.message))
      .finally(() => setLoading(false));
  }, [api, addToast]);

  const selected = complaints.find((c) => String(c.id) === openId) || null;
  const drawerOpen = !!openId;

  const closeDrawer = () => setSearchParams({});
  const openDrawer = (id: number) => setSearchParams({ open: String(id) });

  const refreshComplaint = (updated: ComplaintTicketDTO) => {
    setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">Complaints</h1>
      {complaints.length === 0 ? (
        <p className="text-neutral-500">No complaints for your merchant.</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-700">ID</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Subject</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Category</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Status</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Order</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => openDrawer(c.id)}
                >
                  <td className="px-4 py-3 text-neutral-600">{c.id}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{c.subject}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatStatus(c.category)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={complaintStatusBadgeVariant(c.status)}>{formatStatus(c.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 font-mono text-xs">{c.orderId.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ComplaintDrawer
        complaintId={openId ? Number(openId) : null}
        open={drawerOpen}
        onClose={closeDrawer}
        onUpdated={refreshComplaint}
      />
    </div>
  );
}
