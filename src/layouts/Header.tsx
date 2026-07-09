import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Moon, Sun, User } from "lucide-react"

export default function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      <div>
        {/* Placeholder for Breadcrumbs or Page Title */}
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-full bg-secondary">
          <User className="h-5 w-5 text-secondary-foreground" />
        </Button>
      </div>
    </header>
  )
}
