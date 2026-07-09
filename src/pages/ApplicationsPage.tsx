import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Eye } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Application {
  id: string
  worker_name: string
  job_title: string
  company_name?: string
  status_name: string
  created_at: string
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

export default function ApplicationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

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
  const totalApplications = response?.meta?.totalData || 0

  const columns: ColumnDef<Application>[] = [
    {
      header: "Applicant",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            {item.worker_name ? item.worker_name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="font-medium text-foreground">{item.worker_name || "Unknown Applicant"}</div>
        </div>
      ),
    },
    {
      header: "Position Details",
      cell: (item) => (
        <div>
          <div className="font-medium text-foreground">{item.job_title || "Unknown Position"}</div>
          <div className="text-sm text-muted-foreground">{item.company_name || "Unknown Company"}</div>
        </div>
      )
    },
    {
      header: "Applied Date",
      cell: (item) => (
        <div className="text-sm text-muted-foreground">
          {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) : "N/A"}
        </div>
      )
    },
    {
      header: "Status",
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
      cell: () => (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            title="View Details"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
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
            data={applications} 
            isLoading={isLoading} 
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search by applicant, job title, or company..."
            pagination={{
              page,
              pageSize,
              total: totalApplications,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
