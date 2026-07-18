import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Receipt, Eye } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { getTotalFromMeta } from "@/lib/pagination"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTableControls } from "@/hooks/use-table-controls"
import type { SearchFieldDef, SortFieldDef } from "@/lib/table-controls"

interface PaymentOrder {
  id: string
  recruiter_id: string
  company_name?: string
  order_type: "subscription" | "single_post" | "boost"
  plan_id: number
  plan_type: string
  plan_name?: string
  job_post_id?: string
  xendit_invoice_id?: string
  xendit_external_id?: string
  amount: number
  status: "pending" | "paid" | "expired" | "failed"
  paid_at?: string
  invoice_expires_at?: string
  created_at?: string
  updated_at?: string
}

interface PaginatedResponse {
  data: PaymentOrder[]
  meta?: {
    page?: number
    limit?: number
    per_page?: number
    totalData?: number
    total_data?: number
    totalPage?: number
    total_pages?: number
  }
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success/10 text-success border-transparent",
  pending: "bg-warning/10 text-warning border-transparent",
  expired: "bg-muted text-muted-foreground border-transparent",
  failed: "bg-danger/10 text-danger border-transparent",
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  subscription: "Subscription",
  single_post: "Single Post",
  boost: "Boost",
}

const formatIDR = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)

const paymentSearchFields: SearchFieldDef[] = [
  { key: "company_name", label: "Company", getValue: (item: PaymentOrder) => item.company_name },
  { key: "plan_name", label: "Plan", getValue: (item: PaymentOrder) => item.plan_name },
  { key: "xendit_invoice_id", label: "Invoice ID", getValue: (item: PaymentOrder) => item.xendit_invoice_id },
  { key: "xendit_external_id", label: "External ID", getValue: (item: PaymentOrder) => item.xendit_external_id },
  { key: "amount", label: "Amount", getValue: (item: PaymentOrder) => item.amount },
]

const paymentSortFields: SortFieldDef[] = [
  { key: "xendit_external_id", getValue: (item: PaymentOrder) => item.xendit_external_id || item.id },
  { key: "order_type", getValue: (item: PaymentOrder) => item.order_type },
  { key: "plan_name", getValue: (item: PaymentOrder) => item.plan_name || item.plan_id },
  { key: "amount", getValue: (item: PaymentOrder) => item.amount },
  { key: "status", getValue: (item: PaymentOrder) => item.status },
  { key: "created_at", getValue: (item: PaymentOrder) => item.created_at },
]

export default function PaymentOrdersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [viewingOrder, setViewingOrder] = useState<PaymentOrder | null>(null)
  const [newStatus, setNewStatus] = useState("")

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["payment-orders", page, pageSize, debouncedSearch, statusFilter, typeFilter],
    queryFn: async () => {
      const res = await apiClient.get("/admin/payment-orders", {
        params: {
          page,
          limit: pageSize,
          search: debouncedSearch,
          ...(statusFilter !== "all" && { status: statusFilter }),
          ...(typeFilter !== "all" && { order_type: typeFilter }),
        },
      })
      return res.data
    },
  })

  const orders = response?.data || []
  const totalOrders = getTotalFromMeta(response?.meta)
  const tableControls = useTableControls({
    data: orders,
    searchFields: paymentSearchFields,
    sortFields: paymentSortFields,
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiClient.put(`/admin/payment-orders/${id}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-orders"] })
      setViewingOrder(null)
      toast.success("Order status updated successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update order status.")
    },
  })

  const openOrderDetail = async (item: PaymentOrder) => {
    setViewingOrder(item)
    setNewStatus(item.status)
    try {
      const res = await apiClient.get(`/admin/payment-orders/${item.id}`)
      const detail = res.data?.data || res.data
      if (detail?.id) {
        setViewingOrder(detail)
        setNewStatus(detail.status)
      }
    } catch {
      // Keep list row data if detail fetch fails.
    }
  }

  const columns: ColumnDef<PaymentOrder>[] = [
    {
      header: "Order",
      sortKey: "xendit_external_id",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-secondary/10 flex items-center justify-center text-secondary">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground">
              {item.xendit_external_id || item.id.slice(0, 8)}
            </div>
            <div className="text-sm text-muted-foreground">
              {item.company_name || item.recruiter_id.slice(0, 8)}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      sortKey: "order_type",
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {ORDER_TYPE_LABELS[item.order_type] || item.order_type}
        </Badge>
      ),
    },
    {
      header: "Plan",
      sortKey: "plan_name",
      sortable: true,
      cell: (item) => <span className="text-sm">{item.plan_name || `#${item.plan_id}`}</span>,
    },
    {
      header: "Amount",
      sortKey: "amount",
      sortable: true,
      cell: (item) => <span className="font-medium">{formatIDR(item.amount)}</span>,
    },
    {
      header: "Status",
      sortKey: "status",
      sortable: true,
      cell: (item) => (
        <Badge className={STATUS_STYLES[item.status] || ""} variant="secondary">
          {item.status}
        </Badge>
      ),
    },
    {
      header: "Dates",
      sortKey: "created_at",
      sortable: true,
      cell: (item) => (
        <div className="text-xs text-muted-foreground flex flex-col gap-1">
          <div>Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}</div>
          {item.paid_at && <div>Paid: {new Date(item.paid_at).toLocaleDateString()}</div>}
        </div>
      ),
    },
    {
      header: "Actions",
      className: "text-right w-[80px]",
      cell: (item) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => openOrderDetail(item)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Payment Orders</h2>
        <p className="text-muted-foreground">Monitor all payment transactions from recruiters.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Label className="whitespace-nowrap text-sm">Status:</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="whitespace-nowrap text-sm">Type:</Label>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="single_post">Single Post</SelectItem>
              <SelectItem value="boost">Boost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Transactions</CardTitle>
          <CardDescription>All subscription, single post, and boost purchases.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable
            columns={columns}
            data={tableControls.processedData}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q)
              tableControls.setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search by company or invoice ID..."
            searchFields={paymentSearchFields}
            selectedSearchFields={tableControls.selectedSearchFields}
            onToggleSearchField={tableControls.toggleSearchField}
            onSelectAllSearchFields={tableControls.selectAllSearchFields}
            sortBy={tableControls.sortBy}
            sortOrder={tableControls.sortOrder}
            onSortChange={tableControls.toggleSort}
            onResetControls={() => {
              setSearchQuery("")
              setPage(1)
              tableControls.resetControls()
            }}
            hasActiveControls={tableControls.hasActiveControls}
            pagination={{
              page,
              pageSize,
              total: totalOrders,
              onPageChange: setPage,
            }}
          />
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Full information for this payment order.</DialogDescription>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Order ID</div>
                  <div className="font-mono text-xs break-all">{viewingOrder.id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Recruiter</div>
                  <div className="font-medium">{viewingOrder.company_name || viewingOrder.recruiter_id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Type</div>
                  <div>{ORDER_TYPE_LABELS[viewingOrder.order_type] || viewingOrder.order_type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Plan</div>
                  <div>{viewingOrder.plan_name || `${viewingOrder.plan_type} #${viewingOrder.plan_id}`}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Amount</div>
                  <div className="font-medium">{formatIDR(viewingOrder.amount)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Xendit Invoice</div>
                  <div className="font-mono text-xs break-all">{viewingOrder.xendit_invoice_id || "N/A"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Created</div>
                  <div>{viewingOrder.created_at ? new Date(viewingOrder.created_at).toLocaleString() : "N/A"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Paid At</div>
                  <div>{viewingOrder.paid_at ? new Date(viewingOrder.paid_at).toLocaleString() : "Not paid"}</div>
                </div>
              </div>

              <div className="border-t pt-4 grid gap-2">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Manually correcting a status does not trigger plan activation. Use with caution.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingOrder(null)}>Close</Button>
            <Button
              onClick={() => viewingOrder && statusMutation.mutate({ id: viewingOrder.id, status: newStatus })}
              disabled={statusMutation.isPending || newStatus === viewingOrder?.status}
            >
              {statusMutation.isPending ? "Saving..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
