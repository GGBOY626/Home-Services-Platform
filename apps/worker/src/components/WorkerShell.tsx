import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Tasks', icon: '✓' },
  { path: '/orders', label: 'Orders', icon: '📋' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export function WorkerShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4">
        <span className="text-lg font-semibold text-neutral-900">Today</span>
        <Link to="/profile" className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100" aria-label="Profile">
          <span className="text-xl">👤</span>
        </Link>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white">
        <div className="flex justify-around py-2">
          {navItems.map(({ path, label, icon }) => {
            const active = location.pathname === path || (path === '/orders' && location.pathname.startsWith('/orders'));
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-1 rounded-xl px-6 py-2 text-sm font-medium transition-colors ${
                  active ? 'text-neutral-900' : 'text-neutral-500'
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
