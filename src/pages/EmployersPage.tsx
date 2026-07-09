import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Building2, CheckCircle2, XCircle, Edit2, Trash2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface Employer {
  id: string
  company_name: string
  company_email: string
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

  const [editingEmployer, setEditingEmployer] = useState<Employer | null>(null)
  const [deletingEmployer, setDeletingEmployer] = useState<Employer | null>(null)
  const [formData, setFormData] = useState({
    company_name: "",
    company_email: "",
  })

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
      return action
    },
    onSuccess: (action) => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      toast.success(`Employer ${action === "verify" ? "verified" : "unverified"} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update verification status.")
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.put(`/admin/employers/${id}`, formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      setEditingEmployer(null)
      toast.success("Employer updated successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update employer.")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/employers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      setDeletingEmployer(null)
      toast.success("Employer deleted successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete employer.")
    }
  })

  const handleEditClick = (employer: Employer) => {
    setEditingEmployer(employer)
    setFormData({
      company_name: employer.company_name || "",
      company_email: employer.company_email || "",
    })
  }

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
            <div className="text-sm text-muted-foreground">{item.company_email}</div>
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
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => handleEditClick(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={item.is_verified ? "text-warning hover:text-warning hover:bg-warning/10" : "text-success hover:text-success hover:bg-success/10"}
            onClick={() => verifyMutation.mutate({ id: item.id, is_verified: item.is_verified })}
            disabled={verifyMutation.isPending}
            title={item.is_verified ? "Unverify" : "Verify"}
          >
            {item.is_verified ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            {item.is_verified ? "Unverify" : "Verify"}
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => setDeletingEmployer(item)}
          >
            <Trash2 className="h-4 w-4" />
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

      {/* Edit Employer Dialog */}
      <Dialog open={!!editingEmployer} onOpenChange={(open) => !open && setEditingEmployer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employer Profile</DialogTitle>
            <DialogDescription>
              Update basic information for this corporate account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company_email">Email</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.company_email}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEmployer(null)}>Cancel</Button>
            <Button 
              onClick={() => editingEmployer && saveMutation.mutate(editingEmployer.id)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Employer AlertDialog */}
      <AlertDialog open={!!deletingEmployer} onOpenChange={(open) => !open && setDeletingEmployer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employer account
              <strong className="mx-1 text-foreground">"{deletingEmployer?.company_name}"</strong> 
              and all of their associated data including jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingEmployer && deleteMutation.mutate(deletingEmployer.id)}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
