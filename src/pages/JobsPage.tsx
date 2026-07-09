import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Briefcase, CheckCircle2, XCircle, Archive, ExternalLink } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Job {
  id: string
  title: string
  company_name: string
  status: string
  created_at: string
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

export default function JobsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["jobs", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get("/admin/jobs", {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch
        }
      })
      return res.data
    },
  })

  const jobs = response?.data || []
  const totalJobs = response?.meta?.totalData || 0

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await apiClient.put(`/admin/jobs/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
    }
  })

  const columns: ColumnDef<Job>[] = [
    {
      header: "Job Details",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center text-accent font-medium">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground">{item.title || "Untitled Job"}</div>
            <div className="text-sm text-muted-foreground">{item.company_name || "Unknown Company"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Posted Date",
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
        
        if (item.status === "APPROVED" || item.status === "ACTIVE") {
          className = "bg-success/10 text-success hover:bg-success/20 border-transparent"
        } else if (item.status === "REJECTED") {
          className = "bg-danger/10 text-danger hover:bg-danger/20 border-transparent"
          variant = "destructive"
        } else if (item.status === "ARCHIVED") {
          className = "bg-muted text-muted-foreground hover:bg-muted/80 border-transparent"
          variant = "secondary"
        } else {
          className = "bg-warning/10 text-warning hover:bg-warning/20 border-transparent"
          variant = "secondary"
        }

        return (
          <Badge variant={variant} className={className}>
            {item.status}
          </Badge>
        )
      },
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            title="View Details"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          {item.status === "PENDING" && (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-success hover:text-success hover:bg-success/10 px-2"
                onClick={() => statusMutation.mutate({ id: item.id, status: "APPROVED" })}
                disabled={statusMutation.isPending}
                title="Approve"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-danger hover:text-danger hover:bg-danger/10 px-2"
                onClick={() => statusMutation.mutate({ id: item.id, status: "REJECTED" })}
                disabled={statusMutation.isPending}
                title="Reject"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {(item.status === "APPROVED" || item.status === "ACTIVE") && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-muted-foreground hover:text-foreground px-2"
              onClick={() => statusMutation.mutate({ id: item.id, status: "ARCHIVED" })}
              disabled={statusMutation.isPending}
              title="Archive"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    }
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
              setPage(1)
            }}
            searchPlaceholder="Search by job title or company..."
            pagination={{
              page,
              pageSize,
              total: totalJobs,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
