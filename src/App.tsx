import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "./layouts/AppLayout"
import DashboardPage from "./pages/DashboardPage"
import LoginPage from "./pages/LoginPage"
import UsersPage from "./pages/UsersPage"
import EmployersPage from "./pages/EmployersPage"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/employers" element={<EmployersPage />} />
            <Route path="/jobs" element={<div className="text-2xl font-bold">Jobs</div>} />
            <Route path="/applications" element={<div className="text-2xl font-bold">Applications</div>} />
            <Route path="/settings" element={<div className="text-2xl font-bold">Settings</div>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
