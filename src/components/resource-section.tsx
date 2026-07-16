import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export interface FieldOption {
  value: string
  label: string
}

export interface FieldDef {
  name: string
  label: string
  type: "text" | "textarea" | "date" | "number" | "checkbox" | "select"
  options?: FieldOption[]
  placeholder?: string
  required?: boolean
}

interface ResourceSectionProps {
  title: string
  description: string
  /** Base admin endpoint, e.g. /admin/workers/123/certifications */
  baseUrl: string
  queryKey: (string | undefined)[]
  columns: ColumnDef<any>[]
  fields: FieldDef[]
  /** Human label for the delete confirmation, derived from the item. */
  getItemLabel: (item: any) => string
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  /** Transform form values before sending to the API. */
  toPayload?: (values: Record<string, any>) => Record<string, any>
  /** Extract initial form values from an existing item. */
  fromItem?: (item: any) => Record<string, any>
}

function defaultValues(fields: FieldDef[]): Record<string, any> {
  return Object.fromEntries(
    fields.map((f) => [f.name, f.type === "checkbox" ? false : ""])
  )
}

export function ResourceSection({
  title,
  description,
  baseUrl,
  queryKey,
  columns,
  fields,
  getItemLabel,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  toPayload,
  fromItem,
}: ResourceSectionProps) {
  const queryClient = useQueryClient()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deletingItem, setDeletingItem] = useState<any>(null)
  const [formValues, setFormValues] = useState<Record<string, any>>(defaultValues(fields))

  const { data: records = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get(baseUrl)
      const body = res.data?.data
      return Array.isArray(body) ? body : body?.data || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload ? toPayload(formValues) : buildPayload(formValues, fields)
      if (editingItem) {
        return apiClient.put(`${baseUrl}/${editingItem.id}`, payload)
      }
      return apiClient.post(baseUrl, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setIsFormOpen(false)
      toast.success(`${title} saved successfully.`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || `Failed to save. The backend admin endpoint may not be available yet.`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`${baseUrl}/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setDeletingItem(null)
      toast.success(`${title} record deleted successfully.`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || `Failed to delete. The backend admin endpoint may not be available yet.`)
    },
  })

  const handleOpenForm = (item?: any) => {
    if (item) {
      setEditingItem(item)
      setFormValues(fromItem ? fromItem(item) : extractValues(item, fields))
    } else {
      setEditingItem(null)
      setFormValues(defaultValues(fields))
    }
    setIsFormOpen(true)
  }

  const allColumns: ColumnDef<any>[] = [
    ...columns,
    ...(canEdit || canDelete
      ? [
          {
            header: "Actions",
            className: "text-right w-[120px]",
            cell: (item: any) => (
              <div className="flex justify-end gap-1">
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={() => handleOpenForm(item)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-danger hover:bg-danger/10"
                    onClick={() => setDeletingItem(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          } satisfies ColumnDef<any>,
        ]
      : []),
  ]

  const requiredMissing = fields.some(
    (f) => f.required && !String(formValues[f.name] ?? "").trim()
  )

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="px-0 pt-0 flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {canCreate && (
          <Button onClick={() => handleOpenForm()} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0">
        {isError ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {(error as any)?.response?.status === 404
              ? "This section requires a backend admin endpoint that is not available yet."
              : "Failed to load data."}
          </div>
        ) : (
          <DataTable columns={allColumns} data={records} isLoading={isLoading} />
        )}
      </CardContent>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div key={field.name} className={field.type === "checkbox" ? "flex items-center gap-2" : "grid gap-2"}>
                {field.type !== "checkbox" && <Label htmlFor={`rs-${field.name}`}>{field.label}</Label>}
                {field.type === "textarea" ? (
                  <Textarea
                    id={`rs-${field.name}`}
                    value={formValues[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={String(formValues[field.name] ?? "")}
                    onValueChange={(v) => setFormValues({ ...formValues, [field.name]: v })}
                  >
                    <SelectTrigger id={`rs-${field.name}`}>
                      <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "checkbox" ? (
                  <>
                    <input
                      type="checkbox"
                      id={`rs-${field.name}`}
                      checked={!!formValues[field.name]}
                      onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor={`rs-${field.name}`} className="cursor-pointer">{field.label}</Label>
                  </>
                ) : (
                  <Input
                    id={`rs-${field.name}`}
                    type={field.type}
                    value={formValues[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || requiredMissing}
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
              <strong className="mx-1 text-foreground">"{deletingItem ? getItemLabel(deletingItem) : ""}"</strong>
              from this {title.toLowerCase()} list.
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
    </Card>
  )
}

function buildPayload(values: Record<string, any>, fields: FieldDef[]): Record<string, any> {
  const payload: Record<string, any> = {}
  for (const field of fields) {
    const raw = values[field.name]
    if (field.type === "checkbox") {
      payload[field.name] = !!raw
    } else if (field.type === "number") {
      payload[field.name] = raw === "" || raw === undefined ? null : Number(raw)
    } else if (field.type === "select") {
      payload[field.name] = raw === "" || raw === undefined ? null : isNaN(Number(raw)) ? raw : Number(raw)
    } else {
      payload[field.name] = raw === "" ? null : raw
    }
  }
  return payload
}

function extractValues(item: any, fields: FieldDef[]): Record<string, any> {
  const values: Record<string, any> = {}
  for (const field of fields) {
    const raw = item[field.name]
    if (field.type === "checkbox") {
      values[field.name] = !!raw
    } else if (field.type === "date") {
      values[field.name] = raw ? new Date(raw).toISOString().split("T")[0] : ""
    } else {
      values[field.name] = raw ?? ""
    }
  }
  return values
}
