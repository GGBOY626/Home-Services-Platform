import { useEffect, useState } from 'react';
import { Drawer, Button, useToast, Badge } from '@home-services/ui';
import { useApi } from '../lib/useApi';
import { formatDate, formatStatus, complaintStatusBadgeVariant } from '../lib/format';
import type { ComplaintTicketDTO } from '@home-services/shared';

export interface ComplaintDrawerProps {
  complaintId: number | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (updated: ComplaintTicketDTO) => void;
}

export function ComplaintDrawer({ complaintId, open, onClose, onUpdated }: ComplaintDrawerProps) {
  const { api } = useApi();
  const { addToast } = useToast();
  const [complaint, setComplaint] = useState<ComplaintTicketDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !complaintId) {
      setComplaint(null);
      return;
    }
    setLoading(true);
    api<ComplaintTicketDTO>(`/merchant/complaints/${complaintId}`)
      .then(setComplaint)
      .catch(() => {
        addToast('error', 'Complaint not found');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, complaintId, api, addToast, onClose]);

  const handleAddMessage = async () => {
    if (!complaintId || !replyText.trim()) return;
    setReplyLoading(true);
    try {
      const updated = await api<ComplaintTicketDTO>(`/merchant/complaints/${complaintId}/message`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() }),
      });
      setComplaint(updated);
      onUpdated(updated);
      setReplyText('');
      addToast('success', 'Message added');
    } catch (err) {
      addToast('error', 'Failed to add message', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setReplyLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={complaint ? `Complaint #${complaint.id}` : 'Complaint'}
      side="right"
    >
      {loading && (
        <p className="text-neutral-500">Loading…</p>
      )}
      {!loading && complaint && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={complaintStatusBadgeVariant(complaint.status)}>{formatStatus(complaint.status)}</Badge>
            <span className="text-sm text-neutral-500">{formatStatus(complaint.category)}</span>
          </div>
          <h2 className="font-semibold text-neutral-900">{complaint.subject}</h2>
          <p className="text-neutral-700 whitespace-pre-wrap text-sm">{complaint.description}</p>
          <p className="text-sm text-neutral-500">
            Order: <span className="font-mono">{complaint.orderId}</span>
          </p>
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

          <div className="pt-4 border-t border-neutral-200">
            <p className="text-sm font-medium text-neutral-700 mb-2">Add reply (optional)</p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 min-h-[80px]"
              placeholder="Your response to the customer…"
            />
            <Button
              size="sm"
              className="mt-2"
              onClick={handleAddMessage}
              disabled={!replyText.trim() || replyLoading}
            >
              {replyLoading ? 'Sending…' : 'Add message'}
            </Button>
          </div>
        </div>
      )}

      {imageModalUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setImageModalUrl(null)}
        >
          <img
            src={imageModalUrl}
            alt="Enlarged"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Drawer>
  );
}
