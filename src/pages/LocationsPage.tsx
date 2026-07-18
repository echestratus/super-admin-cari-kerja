import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit2, Trash2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { useTableControls } from "@/hooks/use-table-controls"
import type { FilterDef, SearchFieldDef } from "@/lib/table-controls"
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

interface Province {
  id: number
  name: string
}

interface City {
  id: number
  name: string
  province_id: number
  province_name?: string
}

export default function LocationsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"provinces" | "cities">("provinces")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Province | City | null>(null)
  const [deletingItem, setDeletingItem] = useState<Province | City | null>(null)
  const [formData, setFormData] = useState({ name: "", province_id: "" })

  const { data: provinces = [], isLoading: provincesLoading } = useQuery<Province[]>({
    queryKey: ["locations", "provinces"],
    queryFn: async () => {
      const res = await apiClient.get("/locations/provinces")
      return res.data?.data || []
    },
  })

  const { data: cities = [], isLoading: citiesLoading } = useQuery<City[]>({
    queryKey: ["locations", "cities"],
    queryFn: async () => {
      const res = await apiClient.get("/locations/cities")
      return res.data?.data || []
    },
  })

  const provinceNameById = new Map(provinces.map((p) => [p.id, p.name]))

  const provinceSearchFields = useMemo<SearchFieldDef[]>(
    () => [
      { key: "id", label: "ID", getValue: (item) => item.id },
      { key: "name", label: "Province Name", getValue: (item) => item.name },
    ],
    []
  )

  const provinceControls = useTableControls({
    data: provinces,
    searchFields: provinceSearchFields,
    sortFields: provinceSearchFields.map((field) => ({ key: field.key, getValue: field.getValue })),
    defaultSortBy: "name",
  })

  const citySearchFields = useMemo<SearchFieldDef[]>(
    () => [
      { key: "id", label: "ID", getValue: (item) => item.id },
      { key: "name", label: "City Name", getValue: (item) => item.name },
      {
        key: "province",
        label: "Province",
        getValue: (item) =>
          item.province_name ||
          provinces.find((province) => province.id === item.province_id)?.name ||
          item.province_id,
      },
    ],
    [provinces]
  )

  const cityFilters = useMemo<FilterDef[]>(
    () => [
      {
        key: "province_id",
        label: "Province",
        options: provinces.map((province) => ({
          value: String(province.id),
          label: province.name,
        })),
        getValue: (item) => String(item.province_id),
      },
    ],
    [provinces]
  )

  const cityControls = useTableControls({
    data: cities,
    searchFields: citySearchFields,
    filters: cityFilters,
    sortFields: citySearchFields.map((field) => ({ key: field.key, getValue: field.getValue })),
    defaultSortBy: "name",
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isCity = activeTab === "cities"
      const payload = isCity
        ? { name: formData.name, province_id: Number(formData.province_id) }
        : { name: formData.name }
      if (editingItem) {
        return apiClient.put(`/admin/locations/${activeTab}/${editingItem.id}`, payload)
      }
      return apiClient.post(`/admin/locations/${activeTab}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] })
      setIsFormOpen(false)
      toast.success("Location saved successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save location.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/admin/locations/${activeTab}/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] })
      setDeletingItem(null)
      toast.success("Location deleted successfully.")
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        toast.error("This province still has cities linked to it. Move or delete its cities first.")
      } else {
        toast.error(error.response?.data?.message || "Failed to delete location.")
      }
      setDeletingItem(null)
    },
  })

  const handleOpenForm = (item?: Province | City) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name || "",
        province_id: "province_id" in item ? String(item.province_id) : "",
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: "",
        province_id:
          cityControls.filterValues.province_id && cityControls.filterValues.province_id !== "all"
            ? cityControls.filterValues.province_id
            : "",
      })
    }
    setIsFormOpen(true)
  }

  const actionButtons = (item: Province | City) => (
    <div className="flex justify-end gap-1">
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
        onClick={() => setDeletingItem(item)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

  const provinceColumns: ColumnDef<Province>[] = [
    { header: "ID", accessorKey: "id", sortKey: "id", sortable: true, className: "w-[100px]" },
    {
      header: "Province Name",
      sortKey: "name",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2 font-medium">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {item.name}
        </div>
      ),
    },
    { header: "Actions", className: "text-right w-[150px]", cell: actionButtons },
  ]

  const cityColumns: ColumnDef<City>[] = [
    { header: "ID", accessorKey: "id", sortKey: "id", sortable: true, className: "w-[100px]" },
    {
      header: "City Name",
      sortKey: "name",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2 font-medium">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {item.name}
        </div>
      ),
    },
    {
      header: "Province",
      sortKey: "province",
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {item.province_name || provinceNameById.get(item.province_id) || `#${item.province_id}`}
        </Badge>
      ),
    },
    { header: "Actions", className: "text-right w-[150px]", cell: actionButtons },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Locations Management</h2>
        <p className="text-muted-foreground">Manage provinces and cities used across the platform.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "provinces" | "cities")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="provinces">Provinces</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
          </TabsList>
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" /> Add {activeTab === "provinces" ? "Province" : "City"}
          </Button>
        </div>

        <TabsContent value="provinces" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Provinces</CardTitle>
              <CardDescription>All provinces available for worker and job locations.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable
                columns={provinceColumns}
                data={provinceControls.processedData}
                isLoading={provincesLoading}
                searchQuery={provinceControls.searchQuery}
                onSearchChange={provinceControls.setSearchQuery}
                searchPlaceholder="Search province ID or name..."
                searchFields={provinceSearchFields}
                selectedSearchFields={provinceControls.selectedSearchFields}
                onToggleSearchField={provinceControls.toggleSearchField}
                onSelectAllSearchFields={provinceControls.selectAllSearchFields}
                sortBy={provinceControls.sortBy}
                sortOrder={provinceControls.sortOrder}
                onSortChange={provinceControls.toggleSort}
                onResetControls={provinceControls.resetControls}
                hasActiveControls={provinceControls.hasActiveControls}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cities" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Cities</CardTitle>
              <CardDescription>Cities grouped by province.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable
                columns={cityColumns}
                data={cityControls.processedData}
                isLoading={citiesLoading}
                searchQuery={cityControls.searchQuery}
                onSearchChange={cityControls.setSearchQuery}
                searchPlaceholder="Search city ID, name, or province..."
                searchFields={citySearchFields}
                selectedSearchFields={cityControls.selectedSearchFields}
                onToggleSearchField={cityControls.toggleSearchField}
                onSelectAllSearchFields={cityControls.selectAllSearchFields}
                filters={cityFilters}
                filterValues={cityControls.filterValues}
                onFilterChange={cityControls.setFilterValue}
                sortBy={cityControls.sortBy}
                sortOrder={cityControls.sortOrder}
                onSortChange={cityControls.toggleSort}
                onResetControls={cityControls.resetControls}
                hasActiveControls={cityControls.hasActiveControls}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Add New"} {activeTab === "provinces" ? "Province" : "City"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "provinces"
                ? "Provinces are used for job and worker locations."
                : "Cities must belong to a province."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="location-name">Name</Label>
              <Input
                id="location-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {activeTab === "cities" && (
              <div className="grid gap-2">
                <Label>Province</Label>
                <Select
                  value={formData.province_id}
                  onValueChange={(v) => setFormData({ ...formData, province_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                !formData.name.trim() ||
                (activeTab === "cities" && !formData.province_id)
              }
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              <strong className="mx-1 text-foreground">"{deletingItem?.name}"</strong>
              {activeTab === "cities"
                ? "from the cities list."
                : "and may affect cities that belong to it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
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
