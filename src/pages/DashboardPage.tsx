import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Briefcase,
  Building2,
  FileText,
  UserSquare2,
  ShieldAlert,
  MessageSquareWarning,
  ClipboardList,
  ShieldBan,
  BadgeAlert,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { apiClient } from "@/lib/axios"
import { cn } from "@/lib/utils"

interface DashboardStats {
  users: number
  recruiters: number
  job_posts: number
  job_applications: number
  workers: number
}

interface TrustStats {
  open_fraud_events: number
  open_chat_reports: number
  jobs_needs_review: number
  pending_jobs: number
  suspended_users: number
  unverified_employers: number
}

interface GrowthData {
  name: string
  users: number
  employers?: number
}

interface JobDistribution {
  name: string
  value: number
}

interface Activity {
  id: string | number
  message: string
  time: string
  type: 'USER' | 'EMPLOYER' | 'JOB' | 'APPLICATION' | 'DANGER'
}

const TRUST_CARDS: {
  key: keyof TrustStats
  label: string
  hint: string
  href: string
  icon: typeof ShieldAlert
  accent: string
}[] = [
  {
    key: "open_fraud_events",
    label: "Open fraud events",
    hint: "Trust & Safety queue",
    href: "/trust-safety",
    icon: ShieldAlert,
    accent: "border-l-warning",
  },
  {
    key: "open_chat_reports",
    label: "Open chat reports",
    hint: "Source: chat_report",
    href: "/trust-safety?source=chat_report",
    icon: MessageSquareWarning,
    accent: "border-l-warning",
  },
  {
    key: "jobs_needs_review",
    label: "Jobs needing review",
    hint: "Open fraud flags",
    href: "/jobs?needs_review=true",
    icon: BadgeAlert,
    accent: "border-l-warning",
  },
  {
    key: "pending_jobs",
    label: "Pending jobs",
    hint: "Awaiting moderation",
    href: "/jobs?status=pending",
    icon: ClipboardList,
    accent: "border-l-accent",
  },
  {
    key: "suspended_users",
    label: "Suspended users",
    hint: "Users list filter",
    href: "/users?is_suspended=true",
    icon: ShieldBan,
    accent: "border-l-danger",
  },
  {
    key: "unverified_employers",
    label: "Unverified employers",
    hint: "Verification queue",
    href: "/employers?is_verified=false",
    icon: Building2,
    accent: "border-l-secondary",
  },
]

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/stats")
      return res.data?.data || { users: 0, recruiters: 0, job_posts: 0, job_applications: 0, workers: 0 }
    }
  })

  const { data: trustStats, isLoading: trustLoading } = useQuery<TrustStats>({
    queryKey: ["admin-trust-stats"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/dashboard/trust")
      return (
        res.data?.data || {
          open_fraud_events: 0,
          open_chat_reports: 0,
          jobs_needs_review: 0,
          pending_jobs: 0,
          suspended_users: 0,
          unverified_employers: 0,
        }
      )
    },
  })

  const { data: growthData = [] } = useQuery<GrowthData[]>({
    queryKey: ["admin-growth"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/dashboard/growth")
      return res.data?.data || []
    }
  })
  
  const { data: jobDistribution = [] } = useQuery<JobDistribution[]>({
    queryKey: ["admin-job-distribution"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/dashboard/job-distribution")
      return res.data?.data || []
    }
  })

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--secondary))']

  const { data: recentActivities = [] } = useQuery<Activity[]>({
    queryKey: ["admin-activities"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/dashboard/activities")
      return res.data?.data || []
    }
  })

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-muted rounded"></div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4 h-[400px] bg-muted rounded-xl"></div>
          <div className="col-span-3 h-[400px] bg-muted rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of system metrics and recent activities.</p>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Trust & Safety</h3>
          <p className="text-sm text-muted-foreground">
            Click a card to open the matching moderation queue.
          </p>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {TRUST_CARDS.map((card) => {
            const Icon = card.icon
            const value = trustStats?.[card.key] ?? 0
            return (
              <Link key={card.key} to={card.href} className="block group">
                <Card
                  className={cn(
                    "h-full hover:shadow-md transition-shadow border-l-4 cursor-pointer",
                    card.accent
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
                      {card.label}
                    </CardTitle>
                    <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-warning" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold tracking-tight">
                      {trustLoading ? "…" : value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{card.hint}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">Platform</span> users</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Employers</CardTitle>
            <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.recruiters || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">Registered</span> companies</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-muted-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Job Seekers</CardTitle>
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <UserSquare2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.workers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">Active</span> candidates</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Job Posts</CardTitle>
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.job_posts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">Total</span> listings</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-success">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.job_applications || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">Submitted</span> applications</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Platform Growth</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    activity.type === 'USER' ? 'bg-primary' :
                    activity.type === 'EMPLOYER' ? 'bg-secondary' :
                    activity.type === 'DANGER' ? 'bg-danger' :
                    'bg-accent'
                  }`} />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.message}</p>
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No recent activities found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex items-center justify-center">
              {jobDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={jobDistribution}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {jobDistribution.map((_entry: JobDistribution, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm">No distribution data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
