import { useEffect, useState } from 'react';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { Input } from '@home-services/ui';
import { Label } from '@home-services/ui';
import { formatCurrency } from '@home-services/shared';
import type { MerchantServiceOfferDTO } from '@home-services/shared';

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(value: string): number {
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function ServicesPage() {
  const { api } = useApi();
  const { addToast } = useToast();
  const [offers, setOffers] = useState<MerchantServiceOfferDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [localPrice, setLocalPrice] = useState<Record<number, string>>({});
  const [localActive, setLocalActive] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api<MerchantServiceOfferDTO[]>('/merchant/services')
      .then((list) => {
        setOffers(list);
        const price: Record<number, string> = {};
        const active: Record<number, boolean> = {};
        list.forEach((o) => {
          price[o.serviceItemId] = centsToDollars(o.priceCents);
          active[o.serviceItemId] = o.isActive;
        });
        setLocalPrice(price);
        setLocalActive(active);
      })
      .catch((err) => {
        if (err?.message === 'Unauthorized') return;
        addToast('error', 'Failed to load services', err.message);
      })
      .finally(() => setLoading(false));
  }, [api, addToast]);

  const handleSave = async (itemId: number) => {
    setSavingId(itemId);
    try {
      const priceCents = dollarsToCents(localPrice[itemId] ?? '0');
      const isActive = localActive[itemId] ?? false;
      const updated = await api<MerchantServiceOfferDTO>(`/merchant/services/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive, priceCents }),
      });
      setOffers((prev) => prev.map((o) => (o.serviceItemId === itemId ? updated : o)));
      setLocalPrice((p) => ({ ...p, [itemId]: centsToDollars(updated.priceCents) }));
      setLocalActive((a) => ({ ...a, [itemId]: updated.isActive }));
      addToast('success', 'Saved');
    } catch (err) {
      addToast('error', 'Save failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSavingId(null);
    }
  };

  const byCategory = offers.reduce<Record<string, MerchantServiceOfferDTO[]>>((acc, o) => {
    const key = o.categoryName ?? 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-neutral-500">Loading services…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Services</h2>
      <p className="text-sm text-neutral-600">
        Enable or disable services and set your price (override base price). Price is in dollars.
      </p>
      <div className="space-y-8">
        {Object.entries(byCategory).map(([categoryName, items]) => (
          <Card key={categoryName} className="rounded-2xl border-neutral-200">
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-medium text-neutral-800">{categoryName}</h3>
              <div className="space-y-4">
                {items.map((offer) => (
                  <div
                    key={offer.serviceItemId}
                    className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900">{offer.serviceItemName}</p>
                      <p className="text-sm text-neutral-500">
                        Base: {formatCurrency(offer.basePriceCents)} · {offer.durationMinutes} min
                      </p>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={localActive[offer.serviceItemId] ?? false}
                        onChange={(e) =>
                          setLocalActive((a) => ({ ...a, [offer.serviceItemId]: e.target.checked }))
                        }
                        className="rounded border-neutral-300"
                      />
                      <span className="text-sm text-neutral-700">Active</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`price-${offer.serviceItemId}`} className="text-sm text-neutral-600">
                        Price ($)
                      </Label>
                      <Input
                        id={`price-${offer.serviceItemId}`}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24 rounded-lg"
                        value={localPrice[offer.serviceItemId] ?? ''}
                        onChange={(e) =>
                          setLocalPrice((p) => ({ ...p, [offer.serviceItemId]: e.target.value }))
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSave(offer.serviceItemId)}
                      disabled={savingId === offer.serviceItemId}
                    >
                      {savingId === offer.serviceItemId ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
