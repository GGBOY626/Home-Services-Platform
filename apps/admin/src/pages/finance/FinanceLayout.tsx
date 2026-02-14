import { Link, Outlet, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/finance', label: 'Summary' },
  { path: '/finance/ledgers', label: 'Ledgers' },
  { path: '/finance/fee-rules', label: 'Fee Rules' },
];

export function FinanceLayout() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 border-b border-neutral-200">
        {tabs.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              (path === '/finance' ? location.pathname === path : location.pathname.startsWith(path))
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
