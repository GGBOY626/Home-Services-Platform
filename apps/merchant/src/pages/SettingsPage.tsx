import { useState } from 'react';
import { useAuth } from '../auth';
import { api } from '@home-services/shared';
import { Card, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { useToast } from '@home-services/ui';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-neutral-900">Settings</h2>
      <Card className="rounded-xl border-neutral-200 max-w-md">
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-neutral-500">Merchant</p>
          <p className="font-medium text-neutral-900">Demo Cleaning Co</p>
          <Button variant="outline" onClick={() => { logout(); navigate('/login'); }}>
            Log out
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
            <Button type="submit" disabled={loading}>{loading ? 'Changing…' : 'Change password'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
