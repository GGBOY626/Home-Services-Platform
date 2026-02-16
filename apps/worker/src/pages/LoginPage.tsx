import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@home-services/ui';
import { Button, Input, Label } from '@home-services/ui';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';

export function LoginPage() {
  const [email, setEmail] = useState('worker1@demo.com');
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
      navigate('/');
    } catch {
      addToast('error', 'Login failed', 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <Card className="w-full max-w-md rounded-xl border-[var(--app-border)] bg-[var(--app-surface)] shadow-lg">
        <CardHeader><CardTitle className="text-[var(--app-text)]">Sign in</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--app-text)]">Email</Label>
              <Input id="email" type="email" placeholder="worker1@demo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--app-text)]">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-[var(--app-cta)] hover:bg-[var(--app-cta-hover)] text-white border-0" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
            <p className="mt-4 text-center text-sm text-[var(--app-text-muted)]">
              Want to join as a worker? <Link to="/apply" className="font-medium text-[var(--app-primary)] hover:underline">Apply here</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
