import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import AppLayout from "./layouts/AppLayout"
import DashboardPage from "./pages/DashboardPage"
import LoginPage from "./pages/LoginPage"
import UsersPage from "./pages/UsersPage"
import WorkersPage from "./pages/WorkersPage"
import EmployersPage from "./pages/EmployersPage"
import LookupsPage from "./pages/LookupsPage"
import AuditLogsPage from "./pages/AuditLogsPage"
import JobsPage from "./pages/JobsPage"
import ApplicationsPage from "./pages/ApplicationsPage"
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
            <Route path="employers" element={<EmployersPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="lookups" element={<LookupsPage />} />
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
