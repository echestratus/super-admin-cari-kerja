import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { useDebounce } from "@/hooks/use-debounce"
import { getTotalFromMeta } from "@/lib/pagination"

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
import { toast } from "sonner"
import { Edit2, Trash2 } from "lucide-react"
import { useTableControls } from "@/hooks/use-table-controls"
import type { FilterDef, SearchFieldDef, SortFieldDef } from "@/lib/table-controls"

interface Application {
  id: string
  worker_name: string
  job_title: string
  company_name?: string
  status_name: string
  created_at?: string
  updated_at?: string
  deleted_at?: string
}

interface PaginatedResponse {
  data: Application[]
  meta: {
    page: number
    limit: number
    totalData: number
    totalPage: number
  }
}

const applicationSearchFields: SearchFieldDef[] = [
  { key: "worker_name", label: "Applicant", getValue: (item: Application) => item.worker_name },
  { key: "job_title", label: "Job", getValue: (item: Application) => item.job_title },
  { key: "company_name", label: "Company", getValue: (item: Application) => item.company_name },
  { key: "status_name", label: "Status", getValue: (item: Application) => item.status_name },
]

const applicationFilters: FilterDef[] = [{
  key: "status_name",
  label: "Status",
  options: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"].map((value) => ({
    value,
    label: value,
  })),
  getValue: (item: Application) => item.status_name || "PENDING",
}]

const applicationSortFields: SortFieldDef[] = [
  { key: "worker_name", getValue: (item: Application) => item.worker_name },
  { key: "job_title", getValue: (item: Application) => item.job_title },
  { key: "created_at", getValue: (item: Application) => item.created_at },
  { key: "status_name", getValue: (item: Application) => item.status_name },
]

export default function ApplicationsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [deletingApplication, setDeletingApplication] = useState<Application | null>(null)
  const [hardDelete, setHardDelete] = useState(false)
  const [formData, setFormData] = useState({
    status_name: "",
  })

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["applications", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get("/admin/applications", {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch
        }
      })
      return res.data
    },
  })

  const applications = response?.data || []
  const totalApplications = getTotalFromMeta(response?.meta)
  const tableControls = useTableControls({
    data: applications,
    searchFields: applicationSearchFields,
    filters: applicationFilters,
    sortFields: applicationSortFields,
  })

  const saveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.put(`/admin/applications/${id}`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      setEditingApplication(null)
      toast.success("Application updated successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update application.")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/applications/${id}${hardDelete ? '?hard_delete=true' : ''}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      setDeletingApplication(null)
      setHardDelete(false)
      toast.success(`Application ${hardDelete ? 'hard deleted' : 'soft deleted'} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete application.")
    }
  })

  const handleEditClick = (application: Application) => {
    setEditingApplication(application)
    setFormData({
      status_name: application.status_name || "",
    })
  }

  const columns: ColumnDef<Application>[] = [
    {
      header: "Applicant",
      sortKey: "worker_name",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {item.worker_name ? item.worker_name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="font-medium text-foreground flex items-center gap-2">
            {item.worker_name || "Unknown Applicant"}
            {item.deleted_at && (
              <Badge variant="outline" className="border-danger text-danger bg-danger/5 text-[10px] h-4 px-1">
                Deleted
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Position Details",
      sortKey: "job_title",
      sortable: true,
      cell: (item) => (
        <div>
          <div className="font-medium text-foreground">{item.job_title || "Unknown Position"}</div>
          <div className="text-sm text-muted-foreground">{item.company_name || "Unknown Company"}</div>
        </div>
      )
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
      )
    },
    {
      header: "Status",
      sortKey: "status_name",
      sortable: true,
      cell: (item) => {
        let variant: "default" | "destructive" | "secondary" | "outline" = "default"
        let className = ""
        
        if (item.status_name === "ACCEPTED") {
          className = "bg-success/10 text-success hover:bg-success/20 border-transparent"
        } else if (item.status_name === "REJECTED") {
          className = "bg-danger/10 text-danger hover:bg-danger/20 border-transparent"
          variant = "destructive"
        } else if (item.status_name === "WITHDRAWN") {
          className = "bg-muted text-muted-foreground hover:bg-muted/80 border-transparent"
          variant = "secondary"
        } else {
          className = "bg-warning/10 text-warning hover:bg-warning/20 border-transparent"
          variant = "secondary"
        }

        return (
          <Badge variant={variant} className={className}>
            {item.status_name || "PENDING"}
          </Badge>
        )
      },
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
            title="Edit Application"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => setDeletingApplication(item)}
            title="Delete Application"
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
        <h2 className="text-3xl font-bold tracking-tight">Applications Tracking</h2>
        <p className="text-muted-foreground">Monitor job applications, statuses, and candidate progress globally.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Global Applications</CardTitle>
          <CardDescription>A consolidated view of all candidate submissions across every employer.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable 
            columns={columns} 
            data={tableControls.processedData} 
            isLoading={isLoading} 
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q)
              tableControls.setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search by applicant, job title, or company..."
            searchFields={applicationSearchFields}
            selectedSearchFields={tableControls.selectedSearchFields}
            onToggleSearchField={tableControls.toggleSearchField}
            onSelectAllSearchFields={tableControls.selectAllSearchFields}
            filters={applicationFilters}
            filterValues={tableControls.filterValues}
            onFilterChange={tableControls.setFilterValue}
            sortBy={tableControls.sortBy}
            sortOrder={tableControls.sortOrder}
            onSortChange={tableControls.toggleSort}
            onResetControls={() => {
              setSearchQuery("")
              setPage(1)
              tableControls.resetControls()
            }}
            hasActiveControls={tableControls.hasActiveControls}
            pagination={{
              page,
              pageSize,
              total: totalApplications,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>

      {/* Edit Application Dialog */}
      <Dialog open={!!editingApplication} onOpenChange={(open) => !open && setEditingApplication(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Application Status</DialogTitle>
            <DialogDescription>
              Force update the status of this job application.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status_name">Status (e.g. ACCEPTED, REJECTED, PENDING)</Label>
              <Input
                id="status_name"
                value={formData.status_name}
                onChange={(e) => setFormData({ ...formData, status_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingApplication(null)}>Cancel</Button>
            <Button 
              onClick={() => editingApplication && saveMutation.mutate(editingApplication.id)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Application AlertDialog */}
      <AlertDialog open={!!deletingApplication} onOpenChange={(open) => !open && setDeletingApplication(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete this application record.
              <br/><br/>
              By default, this is a soft-delete (the record will be disabled but data remains). Check the box below to permanently remove the record from the database.
            </AlertDialogDescription>
            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-danger">
              <input 
                type="checkbox" 
                id="hardDeleteApplication"
                checked={hardDelete}
                onChange={(e) => setHardDelete(e.target.checked)}
                className="rounded border-danger text-danger focus:ring-danger"
              />
              <label htmlFor="hardDeleteApplication" className="font-medium cursor-pointer">
                Hard Delete (Permanently remove from database)
              </label>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingApplication && deleteMutation.mutate(deletingApplication.id)}
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
