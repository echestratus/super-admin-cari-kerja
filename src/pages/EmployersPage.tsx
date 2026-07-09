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

interface Employer {
  id: string
  company_name: string
  email: string
  status: string
}

export default function EmployersPage() {
  const { data: employers = [], isLoading } = useQuery({
    queryKey: ["employers"],
    queryFn: async () => {
      // return (await apiClient.get("/employers")).data
      return [
        { id: "1", company_name: "Tech Corp", email: "hr@techcorp.com", status: "VERIFIED" },
        { id: "2", company_name: "Startup Inc", email: "founders@startup.io", status: "PENDING" },
        { id: "3", company_name: "Scam Co", email: "admin@scam.com", status: "REJECTED" },
      ] as Employer[]
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Employers Management</h2>
        <p className="text-muted-foreground">Verify and manage company accounts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : (
                employers.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.company_name}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>
                      <Badge variant={emp.status === "VERIFIED" ? "default" : emp.status === "REJECTED" ? "destructive" : "secondary"}>
                        {emp.status}
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
