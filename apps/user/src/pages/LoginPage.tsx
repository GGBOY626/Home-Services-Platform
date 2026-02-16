import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@home-services/ui';
import { Button } from '@home-services/ui';
import { Input } from '@home-services/ui';
import { Label } from '@home-services/ui';
import { useAuth } from '../auth';
import { useToast } from '@home-services/ui';

export function LoginPage() {
  const [email, setEmail] = useState('user@demo.com');
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
      addToast('success', 'Signed in', 'Welcome back.');
      navigate('/');
    } catch (err) {
      addToast('error', 'Login failed', err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4">
      <Card className="w-full max-w-md rounded-2xl border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@demo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-[var(--app-cta)] hover:bg-[var(--app-cta-hover)] text-white" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="mt-4 text-center text-sm text-[var(--app-text-muted)]">
              Don&apos;t have an account? <Link to="/register" className="font-medium text-[var(--app-text)] hover:underline">Register</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
