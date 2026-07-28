import { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTableControls } from "@/hooks/use-table-controls"
import { useDebounce } from "@/hooks/use-debounce"
import type { SearchFieldDef, SortFieldDef } from "@/lib/table-controls"
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

type CategoryLocale = "id" | "en" | "ru" | "uz"

const CATEGORY_LOCALES: { code: CategoryLocale; label: string; required?: boolean }[] = [
  { code: "id", label: "Bahasa Indonesia", required: true },
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "uz", label: "Oʻzbekcha" },
]

type CategoryTranslationsForm = Record<CategoryLocale, string>

const emptyCategoryTranslations = (): CategoryTranslationsForm => ({
  id: "",
  en: "",
  ru: "",
  uz: "",
})

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

function toCategoryPayload(translations: CategoryTranslationsForm) {
  const map: Record<string, { name: string }> = {}
  for (const { code } of CATEGORY_LOCALES) {
    const name = translations[code].trim()
    if (name) map[code] = { name }
  }
  return { translations: map }
}

export default function LookupsPage() {
  const queryClient = useQueryClient()
  const [activeTable, setActiveTable] = useState(LOOKUP_TABLES[0].id)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const isCategories = activeTable === "categories"

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState({ name: "", iso_alpha2: "", iso_alpha3: "" })
  const [categoryTranslations, setCategoryTranslations] = useState<CategoryTranslationsForm>(
    emptyCategoryTranslations()
  )
  const [categoryLocaleTab, setCategoryLocaleTab] = useState<CategoryLocale>("id")
  const [loadingCategoryDetail, setLoadingCategoryDetail] = useState(false)

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["lookups", activeTable, debouncedSearch],
    queryFn: async () => {
      if (isCategories) {
        const res = await apiClient.get("/categories", {
          params: {
            locale: "id",
            page: 1,
            limit: 200,
            search: debouncedSearch.trim() || undefined,
          },
        })
        const body = res.data?.data
        return Array.isArray(body) ? body : body?.data || []
      }
      const res = await apiClient.get(`/admin/lookups/${activeTable}`, {
        params: { search: debouncedSearch.trim() || undefined },
      })
      return res.data?.data || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isCategories) {
        const idName = categoryTranslations.id.trim()
        if (!idName) throw new Error("Bahasa Indonesia name is required.")
        const payload = toCategoryPayload(categoryTranslations)
        if (editingItem?.id != null) {
          return apiClient.put(`/categories/${editingItem.id}`, payload)
        }
        return apiClient.post("/categories", payload)
      }

      const payload: Record<string, string> = { name: formData.name }
      if (activeTable === "nationalities") {
        if (formData.iso_alpha2.trim()) payload.iso_alpha2 = formData.iso_alpha2.trim().toUpperCase()
        if (formData.iso_alpha3.trim()) payload.iso_alpha3 = formData.iso_alpha3.trim().toUpperCase()
      }
      if (editingItem?.id != null) {
        return apiClient.put(`/admin/lookups/${activeTable}/${editingItem.id}`, payload)
      }
      return apiClient.post(`/admin/lookups/${activeTable}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookups", activeTable] })
      setIsFormOpen(false)
      toast.success("Record saved successfully.")
    },
    onError: (error: any) => {
      toast.error(error?.message || error.response?.data?.message || "Failed to save record.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      if (isCategories) {
        return apiClient.delete(`/categories/${id}`)
      }
      return apiClient.delete(`/admin/lookups/${activeTable}/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lookups", activeTable] })
      setIsDeleteOpen(false)
      toast.success("Record deleted successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete record.")
    },
  })

  const getDisplayName = (item: any) => {
    if (!item) return ""
    return (
      item.name ||
      item.country_name ||
      item.skill_name ||
      item.gender_name ||
      item.type_name ||
      item.level_name ||
      item.status_name ||
      item.religion_name ||
      item.language_name ||
      item.display_name ||
      item.code ||
      "N/A"
    )
  }

  const searchFields = useMemo<SearchFieldDef[]>(() => {
    const fields: SearchFieldDef[] = [
      { key: "id", label: "ID", getValue: (item) => item.id },
      { key: "name", label: "Name / Value", getValue: (item) => getDisplayName(item) },
    ]
    if (activeTable === "currencies") {
      fields.push(
        { key: "code", label: "Code", getValue: (item) => item.code },
        { key: "symbol", label: "Symbol", getValue: (item) => item.symbol }
      )
    }
    if (activeTable === "nationalities") {
      fields.push(
        { key: "iso_alpha2", label: "ISO Alpha-2", getValue: (item) => item.iso_alpha2 },
        { key: "iso_alpha3", label: "ISO Alpha-3", getValue: (item) => item.iso_alpha3 }
      )
    }
    return fields
  }, [activeTable])

  const sortFields = useMemo<SortFieldDef[]>(
    () => searchFields.map((field) => ({ key: field.key, getValue: field.getValue })),
    [searchFields]
  )

  const tableControls = useTableControls({
    data: records,
    searchFields,
    sortFields,
    defaultSortBy: "id",
    defaultSortOrder: "asc",
  })

  useEffect(() => {
    setSearchQuery("")
    tableControls.resetControls()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTable])

  const handleOpenForm = async (item?: any) => {
    setCategoryLocaleTab("id")
    if (item) {
      setEditingItem(item)
      if (isCategories) {
        setCategoryTranslations(emptyCategoryTranslations())
        setLoadingCategoryDetail(true)
        setIsFormOpen(true)
        try {
          const res = await apiClient.get(`/categories/${item.id}`, {
            params: { include_translations: true },
          })
          const detail = res.data?.data || res.data
          const tr = detail?.translations || {}
          setCategoryTranslations({
            id: tr.id?.name || detail?.name || "",
            en: tr.en?.name || "",
            ru: tr.ru?.name || "",
            uz: tr.uz?.name || "",
          })
        } catch {
          setCategoryTranslations({
            ...emptyCategoryTranslations(),
            id: getDisplayName(item),
          })
          toast.error("Failed to load category translations.")
        } finally {
          setLoadingCategoryDetail(false)
        }
        return
      }
      setFormData({
        name: getDisplayName(item),
        iso_alpha2: item.iso_alpha2 || "",
        iso_alpha3: item.iso_alpha3 || "",
      })
    } else {
      setEditingItem(null)
      setFormData({ name: "", iso_alpha2: "", iso_alpha3: "" })
      setCategoryTranslations(emptyCategoryTranslations())
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
      sortKey: "id",
      sortable: true,
      className: "w-[100px]",
    },
    {
      header: "Name / Value",
      sortKey: "name",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span>{getDisplayName(item)}</span>
          {activeTable === "currencies" && item.code && (
            <span className="text-xs text-muted-foreground">
              {item.code}
              {item.symbol ? ` · ${item.symbol}` : ""}
            </span>
          )}
          {activeTable === "nationalities" && item.iso_alpha2 && (
            <span className="text-xs text-muted-foreground">{item.iso_alpha2}</span>
          )}
          {isCategories && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              locale: id
            </span>
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
    },
  ]

  const categorySaveDisabled =
    saveMutation.isPending || loadingCategoryDetail || !categoryTranslations.id.trim()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Lookup Management</h2>
        <p className="text-muted-foreground">
          Manage reference data tables used across the platform.
          {isCategories && " Categories support translations (id, en, ru, uz)."}
        </p>
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
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
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
          <CardDescription>
            {isCategories
              ? "Category list shows Indonesian names (locale=id). Edit to manage all translations."
              : "Records for the currently selected lookup table."}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable
            columns={columns}
            data={tableControls.processedData}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(query) => {
              setSearchQuery(query)
              tableControls.setSearchQuery(query)
            }}
            searchPlaceholder="Search ID, name, ISO codes, currency code..."
            searchFields={searchFields}
            selectedSearchFields={tableControls.selectedSearchFields}
            onToggleSearchField={tableControls.toggleSearchField}
            onSelectAllSearchFields={tableControls.selectAllSearchFields}
            sortBy={tableControls.sortBy}
            sortOrder={tableControls.sortOrder}
            onSortChange={tableControls.toggleSort}
            onResetControls={tableControls.resetControls}
            hasActiveControls={tableControls.hasActiveControls}
          />
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className={isCategories ? "max-w-lg" : undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? isCategories
                  ? "Edit category"
                  : "Edit Record"
                : isCategories
                  ? "New category"
                  : "Add New Record"}
            </DialogTitle>
            <DialogDescription>
              {isCategories
                ? "One category id with names per locale. Indonesian is required; other locales are optional."
                : editingItem
                  ? "Update the reference value."
                  : "Add a new reference value to the table."}
            </DialogDescription>
          </DialogHeader>

          {isCategories ? (
            <div className="py-2">
              {loadingCategoryDetail ? (
                <div className="h-32 rounded-md bg-muted/40 animate-pulse" />
              ) : (
                <Tabs
                  value={categoryLocaleTab}
                  onValueChange={(v) => setCategoryLocaleTab(v as CategoryLocale)}
                >
                  <TabsList className="grid w-full grid-cols-4 h-auto">
                    {CATEGORY_LOCALES.map((locale) => (
                      <TabsTrigger key={locale.code} value={locale.code} className="text-xs px-1">
                        {locale.code.toUpperCase()}
                        {locale.required ? "*" : ""}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {CATEGORY_LOCALES.map((locale) => (
                    <TabsContent key={locale.code} value={locale.code} className="mt-4 space-y-2">
                      <Label htmlFor={`cat-name-${locale.code}`}>
                        {locale.label}
                        {locale.required ? " *" : " (optional)"}
                      </Label>
                      <Input
                        id={`cat-name-${locale.code}`}
                        value={categoryTranslations[locale.code]}
                        onChange={(e) =>
                          setCategoryTranslations((prev) => ({
                            ...prev,
                            [locale.code]: e.target.value,
                          }))
                        }
                        placeholder={`Name in ${locale.label}`}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          ) : (
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
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                isCategories
                  ? categorySaveDisabled
                  : saveMutation.isPending || !formData.name.trim()
              }
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the record
              <strong className="mx-1 text-foreground">"{getDisplayName(editingItem)}"</strong>
              from the system
              {isCategories ? " (including all locale translations)." : "."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => editingItem?.id != null && deleteMutation.mutate(editingItem.id)}
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
