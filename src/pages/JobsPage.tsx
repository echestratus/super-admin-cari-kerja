import { useQuery } from "@tanstack/react-query"
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
  company: string
  status: string
  posted_date: string
}

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      return [
        { id: "1", title: "Software Engineer", company: "Tech Corp", status: "ACTIVE", posted_date: "2023-10-01" },
        { id: "2", title: "Product Manager", company: "Startup Inc", status: "CLOSED", posted_date: "2023-09-15" },
        { id: "3", title: "Data Analyst", company: "Data Co", status: "PENDING", posted_date: "2023-10-05" },
      ] as Job[]
    },
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
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>{job.posted_date}</TableCell>
                    <TableCell>
                      <Badge variant={job.status === "ACTIVE" ? "default" : job.status === "CLOSED" ? "secondary" : "outline"}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground cursor-pointer hover:underline">Review</span>
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
