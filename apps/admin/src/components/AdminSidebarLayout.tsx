import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button } from '@home-services/ui';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/orders', label: 'Orders', icon: '📦' },
  { path: '/ratings', label: 'Ratings', icon: '⭐' },
  { path: '/complaints', label: 'Complaints', icon: '📩' },
  { path: '/catalog', label: 'Catalog', icon: '📁' },
  { path: '/finance', label: 'Finance', icon: '💰' },
  { path: '/merchants', label: 'Merchants', icon: '🏪' },
  { path: '/applications/merchants', label: 'Applications', icon: '📝' },
  { path: '/payments', label: 'Payments', icon: '💳' },
  { path: '/refund-requests', label: 'Refunds', icon: '↩️' },
  { path: '/audit', label: 'Audit Logs', icon: '📋' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export function AdminSidebarLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* Sidebar */}
      <aside
        className="w-52 flex flex-col border-r shrink-0"
        style={{
          backgroundColor: 'var(--app-primary)',
          borderColor: 'rgba(255,255,255,0.1)',
          color: '#ffffff',
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex h-12 items-center border-b px-4"
          style={{ borderColor: 'rgba(255,255,255,0.15)' }}
        >
          <span className="text-sm font-bold tracking-tight text-white/90">
            ⚙️ Platform Admin
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
          {navItems.map(({ path, label, icon }) => {
            const isPrefix = path === '/finance' || path === '/applications';
            const active =
              location.pathname === path ||
              (isPrefix && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all duration-150 ${
                  active ? '' : 'text-white/60 hover:text-white/90 hover:bg-white/8'
                }`}
                style={
                  active
                    ? {
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        color: '#ffffff',
                      }
                    : {}
                }
              >
                <span className="text-sm">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t p-2" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-white/60 hover:text-white hover:bg-white/8"
            onClick={() => { logout(); navigate('/login'); }}
          >
            🚪 Log out
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-10 flex h-12 items-center border-b px-5"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <h1 className="text-base font-bold tracking-tight" style={{ color: 'var(--app-text)' }}>
            Admin Dashboard
          </h1>
        </header>
        <main className="flex-1 p-5">{children}</main>
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
