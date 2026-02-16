import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { Input } from '@home-services/ui';
import { Label } from '@home-services/ui';
import { Dialog, DialogFooter } from '@home-services/ui';
import { formatCurrency } from '@home-services/shared';
import type { ServiceCategoryDTO, ServiceItemDTO } from '@home-services/shared';

export function CatalogPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [categories, setCategories] = useState<ServiceCategoryDTO[]>([]);
  const [items, setItems] = useState<ServiceItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryModal, setCategoryModal] = useState<'create' | number | null>(null);
  const [itemModal, setItemModal] = useState<'create' | number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      api<ServiceCategoryDTO[]>('/admin/catalog/categories'),
      api<ServiceItemDTO[]>('/admin/catalog/items'),
    ])
      .then(([cats, its]) => {
        setCategories(cats);
        setItems(its);
      })
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load catalog', err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [api, addToast]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading catalog…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-neutral-900">Catalog</h2>

      <Card className="rounded-2xl border-neutral-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-neutral-800">Categories</h3>
            <Button size="sm" onClick={() => setCategoryModal('create')}>
              Add category
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="py-2 font-medium text-neutral-700">Code</th>
                  <th className="py-2 font-medium text-neutral-700">Name</th>
                  <th className="py-2 font-medium text-neutral-700">Active</th>
                  <th className="py-2 font-medium text-neutral-700">Sort</th>
                  <th className="py-2 font-medium text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-100">
                    <td className="py-2 text-neutral-900">{c.code}</td>
                    <td className="py-2 text-neutral-700">{c.name}</td>
                    <td className="py-2">{c.isActive ? 'Yes' : 'No'}</td>
                    <td className="py-2 text-neutral-600">{c.sortOrder}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setCategoryModal(c.id)}
                        className="text-neutral-600 hover:text-neutral-900 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-neutral-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-neutral-800">Service items</h3>
            <Button size="sm" onClick={() => setItemModal('create')}>
              Add item
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left">
                  <th className="py-2 font-medium text-neutral-700">Code</th>
                  <th className="py-2 font-medium text-neutral-700">Name</th>
                  <th className="py-2 font-medium text-neutral-700">Category</th>
                  <th className="py-2 font-medium text-neutral-700">Base price</th>
                  <th className="py-2 font-medium text-neutral-700">Duration</th>
                  <th className="py-2 font-medium text-neutral-700">Active</th>
                  <th className="py-2 font-medium text-neutral-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-neutral-100">
                    <td className="py-2 text-neutral-900">{i.code}</td>
                    <td className="py-2 text-neutral-700">{i.name}</td>
                    <td className="py-2 text-neutral-600">{i.categoryName ?? i.categoryCode ?? i.categoryId}</td>
                    <td className="py-2">{formatCurrency(i.basePriceCents)}</td>
                    <td className="py-2">{i.durationMinutes} min</td>
                    <td className="py-2">{i.isActive ? 'Yes' : 'No'}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setItemModal(i.id)}
                        className="text-neutral-600 hover:text-neutral-900 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {categoryModal !== null && (
        <CategoryModal
          key={categoryModal}
          categories={categories}
          editId={categoryModal === 'create' ? null : categoryModal}
          onClose={() => setCategoryModal(null)}
          onSaved={() => {
            setCategoryModal(null);
            load();
          }}
          api={api}
          addToast={addToast}
          saving={saving}
          setSaving={setSaving}
        />
      )}
      {itemModal !== null && (
        <ItemModal
          key={itemModal}
          categories={categories}
          items={items}
          editId={itemModal === 'create' ? null : itemModal}
          onClose={() => setItemModal(null)}
          onSaved={() => {
            setItemModal(null);
            load();
          }}
          api={api}
          addToast={addToast}
          saving={saving}
          setSaving={setSaving}
        />
      )}
    </div>
  );
}

function CategoryModal({
  categories,
  editId,
  onClose,
  onSaved,
  api,
  addToast,
  saving,
  setSaving,
}: {
  categories: ServiceCategoryDTO[];
  editId: number | null;
  onClose: () => void;
  onSaved: () => void;
  api: (path: string, opts?: { method?: string; body?: string }) => Promise<ServiceCategoryDTO>;
  addToast: (type: 'error' | 'success', msg: string) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const existing = editId ? categories.find((c) => c.id === editId) : null;
  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(existing?.sortOrder ?? 0));

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      addToast('error', 'Code and name required');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api(`/admin/catalog/categories/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            description: description.trim() || null,
            isActive,
            sortOrder: parseInt(sortOrder, 10) || 0,
          }),
        });
        addToast('success', 'Category updated');
      } else {
        await api('/admin/catalog/categories', {
          method: 'POST',
          body: JSON.stringify({
            code: code.trim(),
            name: name.trim(),
            description: description.trim() || null,
            isActive,
            sortOrder: parseInt(sortOrder, 10) || 0,
          }),
        });
        addToast('success', 'Category created');
      }
      onSaved();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={editId ? 'Edit category' : 'New category'}>
      <div className="space-y-4">
        <div>
          <Label>Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CLEANING" className="mt-1" />
        </div>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="mt-1" />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="cat-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <Label htmlFor="cat-active">Active</Label>
        </div>
        <div>
          <Label>Sort order</Label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="mt-1 w-24" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogFooter>
    </Dialog>
  );
}

function ItemModal({
  categories,
  items,
  editId,
  onClose,
  onSaved,
  api,
  addToast,
  saving,
  setSaving,
}: {
  categories: ServiceCategoryDTO[];
  items: ServiceItemDTO[];
  editId: number | null;
  onClose: () => void;
  onSaved: () => void;
  api: (path: string, opts?: { method?: string; body?: string }) => Promise<ServiceItemDTO>;
  addToast: (type: 'error' | 'success', msg: string) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const existing = editId ? items.find((i) => i.id === editId) : null;
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? 0);
  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [basePriceDollars, setBasePriceDollars] = useState(
    existing ? (existing.basePriceCents / 100).toFixed(2) : '80.00'
  );
  const [durationMinutes, setDurationMinutes] = useState(String(existing?.durationMinutes ?? 120));
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      addToast('error', 'Code and name required');
      return;
    }
    const cents = Math.round(parseFloat(basePriceDollars) * 100) || 0;
    const mins = parseInt(durationMinutes, 10) || 60;
    if (cents < 0 || mins < 1) {
      addToast('error', 'Invalid price or duration');
      return;
    }
    setSaving(true);
    try {
      const body = {
        categoryId,
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        basePriceCents: cents,
        durationMinutes: mins,
        isActive,
      };
      if (editId) {
        await api(`/admin/catalog/items/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
        addToast('success', 'Item updated');
      } else {
        await api('/admin/catalog/items', { method: 'POST', body: JSON.stringify(body) });
        addToast('success', 'Item created');
      }
      onSaved();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={editId ? 'Edit service item' : 'New service item'}>
      <div className="space-y-4">
        <div>
          <Label>Category</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CLEANING_BASIC" className="mt-1" />
        </div>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="mt-1" />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Base price ($)</Label>
          <Input type="number" step="0.01" value={basePriceDollars} onChange={(e) => setBasePriceDollars(e.target.value)} className="mt-1 w-32" />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="mt-1 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="item-active" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <Label htmlFor="item-active">Active</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogFooter>
    </Dialog>
  );
}
