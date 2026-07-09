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

interface Employer {
  id: string
  company_name: string
  email: string
  is_verified: boolean
}

export default function EmployersPage() {
  const queryClient = useQueryClient()

  const { data: employers = [], isLoading } = useQuery({
    queryKey: ["employers"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/employers")
      return res.data?.data || []
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ id, is_verified }: { id: string, is_verified: boolean }) => {
      const action = is_verified ? "unverify" : "verify"
      await apiClient.put(`/admin/employers/${id}/verify`, { action })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
    }
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
                    <TableCell className="font-medium">{emp.company_name || "N/A"}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>
                      <Badge variant={emp.is_verified ? "default" : "secondary"}>
                        {emp.is_verified ? "Verified" : "Unverified"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => verifyMutation.mutate({ id: emp.id, is_verified: emp.is_verified })}
                        disabled={verifyMutation.isPending}
                      >
                        {emp.is_verified ? "Unverify" : "Verify"}
                      </Button>
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
