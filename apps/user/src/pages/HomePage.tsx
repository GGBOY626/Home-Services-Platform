import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { Input } from '@home-services/ui';
import { Label } from '@home-services/ui';
import { Dialog, DialogFooter } from '@home-services/ui';
import { useApi } from '../lib/useApi';
import { useToast } from '@home-services/ui';
import { ServiceCard } from '../components/ServiceCard';
import { formatCurrency } from '@home-services/shared';
import type { Order, CategoryWithItemsDTO } from '@home-services/shared';

const CATEGORY_ICONS: Record<string, string> = {
  CLEANING: '🧹',
  CURTAIN_INSTALL: '🪟',
  MAINTENANCE: '🔧',
};

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function nextDayAt10(): { date: string; time: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const date = d.toISOString().slice(0, 10);
  return { date, time: '10:00' };
}

export function HomePage() {
  const [address, setAddress] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryWithItemsDTO[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [bookingCategory, setBookingCategory] = useState<CategoryWithItemsDTO | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const { api } = useApi();
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    api<CategoryWithItemsDTO[]>('/public/categories')
      .then(setCategories)
      .catch(() => addToast('error', 'Failed to load services'))
      .finally(() => setCategoriesLoading(false));
  }, [api, addToast]);

  const openBookModal = (cat: CategoryWithItemsDTO) => {
    setBookingCategory(cat);
    const first = cat.items[0];
    setSelectedItemId(first ? first.id : null);
    const { date, time } = nextDayAt10();
    setScheduleDate(date);
    setScheduleTime(time);
    setBookOpen(true);
  };

  function buildScheduledAtISO(): string {
    const [y, m, d] = scheduleDate.split('-').map(Number);
    const [hh, min] = scheduleTime.split(':').map(Number);
    const date = new Date(y, m - 1, d, hh, min, 0, 0);
    return date.toISOString();
  }

  const selectedItem = bookingCategory?.items.find((i) => i.id === selectedItemId) ?? null;

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      addToast('error', 'Address required');
      return;
    }
    if (!selectedItemId) {
      addToast('error', 'Please select a service');
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      addToast('error', 'Please select appointment date and time');
      return;
    }
    setLoading(true);
    try {
      const scheduledAt = buildScheduledAtISO();
      const order = await api<Order>('/user/orders', {
        method: 'POST',
        body: JSON.stringify({
          serviceItemId: selectedItemId,
          address: address.trim(),
          notes: notes.trim() || null,
          scheduledAt,
        }),
      });
      addToast('success', 'Order placed');
      setBookOpen(false);
      setBookingCategory(null);
      setSelectedItemId(null);
      setNotes('');
      navigate('/orders', { state: { highlightOrderId: order.id } });
    } catch (err) {
      addToast('error', 'Failed to place order', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card className="mb-8 rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6">
          <Label htmlFor="service-address" className="text-base font-medium text-neutral-700">
            Service Address
          </Label>
          <Input
            id="service-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your address"
            className="mt-2 h-12 rounded-xl text-base"
          />
        </CardContent>
      </Card>

      <h2 className="mb-4 text-xl font-semibold text-neutral-900">Services</h2>
      {categoriesLoading ? (
        <p className="text-neutral-500">Loading services…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => {
            const hasActiveItems = cat.items.length > 0;
            const enabled = hasActiveItems;
            return (
              <ServiceCard
                key={cat.id}
                title={cat.name}
                subtitle={cat.description || `${cat.name} services`}
                icon={CATEGORY_ICONS[cat.code] ?? '📋'}
                enabled={enabled}
                ctaLabel={enabled ? `Book ${cat.name}` : 'Coming soon'}
                onCta={() => (enabled ? openBookModal(cat) : undefined)}
              />
            );
          })}
        </div>
      )}

      <Dialog
        open={bookOpen}
        onOpenChange={(open) => {
          setBookOpen(open);
          if (!open) setBookingCategory(null);
        }}
        title={bookingCategory ? `Book ${bookingCategory.name}` : 'Book service'}
        description="Select service, confirm address and add any notes."
      >
        <div className="space-y-4">
          {bookingCategory && bookingCategory.items.length > 1 && (
            <div className="space-y-2">
              <Label>Service</Label>
              <select
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base"
                value={selectedItemId ?? ''}
                onChange={(e) => setSelectedItemId(Number(e.target.value))}
              >
                {bookingCategory.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {formatCurrency(item.basePriceCents)} · {item.durationMinutes} min
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedItem && (
            <p className="text-sm text-neutral-600">
              {selectedItem.name}: {formatCurrency(selectedItem.basePriceCents)} · {selectedItem.durationMinutes} min
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="book-schedule-date">Appointment date</Label>
            <input
              id="book-schedule-date"
              type="date"
              value={scheduleDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-schedule-time">Appointment time (15-min increments)</Label>
            <select
              id="book-schedule-time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-address">Address</Label>
            <Input
              id="book-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Service address"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-notes">Notes (optional)</Label>
            <Input
              id="book-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Access instructions, special requests…"
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBookOpen(false)} disabled={loading}>
            Back
          </Button>
          <Button onClick={handlePlaceOrder} disabled={loading || !selectedItemId}>
            {loading ? 'Placing order…' : 'Place Order'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
