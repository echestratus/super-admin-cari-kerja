import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "./layouts/AppLayout"
import DashboardPage from "./pages/DashboardPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<div className="text-2xl font-bold">Users</div>} />
          <Route path="/employers" element={<div className="text-2xl font-bold">Employers</div>} />
          <Route path="/jobs" element={<div className="text-2xl font-bold">Jobs</div>} />
          <Route path="/applications" element={<div className="text-2xl font-bold">Applications</div>} />
          <Route path="/settings" element={<div className="text-2xl font-bold">Settings</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
