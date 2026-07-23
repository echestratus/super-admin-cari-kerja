import { NavLink } from "react-router-dom"
import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  Building2, 
  Settings, 
  FileText,
  UserSquare2,
  Database,
  ClipboardList,
  MapPin,
  CreditCard,
  Receipt,
  ShieldAlert,
  BadgeCheck,
  Newspaper,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Users", href: "/users" },
  { icon: UserSquare2, label: "Workers", href: "/workers" },
  { icon: Building2, label: "Employers", href: "/employers" },
  { icon: BadgeCheck, label: "Employer Verification", href: "/employer-verification" },
  { icon: Briefcase, label: "Jobs", href: "/jobs" },
  { icon: FileText, label: "Applications", href: "/applications" },
  { icon: Newspaper, label: "News", href: "/news" },
  { icon: ShieldAlert, label: "Trust & Safety", href: "/trust-safety" },
  { icon: CreditCard, label: "Plans", href: "/plans" },
  { icon: Receipt, label: "Payments", href: "/payment-orders" },
  { icon: Database, label: "Lookups", href: "/lookups" },
  { icon: MapPin, label: "Locations", href: "/locations" },
  { icon: ClipboardList, label: "Audit Logs", href: "/audit-logs" },
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
