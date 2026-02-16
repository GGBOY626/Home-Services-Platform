import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Badge } from '@home-services/ui';
import { formatDate, formatStatus, complaintStatusBadgeVariant } from '../lib/format';
import type { ComplaintTicketDTO, ComplaintStatus, ComplaintCategory } from '@home-services/shared';
import { AdminComplaintDrawer } from '../components/AdminComplaintDrawer';

interface PageRes {
  content: ComplaintTicketDTO[];
}

const STATUS_OPTIONS: { value: '' | ComplaintStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
];

const CATEGORY_OPTIONS: { value: '' | ComplaintCategory; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'SERVICE_QUALITY', label: 'Service quality' },
  { value: 'LATE_ARRIVAL', label: 'Late arrival' },
  { value: 'NO_SHOW', label: 'No show' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'OTHER', label: 'Other' },
];

export function ComplaintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = (searchParams.get('status') || '') as '' | ComplaintStatus;
  const categoryParam = (searchParams.get('category') || '') as '' | ComplaintCategory;
  const openId = searchParams.get('open');
  const { api } = useApi();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<ComplaintTicketDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = new URLSearchParams();
    if (statusParam) q.set('status', statusParam);
    if (categoryParam) q.set('category', categoryParam);
    q.set('page', '0');
    q.set('size', '100');
    api<PageRes>(`/admin/complaints?${q.toString()}`)
      .then((data) => setComplaints(data.content))
      .catch((err) => addToast('error', 'Failed to load complaints', err.message))
      .finally(() => setLoading(false));
  }, [statusParam, categoryParam, api, addToast]);

  const selected = complaints.find((c) => String(c.id) === openId) || null;
  const drawerOpen = !!openId;

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next);
  };
  const openDrawer = (id: number) => setSearchParams({ ...Object.fromEntries(searchParams), open: String(id) });

  const setStatusFilter = (v: '' | ComplaintStatus) => setSearchParams({ ...Object.fromEntries(searchParams), status: v || '' });
  const setCategoryFilter = (v: '' | ComplaintCategory) => setSearchParams({ ...Object.fromEntries(searchParams), category: v || '' });

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
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={statusParam}
          onChange={(e) => setStatusFilter((e.target.value || '') as '' | ComplaintStatus)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={categoryParam}
          onChange={(e) => setCategoryFilter((e.target.value || '') as '' | ComplaintCategory)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {complaints.length === 0 ? (
        <p className="text-neutral-500">No complaints match the filters.</p>
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

      <AdminComplaintDrawer
        complaintId={openId ? Number(openId) : null}
        open={drawerOpen}
        onClose={closeDrawer}
        onUpdated={refreshComplaint}
      />
    </div>
  );
}
