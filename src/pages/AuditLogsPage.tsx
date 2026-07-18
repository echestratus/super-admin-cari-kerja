import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { getTotalFromMeta } from "@/lib/pagination"

interface AuditLog {
  id: string
  action: string
  entity: string
  entity_id: string
  user_id: string
  user_email: string
  ip_address: string
  created_at: string
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

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const pageSize = 15

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["audit-logs", page, pageSize],
    queryFn: async () => {
      const res = await apiClient.get("/admin/audit-logs", {
        params: {
          page,
          limit: pageSize
        }
      })
      return res.data
    }
  })

  const logs = response?.data || []
  const totalLogs = getTotalFromMeta(response?.meta)

  const columns: ColumnDef<AuditLog>[] = [
    {
      header: "Timestamp",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {new Date(item.created_at).toLocaleString()}
        </span>
      ),
      className: "w-[180px]"
    },
    {
      header: "Action",
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
      header: "Entity",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="font-medium">{item.entity}</span>
          <span className="text-xs text-muted-foreground">ID: {item.entity_id}</span>
        </div>
      )
    },
    {
      header: "Performed By",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-sm">{item.user_email}</span>
          <span className="text-xs text-muted-foreground">ID: {item.user_id}</span>
        </div>
      )
    },
    {
      header: "IP Address",
      cell: (item) => (
        <span className="text-sm font-mono">{item.ip_address}</span>
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
            searchQuery=""
            onSearchChange={() => {}}
            searchPlaceholder="Search is disabled for audit logs..."
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
