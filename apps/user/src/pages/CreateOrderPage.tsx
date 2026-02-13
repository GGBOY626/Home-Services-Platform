import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@home-services/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { Input } from '@home-services/ui';
import { Label } from '@home-services/ui';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';

export function CreateOrderPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      const order = await api<{ id: string }>('/user/orders', {
        method: 'POST',
        token,
        body: JSON.stringify({
          serviceType: 'CLEANING',
          address: address.trim(),
          notes: notes.trim() || null,
        }),
      });
      addToast('success', 'Order created', 'Your cleaning order has been placed.');
      navigate(`/orders/${order.id}`);
    } catch (err) {
      addToast('error', 'Failed to create order', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New cleaning order</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Access instructions, special requests..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating…' : 'Create order'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
