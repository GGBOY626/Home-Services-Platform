import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { api } from '@home-services/shared';
import type { WorkerMeResponse } from '@home-services/shared';
import { Card, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { useToast } from '@home-services/ui';
import { useNavigate } from 'react-router-dom';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

export function ProfilePage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [homeAddress, setHomeAddress] = useState('');
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  useEffect(() => {
    api<WorkerMeResponse>('/worker/me', { token }).then((me) => {
      if (me.homeAddress) {
        setHomeAddress(me.homeAddress);
        setHomeLat(me.homeLat);
        setHomeLng(me.homeLng);
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
    if (!homeAddress || homeLat === null || homeLng === null) {
      addToast('error', 'Please select an address from the suggestions');
      return;
    }
    setLocationLoading(true);
    try {
      await api('/worker/me/location', {
        method: 'PATCH',
        body: JSON.stringify({ address: homeAddress, lat: homeLat, lng: homeLng }),
        token,
      });
      addToast('success', 'Home address saved', 'Distance to jobs will now be calculated from your address.');
      setLocationSaved(true);
    } catch (err) {
      addToast('error', 'Failed to save address', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="mb-6 text-xl font-bold text-[var(--app-text)]">Profile</h1>

      <Card className="rounded-xl border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-[var(--app-text-muted)]">Role</p>
          <p className="font-medium text-[var(--app-text)]">Worker</p>
          <p className="text-sm text-[var(--app-text-muted)] mt-4">Assigned via platform</p>
          <Button variant="outline" className="mt-4" onClick={() => { logout(); navigate('/login'); }}>
            Log out
          </Button>
        </CardContent>
      </Card>

      {/* Home address for distance calculation */}
      <Card className="rounded-xl border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-[var(--app-text)] mb-1">Home address</h2>
          <p className="text-sm text-[var(--app-text-muted)] mb-4">
            Set your home address so you can see how far each job is from your location.
          </p>
          {locationSaved && homeAddress && (
            <div className="mb-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              ✓ Saved: {homeAddress}
            </div>
          )}
          <AddressAutocomplete
            value={homeAddress}
            onChange={(addr, lat, lng) => { setHomeAddress(addr); setHomeLat(lat); setHomeLng(lng); setLocationSaved(false); }}
            placeholder="Search your home address…"
          />
          <Button
            className="mt-3 bg-[var(--app-cta)] hover:bg-[var(--app-cta-hover)] text-white"
            onClick={handleSaveLocation}
            disabled={locationLoading || !homeAddress}
          >
            {locationLoading ? 'Saving…' : 'Save address'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-[var(--app-text)] mb-4">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="current-pw" className="text-[var(--app-text)]">Current password</Label>
              <Input id="current-pw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw" className="text-[var(--app-text)]">New password</Label>
              <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw" className="text-[var(--app-text)]">Confirm new password</Label>
              <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <Button type="submit" className="bg-[var(--app-cta)] hover:bg-[var(--app-cta-hover)] text-white" disabled={pwLoading}>
              {pwLoading ? 'Changing…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
