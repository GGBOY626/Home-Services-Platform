import { Outlet } from 'react-router-dom';
import { MobileShell } from './components/MobileShell';

export function Layout() {
  return (
    <MobileShell>
      <Outlet />
    </MobileShell>
  );
}
