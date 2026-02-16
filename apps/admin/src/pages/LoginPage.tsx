import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';

export function LoginPage() {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      addToast('success', 'Signed in');
      navigate('/orders');
    } catch {
      addToast('error', 'Login failed', 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <Card className="w-full max-w-md rounded-lg border-[var(--app-border)] shadow-sm bg-[var(--app-surface)]">
        <CardHeader><CardTitle className="text-[var(--app-text)]">Sign in</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@demo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-[var(--app-primary)] hover:bg-[var(--app-primary-hover)]" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
