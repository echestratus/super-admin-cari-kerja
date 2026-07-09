import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, Building2, FileText } from "lucide-react"
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
import { apiClient } from "@/lib/axios"

interface DashboardStats {
  total_users: number
  total_recruiters: number
  total_jobs: number
  total_applications: number
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

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/stats")
      return res.data?.data || { total_users: 0, total_recruiters: 0, total_jobs: 0, total_applications: 0 }
    }
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

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--success))']

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">+12%</span> from last month</p>
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
            <div className="text-3xl font-bold tracking-tight">{stats?.total_recruiters || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">+4%</span> from last month</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats?.total_jobs || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">+24</span> new this week</p>
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
            <div className="text-3xl font-bold tracking-tight">{stats?.total_applications || 0}</div>
            <p className="text-xs text-muted-foreground mt-1"><span className="text-success font-medium">+18%</span> conversion rate</p>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
