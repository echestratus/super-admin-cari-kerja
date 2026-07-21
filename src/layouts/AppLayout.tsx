import { Outlet, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"
import Sidebar from "./Sidebar"
import Header from "./Header"
import { apiClient } from "@/lib/axios"

function coerceBool(value: unknown): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value === "true" || value === "1"
  if (typeof value === "number") return value === 1
  return false
}

export default function AppLayout() {
  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/settings")
      return res.data?.data
    },
    staleTime: 60_000,
  })

  const maintenanceMode = coerceBool(settings?.maintenance_mode)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        {maintenanceMode && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger md:px-6 lg:px-8"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Maintenance mode is active. Public site access may be limited.
              </span>
            </div>
            <Link
              to="/settings"
              className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
            >
              Settings
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
