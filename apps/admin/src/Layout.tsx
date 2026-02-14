import { Outlet } from 'react-router-dom';
import { AdminSidebarLayout } from './components/AdminSidebarLayout';

export function Layout() {
  return (
    <AdminSidebarLayout>
      <Outlet />
    </AdminSidebarLayout>
  );
}
