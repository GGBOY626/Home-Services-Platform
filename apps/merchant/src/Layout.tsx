import { Outlet } from 'react-router-dom';
import { SidebarLayout } from './components/SidebarLayout';

export function Layout() {
  return (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  );
}
