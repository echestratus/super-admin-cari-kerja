import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { ShieldBan, CheckCircle2, Edit2, Trash2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id: string
  username: string
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

  // Modals state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role_id: 1,
  })

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

  const saveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.put(`/admin/users/${id}`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setEditingUser(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/users/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setDeletingUser(null)
    }
  })

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username || "",
      email: user.email || "",
      role_id: user.role_id || 1,
    })
  }

  const columns: ColumnDef<User>[] = [
    {
      header: "User Details",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {item.username ? item.username.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div className="font-medium text-foreground">{item.username || "Unknown User"}</div>
            <div className="text-sm text-muted-foreground">{item.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {item.role_id === 3 ? "Super Admin" : item.role_id === 2 ? "Recruiter" : item.role_id === 4 ? "Admin" : "Job Seeker"}
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
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => handleEditClick(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={item.is_suspended ? "text-success hover:text-success hover:bg-success/10" : "text-warning hover:text-warning hover:bg-warning/10"}
            onClick={() => statusMutation.mutate({ id: item.id, is_suspended: item.is_suspended })}
            disabled={statusMutation.isPending}
            title={item.is_suspended ? "Activate" : "Suspend"}
          >
            {item.is_suspended ? <CheckCircle2 className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => setDeletingUser(item)}
          >
            <Trash2 className="h-4 w-4" />
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

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update basic information and role for this user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={String(formData.role_id)} 
                onValueChange={(val) => setFormData({ ...formData, role_id: parseInt(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Job Seeker</SelectItem>
                  <SelectItem value="2">Recruiter</SelectItem>
                  <SelectItem value="4">Admin</SelectItem>
                  <SelectItem value="3">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button 
              onClick={() => editingUser && saveMutation.mutate(editingUser.id)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User AlertDialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              <strong className="mx-1 text-foreground">"{deletingUser?.email}"</strong> 
              and all of their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
