import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Building2, CheckCircle2, XCircle, Eye } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface Employer {
  id: string
  company_name: string
  email: string
  is_verified: boolean
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

export default function EmployersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["employers", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get("/admin/employers", {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch
        }
      })
      return res.data
    },
  })

  const employers = response?.data || []
  const totalEmployers = response?.meta?.totalData || 0

  const verifyMutation = useMutation({
    mutationFn: async ({ id, is_verified }: { id: string, is_verified: boolean }) => {
      const action = is_verified ? "unverify" : "verify"
      await apiClient.put(`/admin/employers/${id}/verify`, { action })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
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
            <div className="font-medium text-foreground">{item.company_name || "Unknown Company"}</div>
            <div className="text-sm text-muted-foreground">{item.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => (
        <Badge 
          variant={item.is_verified ? "default" : "secondary"}
          className={item.is_verified ? "bg-success/10 text-success hover:bg-success/20 border-transparent" : "bg-warning/10 text-warning hover:bg-warning/20 border-transparent"}
        >
          {item.is_verified ? "Verified" : "Pending Verification"}
        </Badge>
      ),
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
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={item.is_verified ? "text-warning hover:text-warning hover:bg-warning/10" : "text-success hover:text-success hover:bg-success/10"}
            onClick={() => verifyMutation.mutate({ id: item.id, is_verified: item.is_verified })}
            disabled={verifyMutation.isPending}
          >
            {item.is_verified ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {item.is_verified ? "Unverify" : "Verify"}
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
              setPage(1)
            }}
            searchPlaceholder="Search by company name or email..."
            pagination={{
              page,
              pageSize,
              total: totalEmployers,
              onPageChange: setPage
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
