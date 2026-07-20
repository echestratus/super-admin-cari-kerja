import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import AppLayout from "./layouts/AppLayout"
import DashboardPage from "./pages/DashboardPage"
import LoginPage from "./pages/LoginPage"
import UsersPage from "./pages/UsersPage"
import WorkersPage from "./pages/WorkersPage"
import WorkerDetailPage from "./pages/WorkerDetailPage"
import EmployersPage from "./pages/EmployersPage"
import EmployerDetailPage from "./pages/EmployerDetailPage"
import LookupsPage from "./pages/LookupsPage"
import LocationsPage from "./pages/LocationsPage"
import PlansPage from "./pages/PlansPage"
import PaymentOrdersPage from "./pages/PaymentOrdersPage"
import AuditLogsPage from "./pages/AuditLogsPage"
import JobsPage from "./pages/JobsPage"
import ApplicationsPage from "./pages/ApplicationsPage"
import TrustSafetyPage from "./pages/TrustSafetyPage"
import SettingsPage from "./pages/SettingsPage"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="workers" element={<WorkersPage />} />
            <Route path="workers/:id" element={<WorkerDetailPage />} />
            <Route path="employers" element={<EmployersPage />} />
            <Route path="employers/:id" element={<EmployerDetailPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="lookups" element={<LookupsPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="payment-orders" element={<PaymentOrdersPage />} />
            <Route path="trust-safety" element={<TrustSafetyPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
