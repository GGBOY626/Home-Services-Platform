import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from '@home-services/ui';

const navItems = [
  { path: '/orders', label: 'Orders' },
  { path: '/catalog', label: 'Catalog' },
  { path: '/finance', label: 'Finance' },
  { path: '/merchants', label: 'Merchants' },
  { path: '/audit', label: 'Audit Logs' },
  { path: '/settings', label: 'Settings' },
];

export function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="w-56 flex flex-col border-r border-neutral-200 bg-white">
        <div className="flex h-14 items-center border-b border-neutral-200 px-4">
          <span className="font-semibold text-neutral-900">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ path, label }) => {
            const active = location.pathname === path || (path !== '/orders' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-200 p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { logout(); navigate('/login'); }}>
            Log out
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-neutral-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-neutral-900">Platform Admin</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
