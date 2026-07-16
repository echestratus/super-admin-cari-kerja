import { useState } from "react"
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

  const [citySearch, setCitySearch] = useState("")
  const debouncedCitySearch = useDebounce(citySearch, 500)
  const [provinceFilter, setProvinceFilter] = useState<string>("all")

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
    queryKey: ["locations", "cities", provinceFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (provinceFilter !== "all") params.province_id = provinceFilter
      const res = await apiClient.get("/locations/cities", { params })
      return res.data?.data || []
    },
  })

  const provinceNameById = new Map(provinces.map((p) => [p.id, p.name]))
  const filteredCities = cities.filter((c) =>
    c.name.toLowerCase().includes(debouncedCitySearch.toLowerCase())
  )

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
      toast.error(error.response?.data?.message || "Failed to save location. The backend admin endpoint may not be available yet.")
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
      toast.error(error.response?.data?.message || "Failed to delete location. The backend admin endpoint may not be available yet.")
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
        province_id: provinceFilter !== "all" ? provinceFilter : "",
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
    { header: "ID", accessorKey: "id", className: "w-[100px]" },
    {
      header: "Province Name",
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
    { header: "ID", accessorKey: "id", className: "w-[100px]" },
    {
      header: "City Name",
      cell: (item) => (
        <div className="flex items-center gap-2 font-medium">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          {item.name}
        </div>
      ),
    },
    {
      header: "Province",
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
              <DataTable columns={provinceColumns} data={provinces} isLoading={provincesLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cities" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Cities</CardTitle>
              <CardDescription>Cities grouped by province.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Search city name..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                  <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Filter by province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DataTable columns={cityColumns} data={filteredCities} isLoading={citiesLoading} />
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
