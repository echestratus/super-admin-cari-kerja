import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit2, Trash2, CreditCard, Zap, Package } from "lucide-react"
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

type PlanType = "subscription" | "single_post" | "boost"

interface Plan {
  id: number
  name: string
  display_name: string
  price_idr: number
  duration_days: number
  is_active: boolean
  plan_type?: PlanType
  max_active_posts?: number
  is_hot?: boolean
  boost_priority?: number
}

function groupPlansByType(raw: unknown): Record<PlanType, Plan[]> {
  const empty: Record<PlanType, Plan[]> = { subscription: [], single_post: [], boost: [] }

  if (Array.isArray(raw)) {
    for (const plan of raw as Plan[]) {
      const type = plan.plan_type
      if (type && empty[type]) empty[type].push(plan)
    }
    return empty
  }

  if (raw && typeof raw === "object") {
    const grouped = raw as Partial<Record<PlanType, Plan[]>>
    return {
      subscription: grouped.subscription || [],
      single_post: grouped.single_post || [],
      boost: grouped.boost || [],
    }
  }

  return empty
}

const PLAN_TABS: { id: PlanType; label: string; icon: typeof CreditCard; description: string }[] = [
  { id: "subscription", label: "Subscriptions", icon: CreditCard, description: "Recurring plans that allow recruiters to keep multiple job posts active." },
  { id: "single_post", label: "Single Posts", icon: Package, description: "One-time plans for a single job post slot (Regular or Hot)." },
  { id: "boost", label: "Boosts", icon: Zap, description: "Plans that push job posts to the top of search results." },
]

const formatIDR = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)

const emptyForm = {
  name: "",
  display_name: "",
  price_idr: "",
  duration_days: "",
  max_active_posts: "",
  is_hot: false,
  boost_priority: "",
  is_active: true,
}

export default function PlansPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<PlanType>("subscription")

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

  const { data: plansData, isLoading } = useQuery<Record<PlanType, Plan[]>>({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/plans")
      return groupPlansByType(res.data?.data)
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isCreate = !editingPlan
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        display_name: formData.display_name.trim(),
        price_idr: Number(formData.price_idr),
        duration_days: Number(formData.duration_days),
        is_active: formData.is_active,
      }

      // Type-specific fields: required on create; optional on update; never send for other types.
      if (activeTab === "subscription") {
        if (isCreate || formData.max_active_posts !== "") {
          payload.max_active_posts = Number(formData.max_active_posts)
        }
      } else if (activeTab === "single_post") {
        payload.is_hot = formData.is_hot
      } else if (activeTab === "boost") {
        if (isCreate || formData.boost_priority !== "") {
          payload.boost_priority = Number(formData.boost_priority)
        }
      }

      if (editingPlan) {
        return apiClient.put(`/admin/plans/${activeTab}/${editingPlan.id}`, payload)
      }
      return apiClient.post(`/admin/plans/${activeTab}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
      setIsFormOpen(false)
      toast.success("Plan saved successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save plan.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/admin/plans/${activeTab}/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] })
      setDeletingPlan(null)
      toast.success("Plan deleted successfully.")
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        toast.error("This plan has existing purchases and cannot be deleted. Deactivate it instead by unchecking \"Active\" in the edit form.")
      } else {
        toast.error(error.response?.data?.message || "Failed to delete plan.")
      }
      setDeletingPlan(null)
    },
  })

  const handleOpenForm = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan)
      setFormData({
        name: plan.name || "",
        display_name: plan.display_name || "",
        price_idr: String(plan.price_idr ?? ""),
        duration_days: String(plan.duration_days ?? ""),
        max_active_posts: String(plan.max_active_posts ?? ""),
        is_hot: plan.is_hot ?? false,
        boost_priority: String(plan.boost_priority ?? ""),
        is_active: plan.is_active ?? true,
      })
    } else {
      setEditingPlan(null)
      setFormData({ ...emptyForm })
    }
    setIsFormOpen(true)
  }

  const buildColumns = (type: PlanType): ColumnDef<Plan>[] => {
    const columns: ColumnDef<Plan>[] = [
      {
        header: "Plan",
        cell: (item) => (
          <div>
            <div className="font-medium text-foreground">{item.display_name}</div>
            <div className="text-sm text-muted-foreground">{item.name}</div>
          </div>
        ),
      },
      {
        header: "Price",
        cell: (item) => <span className="font-medium">{formatIDR(item.price_idr)}</span>,
      },
      {
        header: "Duration",
        cell: (item) => <span>{item.duration_days} days</span>,
      },
    ]

    if (type === "subscription") {
      columns.push({
        header: "Max Active Posts",
        cell: (item) => <Badge variant="outline" className="bg-background">{item.max_active_posts}</Badge>,
      })
    }
    if (type === "single_post") {
      columns.push({
        header: "Hot",
        cell: (item) =>
          item.is_hot ? (
            <Badge className="bg-warning/10 text-warning border-transparent">Hot</Badge>
          ) : (
            <Badge variant="outline" className="bg-background">Regular</Badge>
          ),
      })
    }
    if (type === "boost") {
      columns.push({
        header: "Priority",
        cell: (item) => (
          <Badge variant="outline" className="bg-background">
            {item.boost_priority === 1 ? "Hot (Top)" : `Top ${item.boost_priority}`}
          </Badge>
        ),
      })
    }

    columns.push(
      {
        header: "Status",
        cell: (item) => (
          <Badge
            variant={item.is_active ? "default" : "secondary"}
            className={item.is_active ? "bg-success/10 text-success hover:bg-success/20 border-transparent" : ""}
          >
            {item.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        header: "Actions",
        className: "text-right w-[120px]",
        cell: (item) => (
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
              onClick={() => setDeletingPlan(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      }
    )
    return columns
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Plans Management</h2>
        <p className="text-muted-foreground">Manage subscription, single post, and boost pricing plans.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PlanType)}>
        <div className="flex items-center justify-between">
          <TabsList>
            {PLAN_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Plan
          </Button>
        </div>

        {PLAN_TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="px-0 pt-0">
                <CardTitle>{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <DataTable
                  columns={buildColumns(tab.id)}
                  data={plansData?.[tab.id] || []}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Add New Plan"}</DialogTitle>
            <DialogDescription>
              {PLAN_TABS.find((t) => t.id === activeTab)?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-name">Internal Name</Label>
                <Input
                  id="plan-name"
                  placeholder="e.g. basic_monthly"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-display-name">Display Name</Label>
                <Input
                  id="plan-display-name"
                  placeholder="e.g. Basic Monthly"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-price">Price (IDR)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  value={formData.price_idr}
                  onChange={(e) => setFormData({ ...formData, price_idr: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-duration">Duration (days)</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min={1}
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                />
              </div>
            </div>

            {activeTab === "subscription" && (
              <div className="grid gap-2">
                <Label htmlFor="plan-max-posts">Max Active Posts</Label>
                <Input
                  id="plan-max-posts"
                  type="number"
                  min={1}
                  value={formData.max_active_posts}
                  onChange={(e) => setFormData({ ...formData, max_active_posts: e.target.value })}
                />
              </div>
            )}

            {activeTab === "single_post" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="plan-is-hot"
                  checked={formData.is_hot}
                  onChange={(e) => setFormData({ ...formData, is_hot: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="plan-is-hot" className="cursor-pointer">Hot post (highlighted placement)</Label>
              </div>
            )}

            {activeTab === "boost" && (
              <div className="grid gap-2">
                <Label htmlFor="plan-priority">Boost Priority</Label>
                <Input
                  id="plan-priority"
                  type="number"
                  min={1}
                  placeholder="1 = Hot (top), 10 = Top 10"
                  value={formData.boost_priority}
                  onChange={(e) => setFormData({ ...formData, boost_priority: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="plan-is-active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="plan-is-active" className="cursor-pointer">Active (visible to recruiters)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                !formData.name.trim() ||
                formData.name.trim().length > 50 ||
                !formData.display_name.trim() ||
                formData.display_name.trim().length > 100 ||
                formData.price_idr === "" ||
                Number(formData.price_idr) < 0 ||
                !formData.duration_days ||
                Number(formData.duration_days) < 1 ||
                (!editingPlan && activeTab === "subscription" && (!formData.max_active_posts || Number(formData.max_active_posts) < 1)) ||
                (!editingPlan && activeTab === "boost" && (!formData.boost_priority || Number(formData.boost_priority) < 1))
              }
            >
              {saveMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the plan
              <strong className="mx-1 text-foreground">"{deletingPlan?.display_name}"</strong>.
              Existing purchases referencing this plan may be affected. Consider deactivating instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPlan && deleteMutation.mutate(deletingPlan.id)}
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
