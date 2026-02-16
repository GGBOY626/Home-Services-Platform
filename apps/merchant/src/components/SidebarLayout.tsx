import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from '@home-services/ui';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/orders', label: 'Orders' },
  { path: '/ratings', label: 'Ratings' },
  { path: '/complaints', label: 'Complaints' },
  { path: '/services', label: 'Services' },
  { path: '/finance', label: 'Finance' },
  { path: '/workers', label: 'Workers' },
  { path: '/settings', label: 'Settings' },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } flex flex-col border-r border-neutral-200 bg-white transition-[width] duration-200`}
      >
        <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4">
          {sidebarOpen && <span className="font-semibold text-neutral-900">Merchant</span>}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map(({ path, label }) => {
            const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <span>{label.charAt(0)}</span>
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
        {sidebarOpen && (
          <div className="border-t border-neutral-200 p-2">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { logout(); navigate('/login'); }}>
              Log out
            </Button>
          </div>
        )}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-neutral-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-neutral-900">Merchant Portal</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
