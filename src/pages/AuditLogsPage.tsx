import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { getTotalFromMeta } from "@/lib/pagination"
import { useDebounce } from "@/hooks/use-debounce"
import { useTableControls } from "@/hooks/use-table-controls"
import type { FilterDef, SearchFieldDef, SortFieldDef } from "@/lib/table-controls"

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

const auditSearchFields: SearchFieldDef[] = [
  { key: "action", label: "Action", getValue: (item: AuditLog) => item.action },
  { key: "user", label: "User", getValue: (item: AuditLog) => item.username || item.user_email },
  { key: "ip_address", label: "IP Address", getValue: (item: AuditLog) => item.ip_address },
  { key: "user_agent", label: "User Agent", getValue: (item: AuditLog) => item.user_agent },
  { key: "entity", label: "Entity", getValue: (item: AuditLog) => `${item.entity || ""} ${item.entity_id || ""}` },
]

const auditFilters: FilterDef[] = [{
  key: "action_type",
  label: "Action Type",
  options: [
    { value: "create", label: "Create" },
    { value: "update", label: "Update" },
    { value: "delete", label: "Delete" },
  ],
  getValue: (item: AuditLog) =>
    ["create", "update", "delete"].find((type) => item.action.toLowerCase().includes(type)) || "other",
}]

const auditSortFields: SortFieldDef[] = [
  { key: "created_at", getValue: (item: AuditLog) => item.created_at },
  { key: "action", getValue: (item: AuditLog) => item.action },
  { key: "user", getValue: (item: AuditLog) => item.username || item.user_email },
  { key: "ip_address", getValue: (item: AuditLog) => item.ip_address },
]

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 15

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["audit-logs", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get("/admin/audit-logs", {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch || undefined,
        }
      })
      return res.data
    }
  })

  const logs = response?.data || []
  const totalLogs = getTotalFromMeta(response?.meta)
  const tableControls = useTableControls({
    data: logs,
    searchFields: auditSearchFields,
    filters: auditFilters,
    sortFields: auditSortFields,
    defaultSortBy: "created_at",
    defaultSortOrder: "desc",
  })

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
      sortKey: "user",
      sortable: true,
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-sm">{item.username || item.user_email || "Unknown user"}</span>
          <span className="text-xs text-muted-foreground">ID: {item.user_id}</span>
        </div>
      )
    },
    {
      header: "IP Address",
      sortKey: "ip_address",
      sortable: true,
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
            data={tableControls.processedData} 
            isLoading={isLoading} 
            searchQuery={searchQuery}
            onSearchChange={(query) => {
              setSearchQuery(query)
              tableControls.setSearchQuery(query)
              setPage(1)
            }}
            searchPlaceholder="Search username, action, or IP address..."
            searchFields={auditSearchFields}
            selectedSearchFields={tableControls.selectedSearchFields}
            onToggleSearchField={tableControls.toggleSearchField}
            onSelectAllSearchFields={tableControls.selectAllSearchFields}
            filters={auditFilters}
            filterValues={tableControls.filterValues}
            onFilterChange={tableControls.setFilterValue}
            sortBy={tableControls.sortBy}
            sortOrder={tableControls.sortOrder}
            onSortChange={tableControls.toggleSort}
            onResetControls={() => {
              setSearchQuery("")
              tableControls.resetControls()
              setPage(1)
            }}
            hasActiveControls={!!searchQuery.trim() || tableControls.hasActiveControls}
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
