import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/orders', label: 'Orders', icon: '📋' },
  { path: '/ratings', label: 'Ratings', icon: '⭐' },
  { path: '/complaints', label: 'Complaints', icon: '📩' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4">
        <span className="text-lg font-semibold text-[var(--app-text)]">Home Services</span>
        <Link to="/profile" className="rounded-full p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-nav-active)]" aria-label="Profile">
          <span className="text-xl">👤</span>
        </Link>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--app-border)] bg-[var(--app-surface)]">
        <div className="flex justify-around py-2">
          {navItems.map(({ path, label, icon }) => {
            const active =
              location.pathname === path ||
              (path === '/orders' && location.pathname.startsWith('/orders')) ||
              (path === '/complaints' && location.pathname.startsWith('/complaints')) ||
              (path === '/ratings' && location.pathname.startsWith('/ratings'));
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-1 rounded-xl px-6 py-2 text-sm font-medium transition-colors ${
                  active ? 'text-[var(--app-text)] bg-[var(--app-nav-active)]' : 'text-[var(--app-text-muted)]'
                }`}
              >
                <span className="text-lg">{icon}</span>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
