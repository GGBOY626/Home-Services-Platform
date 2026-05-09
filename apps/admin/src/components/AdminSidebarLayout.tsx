import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from '@home-services/ui';

const navItems = [
  { path: '/orders', label: 'Orders' },
  { path: '/ratings', label: 'Ratings' },
  { path: '/complaints', label: 'Complaints' },
  { path: '/catalog', label: 'Catalog' },
  { path: '/finance', label: 'Finance' },
  { path: '/merchants', label: 'Merchants' },
  { path: '/applications/workers', label: 'Worker Applications' },
  { path: '/applications/merchants', label: 'Merchant Applications' },
  { path: '/payments', label: 'Payments' },
  { path: '/refund-requests', label: 'Refund Requests' },
  { path: '/audit', label: 'Audit Logs' },
  { path: '/settings', label: 'Settings' },
];

export function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[var(--app-bg)]">
      <aside className="w-52 flex flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] shrink-0">
        <div className="flex h-12 items-center border-b border-[var(--app-border)] px-4">
          <span className="text-sm font-semibold text-[var(--app-text)] tracking-tight">Admin</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
          {navItems.map(({ path, label }) => {
            const active = location.pathname === path || (path !== '/orders' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`block rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--app-nav-active)] text-[var(--app-text)]'
                    : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover)] hover:text-[var(--app-text)]'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--app-border)] p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)]" onClick={() => { logout(); navigate('/login'); }}>
            Log out
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-12 items-center border-b border-[var(--app-border)] bg-[var(--app-surface)] px-5">
          <h1 className="text-base font-semibold text-[var(--app-text)] tracking-tight">Platform Admin</h1>
        </header>
        <main className="flex-1 p-5 bg-[var(--app-bg)]">{children}</main>
      </div>
    </div>
  );
}
