import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Tasks', icon: '✅' },
  { path: '/orders', label: 'Orders', icon: '📋' },
  { path: '/ratings', label: 'Ratings', icon: '⭐' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export function WorkerShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 shadow-sm"
        style={{ backgroundColor: 'var(--app-primary)', color: '#ffffff' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🛠️</span>
          <span className="text-lg font-bold tracking-tight">Worker Hub</span>
        </div>
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/15"
        >
          <span className="text-lg">👤</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <div className="flex justify-around py-2">
          {navItems.map(({ path, label, icon }) => {
            const active =
              location.pathname === path ||
              (path === '/orders' && location.pathname.startsWith('/orders')) ||
              (path === '/ratings' && location.pathname.startsWith('/ratings'));
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-5 py-2 text-xs font-medium transition-all duration-200 ${
                  active
                    ? 'scale-105'
                    : ''
                }`}
                style={
                  active
                    ? { color: 'var(--app-primary)' }
                    : { color: 'var(--app-text-muted)' }
                }
              >
                <span className={`text-lg transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                  {icon}
                </span>
                <span>{label}</span>
                {active && (
                  <span
                    className="mt-0.5 h-1 w-1 rounded-full"
                    style={{ backgroundColor: 'var(--app-primary)' }}
                  />
                )}
              </Link>
            );
          })}
        </div>
        {/* ICP filing */}
        <div className="pb-1 flex items-center justify-center gap-2 flex-wrap">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="text-[9px] opacity-50 hover:opacity-75" style={{ color: 'var(--app-text-muted)' }}>
            浙ICP备2026030792号
          </a>
          <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=33011002019522" target="_blank" rel="noreferrer" className="text-[9px] opacity-50 hover:opacity-75 flex items-center gap-0.5" style={{ color: 'var(--app-text-muted)' }}>
            <img src="https://www.beian.gov.cn/img/ghs.png" alt="" className="h-2.5 w-2.5" />
            浙公网安备33011002019522号
          </a>
        </div>
      </nav>
    </div>
  );
}
