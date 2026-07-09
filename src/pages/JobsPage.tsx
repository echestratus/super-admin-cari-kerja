import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Job {
  id: string
  title: string
  company_name: string
  status: string
  created_at: string
}

export default function JobsPage() {
  const queryClient = useQueryClient()

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/jobs")
      return res.data?.data || []
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await apiClient.put(`/admin/jobs/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Jobs Management</h2>
        <p className="text-muted-foreground">Monitor and manage job postings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Posted Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title || "N/A"}</TableCell>
                    <TableCell>{job.company_name || "N/A"}</TableCell>
                    <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={job.status === "APPROVED" || job.status === "ACTIVE" ? "default" : job.status === "REJECTED" ? "destructive" : "secondary"}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {job.status === "PENDING" && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: job.id, status: "APPROVED" })}
                            disabled={statusMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: job.id, status: "REJECTED" })}
                            disabled={statusMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {job.status === "APPROVED" && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: job.id, status: "ARCHIVED" })}
                          disabled={statusMutation.isPending}
                        >
                          Archive
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
