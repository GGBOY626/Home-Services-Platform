import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth';
import { LoginPage } from './pages/LoginPage';
import { Layout } from './Layout';
import { OrdersPage } from './pages/OrdersPage';
import { MerchantsPage } from './pages/MerchantsPage';
import { CatalogPage } from './pages/CatalogPage';
import { FinanceLayout } from './pages/finance/FinanceLayout';
import { FinanceSummaryPage } from './pages/finance/FinanceSummaryPage';
import { FinanceLedgersPage } from './pages/finance/FinanceLedgersPage';
import { FinanceFeeRulesPage } from './pages/finance/FinanceFeeRulesPage';
import { AuditPage } from './pages/AuditPage';
import { WorkerApplicationsPage } from './pages/WorkerApplicationsPage';
import { MerchantApplicationsPage } from './pages/MerchantApplicationsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { RatingsPage } from './pages/RatingsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PaymentsPage } from './pages/PaymentsPage';

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/orders" replace /> : <LoginPage />} />
      <Route path="/" element={token ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/orders" replace />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="ratings" element={<RatingsPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="finance" element={<FinanceLayout />}>
          <Route index element={<FinanceSummaryPage />} />
          <Route path="ledgers" element={<FinanceLedgersPage />} />
          <Route path="fee-rules" element={<FinanceFeeRulesPage />} />
        </Route>
        <Route path="merchants" element={<MerchantsPage />} />
        <Route path="applications/workers" element={<WorkerApplicationsPage />} />
        <Route path="applications/merchants" element={<MerchantApplicationsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
}
