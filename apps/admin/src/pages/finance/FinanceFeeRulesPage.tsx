import { useEffect, useState } from 'react';
import { useApi } from '../../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { Input } from '@home-services/ui';
import { Label } from '@home-services/ui';
import { Dialog, DialogFooter } from '@home-services/ui';
import type { PlatformFeeRuleDTO, FeeRuleScope } from '@home-services/shared';

export function FinanceFeeRulesPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [rules, setRules] = useState<PlatformFeeRuleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [scope, setScope] = useState<FeeRuleScope>('GLOBAL');
  const [feeRateBps, setFeeRateBps] = useState('1200');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api<PlatformFeeRuleDTO[]>('/admin/finance/fee-rules')
      .then(setRules)
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load fee rules', err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setScope('GLOBAL');
    setFeeRateBps('1200');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (r: PlatformFeeRuleDTO) => {
    setEditingId(r.id);
    setScope(r.scope);
    setFeeRateBps(String(r.feeRateBps));
    setIsActive(r.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const bps = parseInt(feeRateBps, 10);
    if (Number.isNaN(bps) || bps < 0 || bps > 10000) {
      addToast('error', 'Fee rate must be 0–10000 bps');
      return;
    }
    setSaving(true);
    try {
      const effectiveFrom = new Date().toISOString();
      if (editingId != null) {
        await api(`/admin/finance/fee-rules/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            scope,
            categoryId: scope === 'CATEGORY' ? 1 : null,
            feeRateBps: bps,
            isActive,
            effectiveFrom,
            effectiveTo: null,
          }),
        });
        addToast('success', 'Fee rule updated');
      } else {
        await api('/admin/finance/fee-rules', {
          method: 'POST',
          body: JSON.stringify({
            scope,
            categoryId: scope === 'CATEGORY' ? 1 : null,
            feeRateBps: bps,
            isActive,
            effectiveFrom,
            effectiveTo: null,
          }),
        });
        addToast('success', 'Fee rule created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900">Fee Rules</h2>
        <Button size="sm" onClick={openCreate}>Add rule</Button>
      </div>

      {loading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : (
        <Card className="rounded-xl border-neutral-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">ID</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Scope</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Category ID</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Fee (bps)</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Active</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No fee rules.</td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id} className="border-b border-neutral-100">
                        <td className="px-4 py-3 font-mono">{r.id}</td>
                        <td className="px-4 py-3">{r.scope}</td>
                        <td className="px-4 py-3">{r.categoryId ?? '—'}</td>
                        <td className="px-4 py-3">{r.feeRateBps} ({r.feeRateBps / 100}%)</td>
                        <td className="px-4 py-3">{r.isActive ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen} title={editingId ? 'Edit fee rule' : 'New fee rule'}>
        <div className="space-y-4">
          <div>
            <Label>Scope</Label>
            <select value={scope} onChange={(e) => setScope(e.target.value as FeeRuleScope)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2">
              <option value="GLOBAL">GLOBAL</option>
              <option value="CATEGORY">CATEGORY</option>
            </select>
          </div>
          <div>
            <Label>Fee rate (basis points, e.g. 1200 = 12%)</Label>
            <Input type="number" value={feeRateBps} onChange={(e) => setFeeRateBps(e.target.value)} className="mt-1 w-32" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <Label>Active</Label>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
