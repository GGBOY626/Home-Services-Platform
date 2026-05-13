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
    <div className="flex min-h-screen bg-[var(--app-bg)]">
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } flex flex-col border-r border-[var(--app-border)] bg-[var(--app-surface)] transition-[width] duration-200`}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--app-border)] px-4">
          {sidebarOpen && <span className="font-semibold text-[var(--app-text)]">Merchant</span>}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover)]"
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
                  active ? 'bg-[var(--app-nav-active)] text-[var(--app-text)]' : 'text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover)]'
                }`}
              >
                <span>{label.charAt(0)}</span>
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
        {sidebarOpen && (
          <div className="border-t border-[var(--app-border)] p-2">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { logout(); navigate('/login'); }}>
              Log out
            </Button>
          </div>
        )}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-[var(--app-border)] bg-[var(--app-surface)] px-6">
          <h1 className="text-lg font-semibold text-[var(--app-text)]">Merchant Portal</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
        <footer className="border-t border-[var(--app-border)] py-2 text-center flex items-center justify-center gap-3 flex-wrap">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="text-[10px] text-[var(--app-text-muted)] hover:underline">
            浙ICP备2026030792号
          </a>
          <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33011002019522" target="_blank" rel="noreferrer" className="text-[10px] text-[var(--app-text-muted)] hover:underline flex items-center gap-0.5">
            <img src="https://www.beian.gov.cn/img/ghs.png" alt="" className="h-3 w-3" />
            浙公网安备33011002019522号
          </a>
        </footer>
      </div>
    </div>
  );
}
