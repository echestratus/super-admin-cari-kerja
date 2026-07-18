import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { User, Edit2, Trash2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { getTotalFromMeta } from "@/lib/pagination"
import { toast } from "sonner"
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
import { useTableControls } from "@/hooks/use-table-controls"
import type { FilterDef, SearchFieldDef, SortFieldDef } from "@/lib/table-controls"

interface Worker {
  id: string
  name: string
  telephone: string
  gender_id?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string
  date_of_birth?: string
  profile_summary?: string
  address?: string
  user_email?: string
  user_username?: string
}

interface PaginatedResponse {
  data: Worker[]
  meta: {
    page: number
    limit: number
    totalData: number
    totalPage: number
  }
}

const getGenderLabel = (genderId?: number) =>
  genderId === 1 ? "Male" : genderId === 2 ? "Female" : "Not Specified"

const workerSearchFields: SearchFieldDef[] = [
  { key: "name", label: "Name", getValue: (item: Worker) => item.name },
  { key: "telephone", label: "Telephone", getValue: (item: Worker) => item.telephone },
  { key: "user_email", label: "Email", getValue: (item: Worker) => item.user_email },
  { key: "user_username", label: "Username", getValue: (item: Worker) => item.user_username },
  { key: "gender", label: "Gender", getValue: (item: Worker) => getGenderLabel(item.gender_id) },
  { key: "address", label: "Address", getValue: (item: Worker) => item.address },
]

const workerFilters: FilterDef[] = [
  {
    key: "gender_id",
    label: "Gender",
    options: [
      { value: "1", label: "Male" },
      { value: "2", label: "Female" },
    ],
    getValue: (item: Worker) => item.gender_id,
  },
  {
    key: "deleted",
    label: "Record",
    options: [{ value: "false", label: "Active" }, { value: "true", label: "Deleted" }],
    getValue: (item: Worker) => Boolean(item.deleted_at),
  },
]

const workerSortFields: SortFieldDef[] = [
  { key: "name", getValue: (item: Worker) => item.name },
  { key: "user_email", getValue: (item: Worker) => item.user_email },
  { key: "gender", getValue: (item: Worker) => getGenderLabel(item.gender_id) },
  { key: "date_of_birth", getValue: (item: Worker) => item.date_of_birth },
  { key: "created_at", getValue: (item: Worker) => item.created_at },
]

export default function WorkersPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [deletingWorker, setDeletingWorker] = useState<Worker | null>(null)
  const [hardDelete, setHardDelete] = useState(false)

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["workers", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get("/admin/workers", {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch
        }
      })
      return res.data
    },
  })

  const workers = response?.data || []
  const totalWorkers = getTotalFromMeta(response?.meta)
  const tableControls = useTableControls({
    data: workers,
    searchFields: workerSearchFields,
    filters: workerFilters,
    sortFields: workerSortFields,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/workers/${id}${hardDelete ? '?hard_delete=true' : ''}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] })
      setDeletingWorker(null)
      setHardDelete(false)
      toast.success(`Worker ${hardDelete ? 'hard deleted' : 'soft deleted'} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete worker.")
    }
  })

  const columns: ColumnDef<Worker>[] = [
    {
      header: "Worker Details",
      sortKey: "name",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-secondary/10 flex items-center justify-center text-secondary font-medium">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground flex items-center gap-2">
              {item.name || "Unknown Worker"}
              {item.deleted_at && (
                <Badge variant="outline" className="border-danger text-danger bg-danger/5 text-[10px] h-4 px-1">
                  Deleted
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{item.telephone}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Account Info",
      sortKey: "user_email",
      sortable: true,
      cell: (item) => (
        <div>
          {item.user_email ? (
            <div className="font-medium text-foreground">{item.user_email}</div>
          ) : (
            <div className="text-muted-foreground italic">N/A</div>
          )}
          {item.user_username && <div className="text-sm text-muted-foreground">@{item.user_username}</div>}
        </div>
      )
    },
    {
      header: "Gender",
      sortKey: "gender",
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className="bg-background capitalize">
          {getGenderLabel(item.gender_id)}
        </Badge>
      ),
    },
    {
      header: "Age",
      sortKey: "date_of_birth",
      sortable: true,
      cell: (item) => {
        let age = "N/A"
        if (item.date_of_birth) {
          const diffMs = Date.now() - new Date(item.date_of_birth).getTime()
          const ageDt = new Date(diffMs)
          age = String(Math.abs(ageDt.getUTCFullYear() - 1970))
        }
        return <span className="text-sm">{age}</span>
      },
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
            onClick={() => navigate(`/workers/${item.id}`)}
            title="Edit full profile"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => setDeletingWorker(item)}
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
        <h2 className="text-3xl font-bold tracking-tight">Workers Management</h2>
        <p className="text-muted-foreground">Monitor and manage job seeker profiles.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Registered Workers</CardTitle>
          <CardDescription>Review all job seekers registered on the platform.</CardDescription>
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
            searchPlaceholder="Search by worker name or email..."
            searchFields={workerSearchFields}
            selectedSearchFields={tableControls.selectedSearchFields}
            onToggleSearchField={tableControls.toggleSearchField}
            onSelectAllSearchFields={tableControls.selectAllSearchFields}
            filters={workerFilters}
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
              total: totalWorkers,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>

      {/* Delete Worker AlertDialog */}
      <AlertDialog open={!!deletingWorker} onOpenChange={(open) => !open && setDeletingWorker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete the worker account <strong className="mx-1 text-foreground">"{deletingWorker?.name}"</strong>.
              <br/><br/>
              By default, this is a soft-delete (the worker profile will be disabled but data remains). Check the box below to permanently remove the record from the database.
            </AlertDialogDescription>
            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-danger">
              <input 
                type="checkbox" 
                id="hardDeleteWorker"
                checked={hardDelete}
                onChange={(e) => setHardDelete(e.target.checked)}
                className="rounded border-danger text-danger focus:ring-danger"
              />
              <label htmlFor="hardDeleteWorker" className="font-medium cursor-pointer">
                Hard Delete (Permanently remove from database)
              </label>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingWorker && deleteMutation.mutate(deletingWorker.id)}
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
