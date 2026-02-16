import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent, Badge, Button } from '@home-services/ui';
import { formatDate, formatStatus, complaintStatusBadgeVariant } from '../lib/format';
import type { ComplaintTicketDTO } from '@home-services/shared';

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { api } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [complaint, setComplaint] = useState<ComplaintTicketDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [closeLoading, setCloseLoading] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<ComplaintTicketDTO>(`/user/complaints/${id}`)
      .then(setComplaint)
      .catch(() => {
        addToast('error', 'Complaint not found');
        navigate('/complaints');
      })
      .finally(() => setLoading(false));
  }, [id, api, navigate, addToast]);

  const handleClose = async () => {
    if (!id) return;
    setCloseLoading(true);
    try {
      const updated = await api<ComplaintTicketDTO>(`/user/complaints/${id}/close`, { method: 'POST' });
      setComplaint(updated);
      addToast('success', 'Complaint withdrawn');
    } catch (err) {
      addToast('error', 'Action failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCloseLoading(false);
    }
  };

  if (loading || !complaint) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  const canWithdraw = complaint.status === 'OPEN' || complaint.status === 'IN_REVIEW';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={complaintStatusBadgeVariant(complaint.status)}>{formatStatus(complaint.status)}</Badge>
            <span className="text-sm text-neutral-500">{formatStatus(complaint.category)}</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-neutral-900">{complaint.subject}</h1>
          <p className="mt-2 text-neutral-700 whitespace-pre-wrap">{complaint.description}</p>
          <p className="mt-4 text-sm text-neutral-500">
            Created {formatDate(complaint.createdAt)} · Order: {complaint.orderId}
          </p>
          {complaint.resolvedAt && (
            <p className="mt-1 text-sm text-neutral-500">Resolved {formatDate(complaint.resolvedAt)}</p>
          )}
          {complaint.closedAt && (
            <p className="mt-1 text-sm text-neutral-500">Closed {formatDate(complaint.closedAt)}</p>
          )}

          {complaint.messages && complaint.messages.length > 0 && (
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <p className="text-sm font-medium text-neutral-700 mb-3">Timeline</p>
              <ul className="space-y-3">
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
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <p className="text-sm font-medium text-neutral-700 mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {complaint.attachments.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setImageModalUrl(a.publicUrl)}
                    className="rounded-lg overflow-hidden border border-neutral-200 hover:border-neutral-400 transition-colors"
                  >
                    <img src={a.publicUrl} alt={a.fileName} className="h-24 w-24 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {canWithdraw && (
            <div className="mt-6">
              <Button variant="outline" onClick={handleClose} disabled={closeLoading}>
                {closeLoading ? 'Withdrawing…' : 'Withdraw complaint'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {imageModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
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
    </div>
  );
}
