import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { api } from '@home-services/shared';
import type { MerchantMeResponse } from '@home-services/shared';
import { Card, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { useToast } from '@home-services/ui';
import { useNavigate } from 'react-router-dom';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

export function SettingsPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [businessAddress, setBusinessAddress] = useState('');
  const [businessLat, setBusinessLat] = useState<number | null>(null);
  const [businessLng, setBusinessLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  useEffect(() => {
    api<MerchantMeResponse>('/merchant/me', { token }).then((me) => {
      if (me.businessAddress) {
        setBusinessAddress(me.businessAddress);
        setBusinessLat(me.businessLat);
        setBusinessLng(me.businessLng);
        setLocationSaved(true);
      }
    }).catch(() => {});
  }, [token]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('error', 'Error', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      addToast('error', 'Error', 'New password must be at least 8 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
        token,
      });
      addToast('success', 'Password changed', 'Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast('error', 'Failed', err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!businessAddress || businessLat === null || businessLng === null) {
      addToast('error', 'Please select an address from the suggestions');
      return;
    }
    setLocationLoading(true);
    try {
      await api('/merchant/me/location', {
        method: 'PATCH',
        body: JSON.stringify({ address: businessAddress, lat: businessLat, lng: businessLng }),
        token,
      });
      addToast('success', 'Business address saved', 'Distance to jobs will now be calculated from your business location.');
      setLocationSaved(true);
    } catch (err) {
      addToast('error', 'Failed to save address', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Settings</h2>

      <Card className="rounded-xl border-neutral-200 max-w-md">
        <CardContent className="p-6 space-y-2">
          <p className="text-sm text-neutral-500">Merchant</p>
          <p className="font-medium text-neutral-900">Demo Cleaning Co</p>
          <Button variant="outline" className="mt-2" onClick={() => { logout(); navigate('/login'); }}>
            Log out
          </Button>
        </CardContent>
      </Card>

      {/* Business address for distance calculation */}
      <Card className="rounded-xl border-neutral-200 max-w-md">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Business address</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Set your business address to show distance from your base to each customer's location.
            This also serves as the fallback when a worker has not set their own home address.
          </p>
          {locationSaved && businessAddress && (
            <div className="mb-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              ✓ Saved: {businessAddress}
            </div>
          )}
          <AddressAutocomplete
            value={businessAddress}
            onChange={(addr, lat, lng) => { setBusinessAddress(addr); setBusinessLat(lat); setBusinessLng(lng); setLocationSaved(false); }}
            placeholder="Search your business address…"
          />
          <Button
            className="mt-3"
            onClick={handleSaveLocation}
            disabled={locationLoading || !businessAddress}
          >
            {locationLoading ? 'Saving…' : 'Save address'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-neutral-200 max-w-md">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Current password</Label>
              <Input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={pwLoading}>{pwLoading ? 'Changing…' : 'Change password'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
