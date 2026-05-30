import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { api } from '@home-services/shared';
import { Card, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { useToast } from '@home-services/ui';
import { useNavigate } from 'react-router-dom';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

interface UserProfile {
  email: string;
  homeAddress: string | null;
  homeLat: number | null;
  homeLng: number | null;
}

export function ProfilePage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Address
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [homeAddress, setHomeAddress] = useState('');
  const [homeLat, setHomeLat] = useState<number | null>(null);
  const [homeLng, setHomeLng] = useState<number | null>(null);
  const [addrLoading, setAddrLoading] = useState(false);

  useEffect(() => {
    api<UserProfile>('/user/profile', { token }).then((p) => {
      setProfile(p);
      setHomeAddress(p.homeAddress ?? '');
      setHomeLat(p.homeLat ?? null);
      setHomeLng(p.homeLng ?? null);
    }).catch(() => {});
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrLoading(true);
    try {
      const updated = await api<UserProfile>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          homeAddress: homeAddress.trim() || null,
          homeLat: homeLat ?? null,
          homeLng: homeLng ?? null,
        }),
        token,
      });
      setProfile(updated);
      addToast('success', 'Address saved');
    } catch (err) {
      addToast('error', 'Failed', err instanceof Error ? err.message : 'Could not save address.');
    } finally {
      setAddrLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Profile</h1>

      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          {profile && (
            <div>
              <p className="text-sm text-neutral-500">Email</p>
              <p className="font-medium text-neutral-900">{profile.email}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-neutral-500">Role</p>
            <p className="font-medium text-neutral-900">Customer</p>
          </div>
          <Button variant="outline" className="mt-2" onClick={handleLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">Default address</h2>
          <p className="text-sm text-neutral-500 mb-4">Used to pre-fill the address when placing orders. You can always change it per order.</p>
          <form onSubmit={handleSaveAddress} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="home-address">Home address</Label>
              <AddressAutocomplete
                id="home-address"
                value={homeAddress}
                onChange={(addr, lat, lng) => {
                  setHomeAddress(addr);
                  setHomeLat(lat);
                  setHomeLng(lng);
                }}
                placeholder="Start typing your address…"
              />
            </div>
            <Button type="submit" disabled={addrLoading}>
              {addrLoading ? 'Saving…' : 'Save address'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-neutral-200 shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Change password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
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
