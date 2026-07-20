import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Building2, CheckCircle2, XCircle, Edit2, Trash2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { getTotalFromMeta } from "@/lib/pagination"
import { buildListQueryParams } from "@/lib/list-query"
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
import type { FilterDef, SortFieldDef } from "@/lib/table-controls"
import { useLookup, toLookupOptions } from "@/hooks/use-lookup"

interface Employer {
  id: string
  company_name: string
  email: string
  is_verified: boolean
  is_vip?: boolean
  created_at?: string
  updated_at?: string
  deleted_at?: string
  telephone?: string
  industry_id?: number
  description?: string
  website?: string
  user_email?: string
  user_username?: string
}

interface PaginatedResponse {
  data: Employer[]
  meta: {
    page: number
    limit: number
    totalData: number
    totalPage: number
  }
}

const ENCRYPTED_SEARCH_HINT =
  "Gunakan email/nama lengkap untuk hasil akurat (kolom sensitif terenkripsi)."

const EMPLOYER_SORT_KEYS = ["created_at", "updated_at", "is_verified", "is_vip"]
const EMPLOYER_FILTER_KEYS = ["is_verified", "industry_id", "deleted_state"]

export default function EmployersPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [deletingEmployer, setDeletingEmployer] = useState<Employer | null>(null)
  const [hardDelete, setHardDelete] = useState(false)

  const { data: industries } = useLookup("industries")
  const industryOptions = useMemo(() => toLookupOptions(industries), [industries])

  const employerFilters = useMemo<FilterDef[]>(
    () => [
      {
        key: "is_verified",
        label: "Verification",
        options: [
          { value: "true", label: "Verified" },
          { value: "false", label: "Pending" },
        ],
        getValue: (item: Employer) => item.is_verified,
      },
      {
        key: "industry_id",
        label: "Industry",
        options: industryOptions,
        getValue: (item: Employer) => item.industry_id,
      },
      {
        key: "deleted_state",
        label: "Record",
        options: [
          { value: "active", label: "Active only" },
          { value: "deleted", label: "Deleted only" },
          { value: "all", label: "All" },
        ],
        getValue: (item: Employer) => (item.deleted_at ? "deleted" : "active"),
      },
    ],
    [industryOptions]
  )

  const employerSortFields: SortFieldDef[] = [
    { key: "is_verified", getValue: (item: Employer) => item.is_verified },
    { key: "is_vip", getValue: (item: Employer) => item.is_vip },
    { key: "created_at", getValue: (item: Employer) => item.created_at },
    { key: "updated_at", getValue: (item: Employer) => item.updated_at },
  ]

  const tableControls = useTableControls({
    data: [],
    filters: employerFilters,
    sortFields: employerSortFields,
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
    allowedFilters: EMPLOYER_FILTER_KEYS,
    allowedSortBy: EMPLOYER_SORT_KEYS,
  })

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["employers", listParams],
    queryFn: async () => {
      const res = await apiClient.get("/admin/employers", { params: listParams })
      return res.data
    },
  })

  const employers = response?.data || []
  const totalEmployers = getTotalFromMeta(response?.meta)

  const verifyMutation = useMutation({
    mutationFn: async ({ id, is_verified }: { id: string, is_verified: boolean }) => {
      const action = is_verified ? "unverify" : "verify"
      await apiClient.put(`/admin/employers/${id}/verify`, { action })
      return action
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      toast.success(`Employer ${action === "verify" ? "verified" : "unverified"} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update verification status.")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/employers/${id}${hardDelete ? '?hard_delete=true' : ''}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      setDeletingEmployer(null)
      setHardDelete(false)
      toast.success(`Employer ${hardDelete ? 'hard deleted' : 'soft deleted'} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete employer.")
    }
  })

  const columns: ColumnDef<Employer>[] = [
    {
      header: "Company Details",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-secondary/10 flex items-center justify-center text-secondary font-medium">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground flex items-center gap-2">
              {item.company_name || "Unknown Company"}
              {item.deleted_at && (
                <Badge variant="outline" className="border-danger text-danger bg-danger/5 text-[10px] h-4 px-1">
                  Deleted
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{item.email || item.user_email || "No company email"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Account Info",
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
      header: "Status",
      sortKey: "is_verified",
      sortable: true,
      cell: (item) => (
        <div className="flex gap-2">
          <Badge 
            variant={item.is_verified ? "default" : "secondary"}
            className={item.is_verified ? "bg-success/10 text-success hover:bg-success/20 border-transparent" : "bg-warning/10 text-warning hover:bg-warning/20 border-transparent"}
          >
            {item.is_verified ? "Verified" : "Pending Verification"}
          </Badge>
          {item.is_vip && (
            <Badge variant="outline" className="bg-background">VIP</Badge>
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
            onClick={() => navigate(`/employers/${item.id}`)}
            title="Edit full profile"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={item.is_verified ? "text-warning hover:text-warning hover:bg-warning/10" : "text-success hover:text-success hover:bg-success/10"}
            onClick={() => verifyMutation.mutate({ id: item.id, is_verified: item.is_verified })}
            disabled={verifyMutation.isPending}
            title={item.is_verified ? "Unverify" : "Verify"}
          >
            {item.is_verified ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {item.is_verified ? "Unverify" : "Verify"}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => setDeletingEmployer(item)}
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
        <h2 className="text-3xl font-bold tracking-tight">Employers Management</h2>
        <p className="text-muted-foreground">Verify and manage corporate accounts and recruiter profiles.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Registered Employers</CardTitle>
          <CardDescription>Review company verification requests and manage existing employers.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable 
            columns={columns} 
            data={employers} 
            isLoading={isLoading} 
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q)
              tableControls.setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search by company, contact, email, or username..."
            searchHint={ENCRYPTED_SEARCH_HINT}
            hideSearchFields
            filters={employerFilters}
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
              total: totalEmployers,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingEmployer} onOpenChange={(open) => !open && setDeletingEmployer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete the employer account <strong className="mx-1 text-foreground">"{deletingEmployer?.company_name}"</strong>.
              <br/><br/>
              By default, this is a soft-delete (the employer profile will be disabled but data remains). Check the box below to permanently remove the record from the database.
            </AlertDialogDescription>
            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-danger">
              <input 
                type="checkbox" 
                id="hardDeleteEmployer"
                checked={hardDelete}
                onChange={(e) => setHardDelete(e.target.checked)}
                className="rounded border-danger text-danger focus:ring-danger"
              />
              <label htmlFor="hardDeleteEmployer" className="font-medium cursor-pointer">
                Hard Delete (Permanently remove from database)
              </label>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingEmployer && deleteMutation.mutate(deletingEmployer.id)}
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
