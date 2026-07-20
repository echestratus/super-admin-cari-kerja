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
import { getTotalFromMeta } from "@/lib/pagination"
import { buildListQueryParams } from "@/lib/list-query"
import { toast } from "sonner"
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
import { useTableControls } from "@/hooks/use-table-controls"
import type { FilterDef, SortFieldDef } from "@/lib/table-controls"

interface User {
  id: string
  username: string
  email: string
  role_id: number
  is_suspended: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string
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

const getRoleLabel = (roleId: number) =>
  roleId === 3 ? "Super Admin" : roleId === 2 ? "Recruiter" : roleId === 4 ? "Admin" : "Job Seeker"

const ENCRYPTED_SEARCH_HINT =
  "Gunakan email/nama lengkap untuk hasil akurat (kolom sensitif terenkripsi)."

const userFilters: FilterDef[] = [
  {
    key: "role_id",
    label: "Role",
    options: [
      { value: "1", label: "Job Seeker" },
      { value: "2", label: "Recruiter" },
      { value: "4", label: "Admin" },
      { value: "3", label: "Super Admin" },
    ],
    getValue: (item: User) => item.role_id,
  },
  {
    key: "is_suspended",
    label: "Status",
    options: [{ value: "false", label: "Active" }, { value: "true", label: "Suspended" }],
    getValue: (item: User) => item.is_suspended,
  },
  {
    key: "deleted_state",
    label: "Record",
    options: [
      { value: "active", label: "Active only" },
      { value: "deleted", label: "Deleted only" },
      { value: "all", label: "All" },
    ],
    getValue: (item: User) => (item.deleted_at ? "deleted" : "active"),
  },
]

const userSortFields: SortFieldDef[] = [
  { key: "role_id", getValue: (item: User) => item.role_id },
  { key: "is_suspended", getValue: (item: User) => item.is_suspended },
  { key: "created_at", getValue: (item: User) => item.created_at },
  { key: "updated_at", getValue: (item: User) => item.updated_at },
]

const USER_SORT_KEYS = ["created_at", "updated_at", "role_id", "is_suspended"]
const USER_FILTER_KEYS = ["role_id", "is_suspended", "deleted_state"]

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Modals state
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [hardDelete, setHardDelete] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role_id: 1,
    is_suspended: false,
  })

  const tableControls = useTableControls({
    data: [],
    filters: userFilters,
    sortFields: userSortFields,
    defaultSortBy: "created_at",
    defaultSortOrder: "desc",
    clientSide: false,
  })

  const listParams = buildListQueryParams({
    page,
    limit: pageSize,
    search: debouncedSearch,
    sortBy: tableControls.sortBy,
    sortOrder: tableControls.sortOrder,
    defaultSortBy: "created_at",
    defaultSortOrder: "desc",
    filterValues: tableControls.filterValues,
    allowedFilters: USER_FILTER_KEYS,
    allowedSortBy: USER_SORT_KEYS,
  })

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["users", listParams],
    queryFn: async () => {
      const res = await apiClient.get("/admin/users", { params: listParams })
      return res.data
    },
  })

  const users = response?.data || []
  const totalUsers = getTotalFromMeta(response?.meta)

  const statusMutation = useMutation({
    mutationFn: async ({ id, is_suspended }: { id: string, is_suspended: boolean }) => {
      const action = is_suspended ? "activate" : "suspend"
      await apiClient.put(`/admin/users/${id}/status`, { action })
      return action
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(`User ${action === "activate" ? "activated" : "suspended"} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update user status.")
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (id: string) => {
      const payload: any = { ...formData };
      if (!payload.password) {
        delete payload.password;
      }
      return apiClient.put(`/admin/users/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setEditingUser(null)
      toast.success("User updated successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update user.")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/users/${id}${hardDelete ? '?hard_delete=true' : ''}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setDeletingUser(null)
      setHardDelete(false)
      toast.success(`User ${hardDelete ? 'hard deleted' : 'soft deleted'} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete user.")
    }
  })

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username || "",
      email: user.email || "",
      password: "",
      role_id: user.role_id || 1,
      is_suspended: user.is_suspended || false,
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
      sortKey: "role_id",
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {getRoleLabel(item.role_id)}
        </Badge>
      ),
    },
    {
      header: "Status",
      sortKey: "is_suspended",
      sortable: true,
      cell: (item) => (
        <div className="flex gap-2">
          <Badge 
            variant={!item.is_suspended ? "default" : "destructive"}
            className={!item.is_suspended ? "bg-success/10 text-success hover:bg-success/20 border-transparent" : "bg-danger/10 text-danger hover:bg-danger/20 border-transparent"}
          >
            {!item.is_suspended ? "Active" : "Suspended"}
          </Badge>
          {item.deleted_at && (
            <Badge variant="outline" className="border-danger text-danger bg-danger/5">
              Deleted
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Timestamps",
      sortKey: "created_at",
      sortable: true,
      cell: (item) => (
        <div className="text-xs text-muted-foreground flex flex-col gap-1">
          <div>Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}</div>
          {item.updated_at && <div>Updated: {new Date(item.updated_at).toLocaleDateString()}</div>}
        </div>
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
              tableControls.setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search by username or email..."
            searchHint={ENCRYPTED_SEARCH_HINT}
            hideSearchFields
            filters={userFilters}
            filterValues={tableControls.filterValues}
            onFilterChange={(key, value) => {
              tableControls.setFilterValue(key, value)
              setPage(1)
            }}
            sortBy={tableControls.sortBy}
            sortOrder={tableControls.sortOrder}
            onSortChange={(key) => {
              tableControls.toggleSort(key)
              setPage(1)
            }}
            onResetControls={() => {
              setSearchQuery("")
              setPage(1)
              tableControls.resetControls()
            }}
            hasActiveControls={
              tableControls.hasActiveControls || searchQuery.trim().length > 0
            }
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
              <Label htmlFor="password">Reset Password (leave blank to keep current)</Label>
              <Input
                id="password"
                type="password"
                placeholder="New password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            <div className="grid gap-2 mt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.is_suspended}
                  onChange={(e) => setFormData({ ...formData, is_suspended: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                Suspend User Account
              </label>
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
              You are about to delete the user account <strong className="mx-1 text-foreground">"{deletingUser?.email}"</strong>.
              <br/><br/>
              By default, this is a soft-delete (the user will be disabled but data remains). Check the box below to permanently remove the record from the database.
            </AlertDialogDescription>
            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-danger">
              <input 
                type="checkbox" 
                id="hardDeleteCheckbox"
                checked={hardDelete}
                onChange={(e) => setHardDelete(e.target.checked)}
                className="rounded border-danger text-danger focus:ring-danger"
              />
              <label htmlFor="hardDeleteCheckbox" className="font-medium cursor-pointer">
                Hard Delete (Permanently remove from database)
              </label>
            </div>
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
