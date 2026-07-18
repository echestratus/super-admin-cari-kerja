import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit2, Trash2 } from "lucide-react"
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

interface LookupTable {
  id: string
  label: string
}

const LOOKUP_GROUPS: { group: string; tables: LookupTable[] }[] = [
  {
    group: "Worker Profile",
    tables: [
      { id: "genders", label: "Genders" },
      { id: "nationalities", label: "Nationalities" },
      { id: "religions", label: "Religions" },
      { id: "marriage_statuses", label: "Marriage Statuses" },
      { id: "proficiency_levels", label: "Language Proficiency Levels" },
      { id: "languages", label: "Languages (Master)" },
    ],
  },
  {
    group: "Jobs & Applications",
    tables: [
      { id: "job_tags", label: "Job Categories (Tags)" },
      { id: "categories", label: "Categories" },
      { id: "industries", label: "Industries" },
      { id: "employment_types", label: "Employment Types" },
      { id: "experience_levels", label: "Experience Levels" },
      { id: "skills", label: "Skills" },
      { id: "salary_types", label: "Salary Types" },
      { id: "job_post_statuses", label: "Job Post Statuses" },
      { id: "application_statuses", label: "Application Statuses" },
      { id: "question_types", label: "Question Types" },
    ],
  },
  {
    group: "System",
    tables: [
      { id: "roles", label: "Roles" },
      { id: "currencies", label: "Currencies" },
    ],
  },
]

const LOOKUP_TABLES = LOOKUP_GROUPS.flatMap((g) => g.tables)

export default function LookupsPage() {
  const queryClient = useQueryClient()
  const [activeTable, setActiveTable] = useState(LOOKUP_TABLES[0].id)
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({ name: "", iso_alpha2: "", iso_alpha3: "" })

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["lookups", activeTable],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/lookups/${activeTable}`)
      return res.data?.data || []
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; name: string }) => {
      const payload: Record<string, string> = { name: data.name }
      if (activeTable === "nationalities") {
        if (formData.iso_alpha2.trim()) payload.iso_alpha2 = formData.iso_alpha2.trim().toUpperCase()
        if (formData.iso_alpha3.trim()) payload.iso_alpha3 = formData.iso_alpha3.trim().toUpperCase()
      }
      if (data.id) {
        return apiClient.put(`/admin/lookups/${activeTable}/${data.id}`, payload)
      }
      return apiClient.post(`/admin/lookups/${activeTable}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookups", activeTable] })
      setIsFormOpen(false)
      toast.success("Record saved successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save record.")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/lookups/${activeTable}/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookups", activeTable] })
      setIsDeleteOpen(false)
      toast.success("Record deleted successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete record.")
    }
  })

  const getDisplayName = (item: any) => {
    if (!item) return "";
    return item.name || item.country_name || item.skill_name || item.gender_name || 
           item.type_name || item.level_name || item.status_name || item.religion_name ||
           item.language_name || item.display_name || item.code || "N/A";
  }

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: getDisplayName(item),
        iso_alpha2: item.iso_alpha2 || "",
        iso_alpha3: item.iso_alpha3 || "",
      })
    } else {
      setEditingItem(null)
      setFormData({ name: "", iso_alpha2: "", iso_alpha3: "" })
    }
    setIsFormOpen(true)
  }

  const handleDeleteClick = (item: any) => {
    setEditingItem(item)
    setIsDeleteOpen(true)
  }

  const columns: ColumnDef<any>[] = [
    {
      header: "ID",
      accessorKey: "id",
      className: "w-[100px]"
    },
    {
      header: "Name / Value",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span>{getDisplayName(item)}</span>
          {activeTable === "currencies" && item.code && (
            <span className="text-xs text-muted-foreground">
              {item.code}{item.symbol ? ` · ${item.symbol}` : ""}
            </span>
          )}
          {activeTable === "nationalities" && item.iso_alpha2 && (
            <span className="text-xs text-muted-foreground">{item.iso_alpha2}</span>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      className: "text-right w-[150px]",
      cell: (item) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => handleOpenForm(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => handleDeleteClick(item)}
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
        <h2 className="text-3xl font-bold tracking-tight">Lookup Management</h2>
        <p className="text-muted-foreground">Manage reference data tables used across the platform.</p>
      </div>

      <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-4 w-full max-w-sm">
          <Label className="whitespace-nowrap font-semibold">Select Table:</Label>
          <Select value={activeTable} onValueChange={setActiveTable}>
            <SelectTrigger>
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              {LOOKUP_GROUPS.map((group) => (
                <SelectGroup key={group.group}>
                  <SelectLabel>{group.group}</SelectLabel>
                  {group.tables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="h-4 w-4" /> Add New
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Data Records</CardTitle>
          <CardDescription>Records for the currently selected lookup table.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable 
            columns={columns} 
            data={records} 
            isLoading={isLoading} 
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Record" : "Add New Record"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the reference value." : "Add a new reference value to the table."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name/Value
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            {activeTable === "nationalities" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="iso2" className="text-right">
                    ISO Alpha-2
                  </Label>
                  <Input
                    id="iso2"
                    maxLength={2}
                    placeholder="e.g. ID"
                    value={formData.iso_alpha2}
                    onChange={(e) => setFormData({ ...formData, iso_alpha2: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="iso3" className="text-right">
                    ISO Alpha-3
                  </Label>
                  <Input
                    id="iso3"
                    maxLength={3}
                    placeholder="e.g. IDN"
                    value={formData.iso_alpha3}
                    onChange={(e) => setFormData({ ...formData, iso_alpha3: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => saveMutation.mutate({ id: editingItem?.id, name: formData.name })}
              disabled={saveMutation.isPending || !formData.name.trim()}
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the record 
              <strong className="mx-1 text-foreground">"{getDisplayName(editingItem)}"</strong> 
              from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => editingItem?.id && deleteMutation.mutate(editingItem.id)}
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
