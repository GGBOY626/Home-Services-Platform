import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Badge } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { Drawer } from '@home-services/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDate } from '@home-services/shared';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface MerchantApplicationDTO {
  id: number;
  email: string;
  businessName: string;
  contactName: string;
  phone: string | null;
  address: string | null;
  nzbnOrAbn: string | null;
  gstRegistered: boolean | null;
  notes: string | null;
  status: ApplicationStatus;
  adminNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApproveResponse {
  merchantApplication: MerchantApplicationDTO;
  tempPassword: string;
}

const STATUS_OPTIONS: { value: '' | ApplicationStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

function statusVariant(s: ApplicationStatus): 'default' | 'success' | 'warning' | 'destructive' | 'neutral' {
  if (s === 'PENDING') return 'warning';
  if (s === 'APPROVED') return 'success';
  return 'destructive';
}

export function MerchantApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = (searchParams.get('status') || '') as '' | ApplicationStatus;
  const openId = searchParams.get('open');
  const { api } = useApi();
  const { addToast } = useToast();
  const [items, setItems] = useState<MerchantApplicationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MerchantApplicationDTO | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams();
    if (statusParam) q.set('status', statusParam);
    q.set('page', '0');
    q.set('size', '100');
    api<{ content: MerchantApplicationDTO[] }>(`/admin/applications/merchants?${q.toString()}`)
      .then((data) => setItems(data.content))
      .catch((err) => addToast('error', 'Failed to load', err.message))
      .finally(() => setLoading(false));
  }, [statusParam, api, addToast]);

  useEffect(() => {
    if (openId) {
      api<MerchantApplicationDTO>(`/admin/applications/merchants/${openId}`)
        .then((data) => {
          setSelected(data);
          setTempPassword(null);
        })
        .catch((err) => {
          addToast('error', 'Failed to load', err.message);
          setSelected(null);
        });
    } else {
      setSelected(null);
      setTempPassword(null);
    }
  }, [openId, api, addToast]);

  const closeDrawer = () => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.delete('open');
      return next;
    });
  };

  const refreshList = () => {
    const q = new URLSearchParams();
    if (statusParam) q.set('status', statusParam);
    q.set('page', '0');
    q.set('size', '100');
    api<{ content: MerchantApplicationDTO[] }>(`/admin/applications/merchants?${q.toString()}`).then((data) => setItems(data.content));
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await api<ApproveResponse>(`/admin/applications/merchants/${selected.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: adminNote || undefined }),
      });
      setTempPassword(res.tempPassword);
      setSelected(res.merchantApplication);
      setApproveOpen(false);
      refreshList();
      addToast('success', 'Application approved');
    } catch (err) {
      addToast('error', 'Approve failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (note: string) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await api<MerchantApplicationDTO>(`/admin/applications/merchants/${selected.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ adminNote: note || undefined }),
      });
      setSelected(updated);
      setRejectOpen(false);
      refreshList();
      addToast('success', 'Application rejected');
    } catch (err) {
      addToast('error', 'Reject failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      addToast('success', 'Password copied to clipboard');
    }
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
      <h1 className="text-2xl font-semibold text-neutral-900 mb-6">Merchant Applications</h1>
      <div className="mb-4">
        <select
          value={statusParam}
          onChange={(e) => setSearchParams({ ...Object.fromEntries(searchParams), status: (e.target.value || '') as '' | ApplicationStatus })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {items.length === 0 ? (
        <p className="text-neutral-500">No applications match.</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">Created</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">Business</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">Email</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), open: String(row.id) })}
                >
                  <td className="px-4 py-3 text-neutral-600">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{row.businessName}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.contactName}</td>
                  <td className="px-4 py-3 text-neutral-600">{row.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={!!openId} onOpenChange={(o) => !o && closeDrawer()} title="Merchant Application" side="right">
        {selected && (
          <div className="space-y-4 text-sm">
            <div><span className="text-neutral-500">Status</span> <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge></div>
            <div><span className="text-neutral-500">Business name</span><br />{selected.businessName}</div>
            <div><span className="text-neutral-500">Contact name</span><br />{selected.contactName}</div>
            <div><span className="text-neutral-500">Email</span><br />{selected.email}</div>
            {selected.phone && <div><span className="text-neutral-500">Phone</span><br />{selected.phone}</div>}
            {selected.address && <div><span className="text-neutral-500">Address</span><br />{selected.address}</div>}
            {selected.nzbnOrAbn && <div><span className="text-neutral-500">NZBN/ABN</span><br />{selected.nzbnOrAbn}</div>}
            {selected.gstRegistered != null && <div><span className="text-neutral-500">GST registered</span><br />{selected.gstRegistered ? 'Yes' : 'No'}</div>}
            {selected.notes && <div><span className="text-neutral-500">Notes</span><br />{selected.notes}</div>}
            {selected.adminNote && <div><span className="text-neutral-500">Admin note</span><br />{selected.adminNote}</div>}
            {selected.decidedAt && <div><span className="text-neutral-500">Decided at</span><br />{formatDate(selected.decidedAt)}</div>}

            {tempPassword && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3">
                <p className="font-medium text-amber-800">Temporary password</p>
                <p className="text-xs text-amber-700 mt-1">Copy this password now. It won&apos;t be shown again.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-sm">{tempPassword}</code>
                  <Button size="sm" variant="outline" onClick={copyPassword}>Copy</Button>
                </div>
                <p className="text-xs text-neutral-600 mt-2">Account: {selected.email} · Role: MERCHANT</p>
              </div>
            )}

            {selected.status === 'PENDING' && (
              <>
                <div>
                  <label className="block text-neutral-500 mb-1">Admin note</label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                    rows={2}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setApproveOpen(true)}>Approve</Button>
                  <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve application"
        description="This will create a merchant account. A temporary password will be shown once."
        confirmLabel="Approve"
        onConfirm={handleApprove}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject application"
        description="The application will be marked as rejected."
        confirmLabel="Reject"
        variant="destructive"
        reasonLabel="Admin note (optional)"
        reasonPlaceholder="Reason for rejection"
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </div>
  );
}
