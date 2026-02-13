import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Button } from '@home-services/ui';
import { useAuth } from './auth';

export function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="text-lg font-medium text-neutral-900">Home Services — Worker</Link>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate('/login'); }}>Log out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
