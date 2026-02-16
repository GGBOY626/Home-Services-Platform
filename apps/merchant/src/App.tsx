import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import { LoginPage } from './pages/LoginPage';
import { ApplyPage } from './pages/ApplyPage';
import { Layout } from './Layout';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { WorkersPage } from './pages/WorkersPage';
import { ServicesPage } from './pages/ServicesPage';
import { FinancePage } from './pages/FinancePage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { RatingsPage } from './pages/RatingsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/" element={token ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="ratings" element={<RatingsPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="workers" element={<WorkersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
