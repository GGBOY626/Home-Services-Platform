import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { Dialog, DialogFooter } from '@home-services/ui';
import type { WorkerSummary } from '@home-services/shared';

type AvailabilityFilter = 'ALL' | 'ONLINE' | 'OFFLINE';

interface CreateWorkerResponse {
  worker: WorkerSummary;
  tempPassword: string;
}

export function WorkersPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AvailabilityFilter>('ALL');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [createdWorkerEmail, setCreatedWorkerEmail] = useState<string | null>(null);

  // Edit dialog
  const [editWorker, setEditWorker] = useState<WorkerSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    api<WorkerSummary[]>('/merchant/workers')
      .then((data) => setWorkers(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load workers', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast]);

  const filtered =
    filter === 'ALL' ? workers : workers.filter((w) => (w.availability ?? 'OFFLINE') === filter);

  const handleCreate = async () => {
    if (!createName.trim() || !createEmail.trim()) {
      addToast('error', 'Name and email are required');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await api<CreateWorkerResponse>('/merchant/workers', {
        method: 'POST',
        body: JSON.stringify({ displayName: createName.trim(), email: createEmail.trim() }),
      });
      setWorkers((prev) => [...prev, res.worker]);
      setTempPassword(res.tempPassword);
      setCreatedWorkerEmail(createEmail.trim());
      setCreateName('');
      setCreateEmail('');
      addToast('success', 'Worker created');
    } catch (err) {
      addToast('error', 'Failed to create worker', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editWorker || !editName.trim()) return;
    setEditLoading(true);
    try {
      const updated = await api<WorkerSummary>(`/merchant/workers/${editWorker.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayName: editName.trim() }),
      });
      setWorkers((prev) => prev.map((w) => (w.id === editWorker.id ? updated : w)));
      setEditWorker(null);
      addToast('success', 'Worker updated');
    } catch (err) {
      addToast('error', 'Failed to update worker', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (worker: WorkerSummary) => {
    if (!confirm(`Delete worker "${worker.displayName}"? This cannot be undone.`)) return;
    setDeleteLoading(worker.id);
    try {
      await api(`/merchant/workers/${worker.id}`, { method: 'DELETE' });
      setWorkers((prev) => prev.filter((w) => w.id !== worker.id));
      addToast('success', 'Worker deleted');
    } catch (err) {
      addToast('error', 'Failed to delete worker', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeleteLoading(null);
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-neutral-900">Workers</h2>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AvailabilityFilter)}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
          >
            <option value="ALL">All</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
          <Button onClick={() => { setCreateOpen(true); setTempPassword(null); }}>
            + Add Worker
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-xl border-neutral-200">
          <CardContent className="py-12 text-center text-neutral-500">
            {workers.length === 0 ? 'No workers yet. Add your first worker.' : 'No workers match the filter.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((w) => (
            <Card key={w.id} className="rounded-xl border-neutral-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-neutral-900">{w.displayName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      (w.availability ?? 'OFFLINE') === 'ONLINE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {w.availability ?? 'OFFLINE'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">ID: {w.id.slice(0, 8)}…</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditWorker(w); setEditName(w.displayName); }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(w)}
                    disabled={deleteLoading === w.id}
                  >
                    {deleteLoading === w.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => { setCreateOpen(open); if (!open) { setTempPassword(null); setCreatedWorkerEmail(null); } }}
        title="Add Worker"
        description="Create a new worker account. A temporary password will be generated."
      >
        {tempPassword ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-800">Worker created successfully</p>
            <p className="mt-1 text-sm text-amber-700">Share this temporary password with the worker. It won't be shown again.</p>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-neutral-600">Email: <span className="font-mono">{createdWorkerEmail}</span></p>
              <p className="text-sm text-neutral-600">Password: <span className="font-mono font-bold">{tempPassword}</span></p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => { navigator.clipboard.writeText(tempPassword); addToast('success', 'Password copied'); }}
            >
              Copy password
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worker-name">Display name</Label>
              <Input id="worker-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. John Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-email">Email</Label>
              <Input id="worker-email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="worker@example.com" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setTempPassword(null); setCreatedWorkerEmail(null); }}>
            {tempPassword ? 'Close' : 'Cancel'}
          </Button>
          {!tempPassword && (
            <Button onClick={handleCreate} disabled={createLoading || !createName.trim() || !createEmail.trim()}>
              {createLoading ? 'Creating…' : 'Create Worker'}
            </Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editWorker}
        onOpenChange={(open) => !open && setEditWorker(null)}
        title="Edit Worker"
        description="Update the worker's display name."
      >
        <div className="space-y-2">
          <Label htmlFor="edit-worker-name">Display name</Label>
          <Input id="edit-worker-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditWorker(null)}>Cancel</Button>
          <Button onClick={handleEdit} disabled={editLoading || !editName.trim()}>
            {editLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
