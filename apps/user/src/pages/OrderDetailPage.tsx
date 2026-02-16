import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Order, CompletionProof, ComplaintCategory, ComplaintTicketDTO, RatingDTO } from '@home-services/shared';
import { Card, CardContent, Button } from '@home-services/ui';
import { useAuth } from '../auth';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';

const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  'SERVICE_QUALITY',
  'LATE_ARRIVAL',
  'NO_SHOW',
  'DAMAGE',
  'BILLING',
  'OTHER',
];
const MAX_COMPLAINT_IMAGES = 4;

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { api: apiRequest, apiMultipart } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [proof, setProof] = useState<CompletionProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintCategory, setComplaintCategory] = useState<ComplaintCategory>('OTHER');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [complaintFiles, setComplaintFiles] = useState<File[]>([]);
  const [rating, setRating] = useState<RatingDTO | null | undefined>(undefined);  // undefined = not loaded, null = 404
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    apiRequest<Order>(`/user/orders/${id}`)
      .then(setOrder)
      .catch(() => {
        addToast('error', 'Order not found');
        navigate('/orders');
      })
      .finally(() => setLoading(false));
  }, [token, id, navigate, addToast, apiRequest]);

  useEffect(() => {
    if (!id || order?.status !== 'COMPLETED') return;
    apiRequest<CompletionProof>(`/user/orders/${id}/completion-proof`)
      .then(setProof)
      .catch(() => setProof(null));
  }, [id, order?.status, apiRequest]);

  useEffect(() => {
    if (!id || order?.status !== 'CLOSED') return;
    apiRequest<RatingDTO>(`/user/orders/${id}/rating`)
      .then(setRating)
      .catch(() => setRating(null));
  }, [id, order?.status, apiRequest]);

  const handleConfirm = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await apiRequest<Order>(`/user/orders/${id}/confirm`, { method: 'POST' });
      setOrder(updated);
      addToast('success', 'Order closed', 'Thank you for confirming.');
    } catch (err) {
      addToast('error', 'Action failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await apiRequest<Order>(`/user/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      setOrder(updated);
      addToast('success', 'Order cancelled');
    } catch (err) {
      addToast('error', 'Cancel failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (!id) return;
    if (ratingStars < 1 || ratingStars > 5) {
      addToast('error', 'Please select 1–5 stars');
      return;
    }
    setRatingSubmitting(true);
    try {
      const r = await apiRequest<RatingDTO>(`/user/orders/${id}/rating`, {
        method: 'POST',
        body: JSON.stringify({ stars: ratingStars, comment: ratingComment.trim() || undefined }),
      });
      setRating(r);
      addToast('success', 'Rating submitted. Thank you!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addToast('error', 'Submit failed', msg);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleComplaintSubmit = async () => {
    if (!id) return;
    const subj = complaintSubject.trim();
    const desc = complaintDescription.trim();
    if (!subj) {
      addToast('error', 'Subject is required');
      return;
    }
    if (!desc) {
      addToast('error', 'Description is required');
      return;
    }
    if (complaintFiles.length > MAX_COMPLAINT_IMAGES) {
      addToast('error', `Maximum ${MAX_COMPLAINT_IMAGES} images allowed`);
      return;
    }
    setComplaintSubmitting(true);
    try {
      const form = new FormData();
      form.append('subject', subj);
      form.append('category', complaintCategory);
      form.append('description', desc);
      complaintFiles.forEach((f) => form.append('files', f));
      const ticket = await apiMultipart<ComplaintTicketDTO>(`/user/orders/${id}/complaints`, form);
      addToast('success', 'Complaint submitted');
      setComplaintModalOpen(false);
      setComplaintSubject('');
      setComplaintCategory('OTHER');
      setComplaintDescription('');
      setComplaintFiles([]);
      navigate(`/complaints/${ticket.id}`);
    } catch (err) {
      addToast('error', 'Submit failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setComplaintSubmitting(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading…</p>
      </div>
    );
  }

  const canCancel = order.status === 'PLACED' || order.status === 'MERCHANT_ASSIGNED';
  const canConfirm = order.status === 'COMPLETED';
  const terminal = ['CANCELLED', 'EXPIRED', 'CLOSED'].includes(order.status);
  const showProofSection = order.status === 'COMPLETED' && proof;
  const canRaiseComplaint = ['ACCEPTED', 'COMPLETED', 'CLOSED'].includes(order.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={order.status} />
            <span className="text-lg font-medium text-neutral-700">{order.serviceNameSnapshot}</span>
          </div>
          <p className="mt-2 text-sm text-neutral-600">{formatCurrency(order.priceCents)} · {order.durationMinutesSnapshot} min</p>
          <p className="mt-2 text-sm font-medium text-neutral-700">Scheduled: {formatScheduled(order.scheduledAt)}</p>
          <p className="mt-4 text-neutral-900">{order.address}</p>
          {order.notes && (
            <p className="mt-2 text-sm text-neutral-600">
              <span className="font-medium">Notes:</span> {order.notes}
            </p>
          )}
          {order.cancelReason && (
            <p className="mt-2 text-sm text-neutral-500">
              <span className="font-medium">Cancel reason:</span> {order.cancelReason}
            </p>
          )}
          <p className="mt-4 text-sm text-neutral-500">Created {formatDate(order.createdAt)}</p>

          {order.status === 'CLOSED' && rating !== undefined && (
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <p className="text-sm font-medium text-neutral-700 mb-2">Rating</p>
              {rating ? (
                <div className="rounded-lg bg-neutral-50 p-3">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={s <= rating.stars ? 'text-amber-500' : 'text-neutral-300'}>★</span>
                    ))}
                  </div>
                  {rating.comment && <p className="text-sm text-neutral-700 mt-1">{rating.comment}</p>}
                  <p className="text-xs text-neutral-500 mt-1">Rated {formatDate(rating.createdAt)}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-neutral-200 p-4">
                  <p className="text-sm font-medium text-neutral-700 mb-2">Rate this service</p>
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRatingStars(s)}
                        className={`text-2xl transition-colors ${s <= ratingStars ? 'text-amber-500' : 'text-neutral-300 hover:text-amber-400'}`}
                        aria-label={`${s} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 min-h-[60px] mb-3"
                    placeholder="Optional comment (max 1000 chars)"
                    maxLength={1000}
                  />
                  <Button onClick={handleRatingSubmit} disabled={ratingSubmitting}>
                    {ratingSubmitting ? 'Submitting…' : 'Submit rating'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {canRaiseComplaint && (
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <Button variant="outline" onClick={() => setComplaintModalOpen(true)}>
                Raise a Complaint
              </Button>
            </div>
          )}

          {showProofSection && (
            <div className="mt-6 border-t border-neutral-200 pt-6">
              <p className="text-sm font-medium text-neutral-700 mb-2">Completion proof</p>
              <p className="text-neutral-600 text-sm whitespace-pre-wrap">{proof.completionNotes}</p>
              {proof.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {proof.attachments.map((a, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImageModalUrl(a.publicUrl)}
                      className="block rounded-lg overflow-hidden border border-neutral-200 hover:border-neutral-400 transition-colors"
                    >
                      <img
                        src={a.publicUrl}
                        alt={a.label || a.fileName}
                        className="h-24 w-24 object-cover"
                      />
                      {a.label && (
                        <span className="block text-xs text-center py-1 bg-neutral-100 text-neutral-600">{a.label}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {canConfirm && (
              <Button size="lg" onClick={handleConfirm} disabled={actionLoading}>
                {actionLoading ? 'Confirming…' : 'Confirm Completion'}
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" size="lg" onClick={() => setCancelOpen(true)} disabled={actionLoading}>
                Cancel Order
              </Button>
            )}
            {terminal && (
              <p className="text-sm text-neutral-500">No further actions.</p>
            )}
          </div>
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

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel order"
        description="Your order will be cancelled. You can add a reason below."
        confirmLabel="Confirm cancel"
        cancelLabel="Back"
        variant="destructive"
        reasonLabel="Reason (optional)"
        reasonPlaceholder="e.g. Wrong address"
        onConfirm={handleCancel}
        loading={actionLoading}
      />

      {complaintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-semibold text-neutral-900">Raise a Complaint</h2>
            <p className="mt-1 text-sm text-neutral-600">Subject and description are required. You may attach up to 4 images.</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Subject</label>
                <input
                  type="text"
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900"
                  placeholder="Short summary"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Category</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value as ComplaintCategory)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900"
                >
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Description</label>
                <textarea
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 min-h-[100px]"
                  placeholder="Describe the issue in detail"
                  maxLength={4000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Images (optional, max {MAX_COMPLAINT_IMAGES})</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => setComplaintFiles(Array.from(e.target.files || []).slice(0, MAX_COMPLAINT_IMAGES))}
                  className="mt-1 w-full text-sm text-neutral-600"
                />
                {complaintFiles.length > 0 && (
                  <p className="mt-1 text-xs text-neutral-500">{complaintFiles.length} file(s) selected</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setComplaintModalOpen(false)} disabled={complaintSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleComplaintSubmit} disabled={complaintSubmitting}>
                {complaintSubmitting ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
