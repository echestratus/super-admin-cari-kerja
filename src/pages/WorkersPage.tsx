import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { User, Eye } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Worker {
  id: string
  name: string
  email: string
  gender?: string
  date_of_birth?: string
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

export default function WorkersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

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
  const totalWorkers = response?.meta?.totalData || 0

  const columns: ColumnDef<Worker>[] = [
    {
      header: "Worker Details",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-secondary/10 flex items-center justify-center text-secondary font-medium">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground">{item.name || "Unknown Worker"}</div>
            <div className="text-sm text-muted-foreground">{item.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Gender",
      cell: (item) => (
        <Badge variant="outline" className="bg-background capitalize">
          {item.gender || "Not Specified"}
        </Badge>
      ),
    },
    {
      header: "Age",
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
      header: "Actions",
      className: "text-right",
      cell: () => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-4 w-4 mr-2" /> View Profile
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
            data={workers} 
            isLoading={isLoading} 
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search by worker name or email..."
            pagination={{
              page,
              pageSize,
              total: totalWorkers,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
