import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getTotalFromMeta } from "@/lib/pagination"
import { buildListQueryParams } from "@/lib/list-query"
import { useDebounce } from "@/hooks/use-debounce"
import { useTableControls } from "@/hooks/use-table-controls"
import type { FilterDef, SortFieldDef } from "@/lib/table-controls"

interface AuditLog {
  id: string
  action: string
  user_id: string
  username?: string
  user_email?: string
  ip_address: string
  user_agent?: string
  created_at: string
  /** Optional fields if backend expands the payload later. */
  entity?: string
  entity_id?: string
}

interface PaginatedResponse {
  data: AuditLog[]
  meta: {
    page: number
    limit: number
    totalData: number
    totalPage: number
  }
}

const auditFilters: FilterDef[] = [{
  key: "action",
  label: "Action",
  options: [
    { value: "create", label: "Create" },
    { value: "update", label: "Update" },
    { value: "delete", label: "Delete" },
  ],
  getValue: (item: AuditLog) => item.action,
}]

const auditSortFields: SortFieldDef[] = [
  { key: "created_at", getValue: (item: AuditLog) => item.created_at },
  { key: "action", getValue: (item: AuditLog) => item.action },
]

const AUDIT_LOG_SORT_KEYS = ["created_at", "action"]
const AUDIT_LOG_FILTER_KEYS = ["action"]

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const tableControls = useTableControls({
    data: [],
    filters: auditFilters,
    sortFields: auditSortFields,
    defaultSortBy: "created_at",
    defaultSortOrder: "desc",
    clientSide: false,
  })

  const listParams = {
    ...buildListQueryParams({
      page,
      limit: pageSize,
      search: debouncedSearch,
      sortBy: tableControls.sortBy,
      sortOrder: tableControls.sortOrder,
      defaultSortBy: "created_at",
      defaultSortOrder: "desc",
      filterValues: tableControls.filterValues,
      allowedFilters: AUDIT_LOG_FILTER_KEYS,
      allowedSortBy: AUDIT_LOG_SORT_KEYS,
    }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
  }

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["audit-logs", listParams],
    queryFn: async () => {
      const res = await apiClient.get("/admin/audit-logs", { params: listParams })
      return res.data
    }
  })

  const logs = response?.data || []
  const totalLogs = getTotalFromMeta(response?.meta)

  const columns: ColumnDef<AuditLog>[] = [
    {
      header: "Timestamp",
      sortKey: "created_at",
      sortable: true,
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {new Date(item.created_at).toLocaleString()}
        </span>
      ),
      className: "w-[180px]"
    },
    {
      header: "Action",
      sortKey: "action",
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className={`capitalize ${
          item.action.includes('delete') ? 'text-danger border-danger/30 bg-danger/5' : 
          item.action.includes('update') ? 'text-warning border-warning/30 bg-warning/5' :
          item.action.includes('create') ? 'text-success border-success/30 bg-success/5' :
          'bg-background'
        }`}>
          {item.action}
        </Badge>
      ),
    },
    {
      header: "Performed By",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-sm">{item.username || item.user_email || "Unknown user"}</span>
          <span className="text-xs text-muted-foreground">ID: {item.user_id}</span>
        </div>
      )
    },
    {
      header: "IP Address",
      cell: (item) => (
        <span className="text-sm font-mono">{item.ip_address || "—"}</span>
      )
    },
    {
      header: "User Agent",
      cell: (item) => (
        <span className="text-xs text-muted-foreground line-clamp-2 max-w-[280px] block" title={item.user_agent}>
          {item.user_agent || (item.entity ? `${item.entity}${item.entity_id ? ` #${item.entity_id}` : ""}` : "—")}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">Comprehensive trail of all administrative actions in the system.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>System Activity</CardTitle>
          <CardDescription>Immutable record of changes made by administrators and users.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable 
            columns={columns} 
            data={logs}
            isLoading={isLoading} 
            searchQuery={searchQuery}
            onSearchChange={(query) => {
              setSearchQuery(query)
              tableControls.setSearchQuery(query)
              setPage(1)
            }}
            searchPlaceholder="Search username, action, or IP address..."
            hideSearchFields
            filters={auditFilters}
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
              setDateFrom("")
              setDateTo("")
              tableControls.resetControls()
              setPage(1)
            }}
            hasActiveControls={!!searchQuery.trim() || !!dateFrom || !!dateTo || tableControls.hasActiveControls}
            toolbarExtra={
              <>
                <Input
                  type="date"
                  aria-label="From date"
                  className="h-9 w-[145px]"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value)
                    setPage(1)
                  }}
                />
                <Input
                  type="date"
                  aria-label="To date"
                  className="h-9 w-[145px]"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value)
                    setPage(1)
                  }}
                />
              </>
            }
            pagination={{
              page,
              pageSize,
              total: totalLogs,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
