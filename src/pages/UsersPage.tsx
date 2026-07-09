import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { UserCog, ShieldBan, CheckCircle2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface User {
  id: string
  name: string
  email: string
  role_id: number
  is_suspended: boolean
  created_at?: string
}

interface PaginatedResponse {
  data: User[]
  meta: {
    page: number
    limit: number
    totalData: number
    totalPage: number
  }
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["users", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get("/admin/users", {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch
        }
      })
      return res.data
    },
  })

  const users = response?.data || []
  const totalUsers = response?.meta?.totalData || 0

  const statusMutation = useMutation({
    mutationFn: async ({ id, is_suspended }: { id: string, is_suspended: boolean }) => {
      const action = is_suspended ? "activate" : "suspend"
      await apiClient.put(`/admin/users/${id}/status`, { action })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    }
  })

  const columns: ColumnDef<User>[] = [
    {
      header: "User Details",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {item.name ? item.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div className="font-medium text-foreground">{item.name || "Unknown User"}</div>
            <div className="text-sm text-muted-foreground">{item.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {item.role_id === 3 ? "Super Admin" : item.role_id === 2 ? "Recruiter" : "Job Seeker"}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (item) => (
        <Badge 
          variant={!item.is_suspended ? "default" : "destructive"}
          className={!item.is_suspended ? "bg-success/10 text-success hover:bg-success/20 border-transparent" : "bg-danger/10 text-danger hover:bg-danger/20 border-transparent"}
        >
          {!item.is_suspended ? "Active" : "Suspended"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <UserCog className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={item.is_suspended ? "text-success hover:text-success hover:bg-success/10" : "text-danger hover:text-danger hover:bg-danger/10"}
            onClick={() => statusMutation.mutate({ id: item.id, is_suspended: item.is_suspended })}
            disabled={statusMutation.isPending}
          >
            {item.is_suspended ? <CheckCircle2 className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
          </Button>
        </div>
      ),
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Users Management</h2>
        <p className="text-muted-foreground">Manage platform users, administrators, and their access levels.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>User Directory</CardTitle>
          <CardDescription>A complete list of all registered users on the platform.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable 
            columns={columns} 
            data={users} 
            isLoading={isLoading} 
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search by name or email..."
            pagination={{
              page,
              pageSize,
              total: totalUsers,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
