import { Outlet } from 'react-router-dom';
import { WorkerShell } from './components/WorkerShell';

export function Layout() {
  return (
    <WorkerShell>
      <Outlet />
    </WorkerShell>
  );
}
