import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Order, CompletionProof, WorkerMeResponse } from '@home-services/shared';
import { haversineKm, formatDistance, api as sharedApi } from '@home-services/shared';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { useApi } from '../lib/useApi';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatDate, formatCurrency, formatScheduled } from '../lib/format';

const LABELS = ['', 'BEFORE', 'AFTER'] as const;

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { api, apiMultipart } = useApi();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [workerMe, setWorkerMe] = useState<WorkerMeResponse | null>(null);
  const [proof, setProof] = useState<CompletionProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    api<Order>(`/worker/orders/${id}`)
      .then(setOrder)
      .catch(() => {
        addToast('error', 'Order not found');
        navigate('/');
      })
      .finally(() => setLoading(false));
    sharedApi<WorkerMeResponse>('/worker/me', { token }).then(setWorkerMe).catch(() => {});
  }, [id, navigate, addToast, api, token]);

  // Only fetch proof when COMPLETED (to show read-only). For ACCEPTED, no proof exists yet.
  useEffect(() => {
    if (!id || order?.status !== 'COMPLETED') return;
    api<CompletionProof>(`/worker/orders/${id}/completion-proof`)
      .then(setProof)
      .catch(() => setProof(null));
  }, [id, order?.status, api]);

  const handleAccept = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/accept`, { method: 'POST' });
      setOrder(updated);
      addToast('success', 'Order accepted');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteWithProof = async () => {
    if (!id) return;
    const trimmed = notes.trim();
    if (trimmed.length < 10) {
      addToast('error', 'Completion notes must be at least 10 characters');
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('completionNotes', trimmed);
      labels.forEach((l, i) => formData.append('labels', l));
      files.forEach((f) => formData.append('files', f));
      const updated = await apiMultipart<Order>(`/worker/orders/${id}/complete-with-proof`, formData);
      setOrder(updated);
      setNotes('');
      setFiles([]);
      setLabels([]);
      addToast('success', 'Job completed');
      if (updated.status === 'COMPLETED') {
        api<CompletionProof>(`/worker/orders/${id}/completion-proof`).then(setProof);
      }
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await api<Order>(`/worker/orders/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      setOrder(updated);
      addToast('success', 'Order rejected');
    } catch (e) {
      addToast('error', 'Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => f.type.startsWith('image/'));
    if (valid.length + files.length > 6) {
      addToast('error', 'Maximum 6 images allowed');
      return;
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 6));
    setLabels((prev) => [...prev, ...valid.map(() => '')]);
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setLabels((prev) => prev.filter((_, i) => i !== idx));
  };

  if (loading || !order) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-[var(--app-text-muted)]">Loading…</p>
      </div>
    );
  }

  const canAccept = order.status === 'WORKER_ASSIGNED';
  const canComplete = order.status === 'ACCEPTED';
  const showProofReadOnly = order.status === 'COMPLETED' && proof;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Card className="rounded-xl border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <StatusBadge status={order.status} />
            <span className="text-lg font-medium text-[var(--app-text-muted)]">{order.serviceNameSnapshot}</span>
          </div>
          <p className="text-sm text-[var(--app-text-muted)]">{formatCurrency(order.priceCents)} · {order.durationMinutesSnapshot} min</p>
          <p className="text-2xl font-bold text-[var(--app-text)]">{formatScheduled(order.scheduledAt)}</p>
          <p className="mt-1 text-lg font-semibold text-[var(--app-text)]">{order.address}</p>
          {/* Distance from worker's home to job site */}
          {(() => {
            const hasOrder = order.addressLat != null && order.addressLng != null;
            const hasWorker = workerMe?.homeLat != null && workerMe?.homeLng != null;
            if (hasOrder && hasWorker) {
              const km = haversineKm(workerMe!.homeLat!, workerMe!.homeLng!, order.addressLat!, order.addressLng!);
              return (
                <p className="mt-1 text-sm text-[var(--app-primary)] font-medium">
                  📍 {formatDistance(km)} from your home
                </p>
              );
            }
            if (!hasWorker) {
              return (
                <p className="mt-1 text-sm text-amber-600">
                  📍 Distance unavailable —{' '}
                  <Link to="/profile" className="underline hover:no-underline">set your home address</Link> to see distance
                </p>
              );
            }
            return null;
          })()}
          {order.notes && (
            <p className="mt-3 text-[var(--app-text-muted)]"><span className="font-medium text-[var(--app-text)]">Notes:</span> {order.notes}</p>
          )}
          <p className="mt-4 text-sm text-[var(--app-text-muted)]">Created {formatDate(order.createdAt)}</p>

          {canComplete && (
            <div className="mt-6 space-y-4 border-t border-[var(--app-border)] pt-6">
              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Completion notes (required, min 10 chars)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe what was done, any issues, etc. Type at least 10 characters to enable the submit button."
                  rows={4}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--app-primary)]"
                />
                {notes.trim().length > 0 && notes.trim().length < 10 && (
                  <p className="mt-1 text-xs text-amber-600">{10 - notes.trim().length} more character(s) needed</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Attachments (optional, max 6 images)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Add images
                </Button>
                {files.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-[var(--app-text)] truncate flex-1">{f.name}</span>
                        <select
                          value={labels[idx] || ''}
                          onChange={(e) => setLabels((p) => p.map((l, i) => (i === idx ? e.target.value : l)))}
                          className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs text-neutral-900"
                        >
                          {LABELS.map((l) => (
                            <option key={l} value={l}>{l || '—'}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeFile(idx)} className="text-red-600 hover:underline">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button size="lg" className="bg-[var(--app-cta)] hover:bg-[var(--app-cta-hover)] text-white" onClick={handleCompleteWithProof} disabled={actionLoading || notes.trim().length < 10}>
                {actionLoading ? 'Submitting…' : 'Submit Proof & Complete'}
              </Button>
            </div>
          )}

          {showProofReadOnly && (
            <div className="mt-6 border-t border-[var(--app-border)] pt-6">
              <p className="text-sm font-medium text-[var(--app-text)] mb-2">Completion proof</p>
              <p className="text-[var(--app-text-muted)] text-sm whitespace-pre-wrap">{proof.completionNotes}</p>
              {proof.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {proof.attachments.map((a, idx) => (
                    <a key={idx} href={a.publicUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {a.label ? `[${a.label}] ` : ''}{a.fileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {canAccept && (
              <>
                <Button size="lg" className="bg-[var(--app-cta)] hover:bg-[var(--app-cta-hover)] text-white" onClick={handleAccept} disabled={actionLoading}>
                  {actionLoading ? 'Processing…' : 'Accept Job'}
                </Button>
                <Button variant="destructive" size="lg" onClick={() => setRejectOpen(true)} disabled={actionLoading}>
                  Reject
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject job"
        description="This order will be returned to the merchant."
        confirmLabel="Confirm reject"
        variant="destructive"
        reasonLabel="Reason (optional)"
        reasonPlaceholder="e.g. Not available"
        onConfirm={handleReject}
        loading={actionLoading}
      />
    </div>
  );
}
