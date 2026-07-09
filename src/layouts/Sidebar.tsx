import { NavLink } from "react-router-dom"
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Building2, 
  Settings, 
  FileText 
} from "lucide-react"
import { cn } from "@/lib/utils"

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Users", href: "/users" },
  { icon: Building2, label: "Employers", href: "/employers" },
  { icon: Briefcase, label: "Jobs", href: "/jobs" },
  { icon: FileText, label: "Applications", href: "/applications" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 border-r border-sidebar-border bg-sidebar flex-col transition-all duration-300">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">Super Admin</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
