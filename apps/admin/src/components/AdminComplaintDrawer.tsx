import { useEffect, useState } from 'react';
import { Drawer, Button, useToast, Badge } from '@home-services/ui';
import { useApi } from '../lib/useApi';
import { formatDate, formatStatus, complaintStatusBadgeVariant } from '../lib/format';
import type { ComplaintTicketDTO, ComplaintStatus } from '@home-services/shared';

const NEXT_STATUS_OPTIONS: Record<ComplaintStatus, ComplaintStatus[] | null> = {
  OPEN: ['IN_REVIEW'],
  IN_REVIEW: ['RESOLVED', 'REJECTED'],
  RESOLVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

export interface AdminComplaintDrawerProps {
  complaintId: number | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (updated: ComplaintTicketDTO) => void;
}

export function AdminComplaintDrawer({ complaintId, open, onClose, onUpdated }: AdminComplaintDrawerProps) {
  const { api } = useApi();
  const { addToast } = useToast();
  const [complaint, setComplaint] = useState<ComplaintTicketDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<ComplaintStatus | ''>('');
  const [note, setNote] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !complaintId) {
      setComplaint(null);
      setNewStatus('');
      setNote('');
      return;
    }
    setLoading(true);
    api<ComplaintTicketDTO>(`/admin/complaints/${complaintId}`)
      .then((data) => {
        setComplaint(data);
        const next = NEXT_STATUS_OPTIONS[data.status];
        setNewStatus(next && next.length === 1 ? next[0] : (next && next.length > 0 ? '' : ''));
      })
      .catch(() => {
        addToast('error', 'Complaint not found');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, complaintId, api, addToast, onClose]);

  const allowedNext = complaint ? (NEXT_STATUS_OPTIONS[complaint.status] || []) : [];

  const handleUpdateStatus = async () => {
    if (!complaintId || !newStatus) return;
    setUpdateLoading(true);
    try {
      const updated = await api<ComplaintTicketDTO>(`/admin/complaints/${complaintId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus, note: note.trim() || undefined }),
      });
      setComplaint(updated);
      onUpdated(updated);
      const next = NEXT_STATUS_OPTIONS[updated.status];
      setNewStatus(next && next.length === 1 ? next[0] : (next && next.length > 0 ? '' : ''));
      setNote('');
      addToast('success', 'Status updated');
    } catch (err) {
      addToast('error', 'Update failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} title={complaint ? `Complaint #${complaint.id}` : 'Complaint'} side="right">
      {loading && <p className="text-neutral-500">Loading…</p>}
      {!loading && complaint && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={complaintStatusBadgeVariant(complaint.status)}>{formatStatus(complaint.status)}</Badge>
            <span className="text-sm text-neutral-500">{formatStatus(complaint.category)}</span>
          </div>
          <h2 className="font-semibold text-neutral-900">{complaint.subject}</h2>
          <p className="text-neutral-700 whitespace-pre-wrap text-sm">{complaint.description}</p>
          <p className="text-sm text-neutral-500">Order: <span className="font-mono">{complaint.orderId}</span></p>
          <p className="text-sm text-neutral-500">Created {formatDate(complaint.createdAt)}</p>

          {complaint.messages && complaint.messages.length > 0 && (
            <div className="pt-4 border-t border-neutral-200">
              <p className="text-sm font-medium text-neutral-700 mb-2">Timeline</p>
              <ul className="space-y-2">
                {complaint.messages.map((m) => (
                  <li key={m.id} className="rounded-lg bg-neutral-50 p-3 text-sm">
                    <span className="font-medium text-neutral-600">{m.actorRole}</span>
                    <span className="text-neutral-500 ml-2">{formatDate(m.createdAt)}</span>
                    <p className="mt-1 text-neutral-800 whitespace-pre-wrap">{m.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {complaint.attachments && complaint.attachments.length > 0 && (
            <div className="pt-4 border-t border-neutral-200">
              <p className="text-sm font-medium text-neutral-700 mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {complaint.attachments.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setImageModalUrl(a.publicUrl)}
                    className="rounded-lg overflow-hidden border border-neutral-200 hover:border-neutral-400"
                  >
                    <img src={a.publicUrl} alt={a.fileName} className="h-20 w-20 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {allowedNext.length > 0 && (
            <div className="pt-4 border-t border-neutral-200">
              <p className="text-sm font-medium text-neutral-700 mb-2">Update status</p>
              <p className="text-xs text-neutral-500 mb-2">
                Allowed: {complaint.status} → {allowedNext.join(' | ')}
              </p>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 mb-2"
              >
                <option value="">Select new status</option>
                {allowedNext.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 min-h-[60px] mb-2"
                placeholder="Optional note (saved as message)"
              />
              <Button onClick={handleUpdateStatus} disabled={!newStatus || updateLoading}>
                {updateLoading ? 'Updating…' : 'Update status'}
              </Button>
            </div>
          )}
          {allowedNext.length === 0 && complaint.status !== 'CLOSED' && (
            <p className="text-sm text-neutral-500">No further status transitions (must resolve/reject then close).</p>
          )}
        </div>
      )}

      {imageModalUrl && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={() => setImageModalUrl(null)}>
          <img src={imageModalUrl} alt="Enlarged" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </Drawer>
  );
}
