import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Briefcase, CheckCircle2, XCircle, Archive, Edit2, Trash2, ShieldAlert } from "lucide-react"
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
import { useTableControls } from "@/hooks/use-table-controls"
import type { FilterDef, SortFieldDef } from "@/lib/table-controls"

interface Job {
  id: string
  title: string
  company_name: string
  /** Backend list currently returns `status`; some endpoints may return `status_name`. */
  status?: string
  status_name?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string
  salary?: number
  description?: string
  needs_review?: boolean
  open_fraud_event_id?: string | null
  open_fraud_risk_score?: number | null
}

function getJobStatus(job: Job): string {
  return job.status_name || job.status || ""
}

function trustSafetyPath(eventId?: string | null) {
  if (eventId) return `/trust-safety?eventId=${encodeURIComponent(eventId)}`
  return "/trust-safety"
}

interface PaginatedResponse {
  data: Job[]
  meta: {
    page: number
    limit: number
    totalData: number
    totalPage: number
  }
}

const jobFilters: FilterDef[] = [
  {
    key: "status",
    label: "Status",
    options: ["pending", "draft", "open", "approved", "active", "closed", "rejected", "archived"].map((value) => ({
      value,
      label: value.toUpperCase(),
    })),
    getValue: (item: Job) => getJobStatus(item).toLowerCase(),
  },
  {
    key: "needs_review",
    label: "Trust & Safety",
    options: [
      { value: "true", label: "Needs review only" },
      { value: "false", label: "No open flags" },
    ],
    getValue: (item: Job) => item.needs_review,
  },
]

const jobSortFields: SortFieldDef[] = [
  { key: "title", getValue: (item: Job) => item.title },
  { key: "created_at", getValue: (item: Job) => item.created_at },
  { key: "updated_at", getValue: (item: Job) => item.updated_at },
  { key: "needs_review", getValue: (item: Job) => item.needs_review },
]

const JOB_SORT_KEYS = ["created_at", "updated_at", "title", "needs_review"]
const JOB_FILTER_KEYS = ["status", "needs_review"]

export default function JobsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deletingJob, setDeletingJob] = useState<Job | null>(null)
  const [hardDelete, setHardDelete] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    status_name: "",
    salary: "",
    description: "",
  })

  const needsReviewParam = searchParams.get("needs_review")
  const statusParam = searchParams.get("status")
  const tableControls = useTableControls({
    data: [],
    filters: jobFilters,
    sortFields: jobSortFields,
    defaultSortBy: "created_at",
    defaultSortOrder: "desc",
    defaultFilterValues: {
      ...(needsReviewParam === "true" || needsReviewParam === "false"
        ? { needs_review: needsReviewParam }
        : {}),
      ...(statusParam ? { status: statusParam.toLowerCase() } : {}),
    },
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
    allowedFilters: JOB_FILTER_KEYS,
    allowedSortBy: JOB_SORT_KEYS,
  })

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["jobs", listParams],
    queryFn: async () => {
      const res = await apiClient.get("/admin/jobs", { params: listParams })
      const rows = (res.data?.data || []).map((job: Job) => ({
        ...job,
        status_name: getJobStatus(job),
        status: getJobStatus(job),
        needs_review: Boolean(job.needs_review),
      }))
      return { ...res.data, data: rows }
    },
  })

  const jobs = response?.data || []
  const totalJobs = getTotalFromMeta(response?.meta)

  const handleEditClick = async (job: Job) => {
    setEditingJob(job)
    setFormData({
      title: job.title || "",
      status_name: getJobStatus(job),
      salary: job.salary?.toString() || "",
      description: job.description || "",
    })
    try {
      const res = await apiClient.get(`/admin/jobs/${job.id}`)
      const detail = (res.data?.data || res.data) as Job
      if (detail?.id) {
        setEditingJob({
          ...job,
          ...detail,
          status_name: getJobStatus(detail),
          status: getJobStatus(detail),
          needs_review: Boolean(detail.needs_review),
        })
        setFormData({
          title: detail.title || job.title || "",
          status_name: getJobStatus(detail) || getJobStatus(job),
          salary: detail.salary?.toString() || job.salary?.toString() || "",
          description: detail.description || job.description || "",
        })
      }
    } catch {
      // Keep list row data if detail fetch fails.
    }
  }

  const goToTrustSafety = (eventId?: string | null) => {
    navigate(trustSafetyPath(eventId))
  }

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await apiClient.put(`/admin/jobs/${id}/status`, { status })
      return status
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      toast.success(`Job marked as ${status} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update job status.")
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.put(`/admin/jobs/${id}`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      setEditingJob(null)
      toast.success("Job updated successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update job.")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/jobs/${id}${hardDelete ? '?hard_delete=true' : ''}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      setDeletingJob(null)
      setHardDelete(false)
      toast.success(`Job ${hardDelete ? 'hard deleted' : 'soft deleted'} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete job.")
    }
  })

  const columns: ColumnDef<Job>[] = [
    {
      header: "Job Details",
      sortKey: "title",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center text-accent font-medium">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground flex items-center gap-2 flex-wrap">
              {item.title || "Untitled Job"}
              {item.deleted_at && (
                <Badge variant="outline" className="border-danger text-danger bg-danger/5 text-[10px] h-4 px-1">
                  Deleted
                </Badge>
              )}
              {item.needs_review && (
                <button
                  type="button"
                  className="inline-flex"
                  onClick={(e) => {
                    e.stopPropagation()
                    goToTrustSafety(item.open_fraud_event_id)
                  }}
                  title="Open Trust & Safety queue"
                >
                  <Badge className="bg-warning/10 text-warning border-transparent text-[10px] h-5 px-1.5 gap-1 cursor-pointer hover:bg-warning/20">
                    <ShieldAlert className="h-3 w-3" />
                    Needs review
                  </Badge>
                </button>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{item.company_name || "Unknown Company"}</div>
          </div>
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
      )
    },
    {
      header: "Status",
      cell: (item) => {
        const status = getJobStatus(item)
        let variant: "default" | "destructive" | "secondary" | "outline" = "default"
        let className = ""
        
        if (status === "APPROVED" || status === "ACTIVE" || status === "OPEN") {
          className = "bg-success/10 text-success hover:bg-success/20 border-transparent"
        } else if (status === "REJECTED" || status === "CLOSED") {
          className = "bg-danger/10 text-danger hover:bg-danger/20 border-transparent"
          variant = "destructive"
        } else if (status === "ARCHIVED" || status === "DRAFT") {
          className = "bg-muted text-muted-foreground hover:bg-muted/80 border-transparent"
          variant = "secondary"
        } else {
          className = "bg-warning/10 text-warning hover:bg-warning/20 border-transparent"
          variant = "secondary"
        }

        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant={variant} className={className}>
              {status || "UNKNOWN"}
            </Badge>
            {item.needs_review && (
              <button
                type="button"
                onClick={() => goToTrustSafety(item.open_fraud_event_id)}
                className="text-[11px] text-warning hover:underline"
              >
                Trust flag open
              </button>
            )}
          </div>
        )
      },
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => {
        const status = getJobStatus(item)
        return (
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => handleEditClick(item)}
            title="Edit Title/Status"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          
          {(status === "PENDING" || status === "DRAFT") && (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-success hover:text-success hover:bg-success/10"
                onClick={() => statusMutation.mutate({ id: item.id, status: "OPEN" })}
                disabled={statusMutation.isPending}
                title="Approve / Open"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-danger hover:text-danger hover:bg-danger/10"
                onClick={() => statusMutation.mutate({ id: item.id, status: "REJECTED" })}
                disabled={statusMutation.isPending}
                title="Reject"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {(status === "APPROVED" || status === "ACTIVE" || status === "OPEN") && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => statusMutation.mutate({ id: item.id, status: "ARCHIVED" })}
              disabled={statusMutation.isPending}
              title="Archive"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => setDeletingJob(item)}
            title="Delete Job"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Jobs Moderation</h2>
        <p className="text-muted-foreground">Review, approve, or reject new job postings from employers.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Job Listings</CardTitle>
          <CardDescription>Comprehensive list of all job postings and their current moderation status.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable 
            columns={columns} 
            data={jobs} 
            isLoading={isLoading} 
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q)
              tableControls.setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search by title, location, or company..."
            hideSearchFields
            filters={jobFilters}
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
            hasActiveControls={tableControls.hasActiveControls}
            pagination={{
              page,
              pageSize,
              total: totalJobs,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>

      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job Entry</DialogTitle>
            <DialogDescription>
              Update basic job title or forcefully change its status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editingJob?.needs_review && (
              <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium text-warning">
                  <ShieldAlert className="h-4 w-4" />
                  Needs Trust & Safety review
                </div>
                <p className="text-muted-foreground text-xs">
                  This job has an open fraud flag. Resolve it in the Trust & Safety queue before treating it as fully moderated.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-warning border-warning/40"
                  onClick={() => {
                    const eventId = editingJob.open_fraud_event_id
                    setEditingJob(null)
                    goToTrustSafety(eventId)
                  }}
                >
                  Resolve in Trust & Safety
                </Button>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status_name">Status</Label>
              <Input
                id="status_name"
                value={formData.status_name}
                onChange={(e) => setFormData({ ...formData, status_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salary">Salary</Label>
              <Input
                id="salary"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingJob(null)}>Cancel</Button>
            <Button 
              onClick={() => editingJob && saveMutation.mutate(editingJob.id)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Job AlertDialog */}
      <AlertDialog open={!!deletingJob} onOpenChange={(open) => !open && setDeletingJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete the job posting <strong className="mx-1 text-foreground">"{deletingJob?.title}"</strong>.
              <br/><br/>
              By default, this is a soft-delete (the job will be disabled but data remains). Check the box below to permanently remove the record from the database.
            </AlertDialogDescription>
            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-danger">
              <input 
                type="checkbox" 
                id="hardDeleteJob"
                checked={hardDelete}
                onChange={(e) => setHardDelete(e.target.checked)}
                className="rounded border-danger text-danger focus:ring-danger"
              />
              <label htmlFor="hardDeleteJob" className="font-medium cursor-pointer">
                Hard Delete (Permanently remove from database)
              </label>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingJob && deleteMutation.mutate(deletingJob.id)}
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
