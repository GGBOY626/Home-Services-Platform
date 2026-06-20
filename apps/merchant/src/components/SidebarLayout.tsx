import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from '@home-services/ui';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/orders', label: 'Orders', icon: '📦' },
  { path: '/ratings', label: 'Ratings', icon: '⭐' },
  { path: '/complaints', label: 'Complaints', icon: '📩' },
  { path: '/services', label: 'Services', icon: '🛎️' },
  { path: '/finance', label: 'Finance', icon: '💰' },
  { path: '/workers', label: 'Workers', icon: '👥' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-16'
        } flex flex-col border-r transition-[width] duration-200`}
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        {/* Sidebar header */}
        <div
          className="flex h-14 items-center justify-between px-4"
          style={{
            background: 'linear-gradient(135deg, var(--app-primary), var(--app-primary-hover))',
            color: '#ffffff',
          }}
        >
          {sidebarOpen && (
            <span className="font-bold tracking-tight text-white">
              🏪 Merchant
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◁' : '▷'}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {navItems.map(({ path, label, icon }) => {
            const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'shadow-sm'
                    : ''
                }`}
                style={
                  active
                    ? {
                        backgroundColor: 'var(--app-nav-active)',
                        color: 'var(--app-primary)',
                      }
                    : {
                        color: 'var(--app-text-muted)',
                      }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.target as HTMLElement).style.backgroundColor = 'var(--app-nav-hover)';
                    (e.target as HTMLElement).style.color = 'var(--app-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.target as HTMLElement).style.backgroundColor = '';
                    (e.target as HTMLElement).style.color = 'var(--app-text-muted)';
                  }
                }}
              >
                <span className="text-base">{icon}</span>
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        {sidebarOpen && (
          <div className="border-t p-2" style={{ borderColor: 'var(--app-border)' }}>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { logout(); navigate('/login'); }}>
              🚪 Log out
            </Button>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-10 flex h-14 items-center border-b px-6 shadow-sm"
          style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
        >
          <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--app-text)' }}>
            Merchant Portal
          </h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
        <footer className="border-t py-2 text-center flex items-center justify-center gap-3 flex-wrap" style={{ borderColor: 'var(--app-border)' }}>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="text-[10px] opacity-50 hover:opacity-75" style={{ color: 'var(--app-text-muted)' }}>
            浙ICP备2026030792号
          </a>
          <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33011002019522" target="_blank" rel="noreferrer" className="text-[10px] opacity-50 hover:opacity-75 flex items-center gap-0.5" style={{ color: 'var(--app-text-muted)' }}>
            <img src="https://www.beian.gov.cn/img/ghs.png" alt="" className="h-3 w-3" />
            浙公网安备33011002019522号
          </a>
        </footer>
      </div>
    </div>
  );
}
