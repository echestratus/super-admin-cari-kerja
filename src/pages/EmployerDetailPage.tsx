import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ColumnDef } from "@/components/ui/data-table"
import { ResourceSection } from "@/components/resource-section"
import { ConversationsSection } from "@/components/conversations-section"
import { useLookup, toLookupOptions } from "@/hooks/use-lookup"
import { trustSafetyPath } from "@/lib/trust-safety"
import { ArrowLeft, Building2, Save, CheckCircle2, XCircle, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

interface EmployerDetail {
  id: string
  user_id?: string
  company_name: string
  email?: string
  avatar_url?: string
  company_website?: string
  website?: string
  contact_name?: string
  contact_phone?: string
  telephone?: string
  address?: string
  industry_id?: number
  description?: string
  employee_count?: string
  instagram_url?: string
  tiktok_url?: string
  is_verified?: boolean
  is_vip?: boolean
  vip_start_at?: string
  vip_end_at?: string
  user_email?: string
  user_username?: string
  deleted_at?: string
  created_at?: string
  updated_at?: string
  needs_review?: boolean
  open_fraud_event_id?: string | null
}

const emptyProfile = {
  company_name: "",
  company_email: "",
  telephone: "",
  website: "",
  contact_name: "",
  contact_phone: "",
  address: "",
  industry_id: "",
  description: "",
  employee_count: "",
  instagram_url: "",
  tiktok_url: "",
}

const formatIDR = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)

export default function EmployerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [profileForm, setProfileForm] = useState({ ...emptyProfile })

  const { data: employer, isLoading } = useQuery<EmployerDetail>({
    queryKey: ["employer", id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/employers/${id}`)
      const detail = res.data?.data || res.data
      return {
        ...detail,
        needs_review: Boolean(detail?.needs_review),
      }
    },
    enabled: !!id,
  })

  const { data: industries } = useLookup("industries")

  useEffect(() => {
    if (employer) {
      setProfileForm({
        company_name: employer.company_name || "",
        company_email: employer.email || "",
        telephone: employer.telephone || employer.contact_phone || "",
        website: employer.website || employer.company_website || "",
        contact_name: employer.contact_name || "",
        contact_phone: employer.contact_phone || "",
        address: employer.address || "",
        industry_id: employer.industry_id?.toString() || "",
        description: employer.description || "",
        employee_count: employer.employee_count || "",
        instagram_url: employer.instagram_url || "",
        tiktok_url: employer.tiktok_url || "",
      })
    }
  }, [employer])

  const profileMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_name: profileForm.company_name,
        company_email: profileForm.company_email || null,
        telephone: profileForm.telephone || null,
        company_website: profileForm.website || null,
        contact_name: profileForm.contact_name || null,
        contact_phone: profileForm.contact_phone || null,
        address: profileForm.address || null,
        industry_id: profileForm.industry_id ? Number(profileForm.industry_id) : null,
        description: profileForm.description || null,
        employee_count: profileForm.employee_count || null,
        instagram_url: profileForm.instagram_url || null,
        tiktok_url: profileForm.tiktok_url || null,
      }
      return apiClient.put(`/admin/employers/${id}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer", id] })
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      toast.success("Employer profile updated successfully.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update employer profile.")
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const nextVerified = !employer?.is_verified
      await apiClient.put(`/admin/employers/${id}/verify`, { is_verified: nextVerified })
      return nextVerified
    },
    onSuccess: (nextVerified) => {
      queryClient.invalidateQueries({ queryKey: ["employer", id] })
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      toast.success(`Employer ${nextVerified ? "verified" : "unverified"} successfully.`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update verification status.")
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  const jobPostColumns: ColumnDef<any>[] = [
    {
      header: "Job Post",
      sortKey: "title",
      sortable: true,
      cell: (item) => (
        <div>
          <div className="font-medium">{item.title}</div>
          <div className="text-sm text-muted-foreground">
            {[item.city, item.province].filter(Boolean).join(", ")}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      sortKey: "status_name",
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className="bg-background">
          {item.status_name || `#${item.job_post_status_id}`}
        </Badge>
      ),
    },
    {
      header: "Created",
      sortKey: "created_at",
      sortable: true,
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ]

  const subscriptionColumns: ColumnDef<any>[] = [
    {
      header: "Plan",
      sortKey: "plan_name",
      sortable: true,
      cell: (item) => (
        <div>
          <div className="font-medium">{item.plan_display_name || item.plan_name || `#${item.plan_id}`}</div>
          {item.price_idr != null && (
            <div className="text-sm text-muted-foreground">{formatIDR(Number(item.price_idr))}</div>
          )}
        </div>
      ),
    },
    {
      header: "Period",
      sortKey: "starts_at",
      sortable: true,
      cell: (item) => (
        <span className="text-sm">
          {item.starts_at ? new Date(item.starts_at).toLocaleDateString() : "?"} —{" "}
          {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "?"}
        </span>
      ),
    },
    {
      header: "Status",
      sortKey: "is_active",
      sortable: true,
      cell: (item) => (
        <Badge
          variant={item.is_active ? "default" : "secondary"}
          className={item.is_active ? "bg-success/10 text-success hover:bg-success/20 border-transparent" : ""}
        >
          {item.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ]

  const orderColumns: ColumnDef<any>[] = [
    {
      header: "Order",
      sortKey: "xendit_external_id",
      sortable: true,
      cell: (item) => (
        <div>
          <div className="font-medium text-sm">{item.xendit_external_id || item.id?.slice(0, 8)}</div>
          <div className="text-xs text-muted-foreground capitalize">{item.order_type}</div>
        </div>
      ),
    },
    {
      header: "Amount",
      sortKey: "amount",
      sortable: true,
      cell: (item) => <span className="font-medium">{formatIDR(Number(item.amount || 0))}</span>,
    },
    {
      header: "Status",
      sortKey: "status",
      sortable: true,
      cell: (item) => (
        <Badge variant="outline" className="bg-background capitalize">{item.status}</Badge>
      ),
    },
    {
      header: "Created",
      sortKey: "created_at",
      sortable: true,
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/employers" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 flex-wrap">
                {employer?.company_name || "Employer Detail"}
                {employer?.is_verified ? (
                  <Badge className="bg-success/10 text-success border-transparent">Verified</Badge>
                ) : (
                  <Badge className="bg-warning/10 text-warning border-transparent">Pending Verification</Badge>
                )}
                {employer?.deleted_at && (
                  <Badge variant="outline" className="border-danger text-danger bg-danger/5">Deleted</Badge>
                )}
                {employer?.is_vip && (
                  <Badge className="bg-warning/10 text-warning border-transparent">VIP</Badge>
                )}
                {employer?.needs_review && (
                  <button
                    type="button"
                    className="inline-flex"
                    onClick={() => navigate(trustSafetyPath(employer.open_fraud_event_id))}
                    title="Open related Trust & Safety event"
                  >
                    <Badge className="bg-warning/10 text-warning border-transparent gap-1 cursor-pointer hover:bg-warning/20">
                      <ShieldAlert className="h-3 w-3" />
                      Needs review
                    </Badge>
                  </button>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                {employer?.user_email || "No linked account"}
                {employer?.user_username && ` · @${employer.user_username}`}
              </p>
              {!employer?.is_verified && (
                <p className="text-xs text-warning mt-1">
                  Unverified employers cannot publish job posts on the portal (VERIFICATION_REQUIRED).
                </p>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => verifyMutation.mutate()}
          disabled={verifyMutation.isPending}
          className={employer?.is_verified ? "text-warning" : "text-success"}
        >
          {employer?.is_verified ? (
            <><XCircle className="h-4 w-4 mr-2" /> Unverify</>
          ) : (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Verify</>
          )}
        </Button>
      </div>

      {employer?.needs_review && (
        <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm space-y-2">
          <div className="flex items-center gap-2 font-medium text-warning">
            <ShieldAlert className="h-4 w-4" />
            Related Trust & Safety flag open
          </div>
          <p className="text-muted-foreground text-xs">
            An open fraud event exists on this employer&apos;s user account, job post, or payment order.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-warning border-warning/40"
            onClick={() => navigate(trustSafetyPath(employer.open_fraud_event_id))}
          >
            Resolve in Trust & Safety
          </Button>
        </div>
      )}

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile">Company Profile</TabsTrigger>
          <TabsTrigger value="jobs">Job Posts</TabsTrigger>
          <TabsTrigger value="billing">Subscriptions & Payments</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        {/* ---------------- Profile ---------------- */}
        <TabsContent value="profile" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Complete company profile for this employer.
                {" "}Verification status:{" "}
                <span className={employer?.is_verified ? "text-success font-medium" : "text-warning font-medium"}>
                  {employer?.is_verified ? "Verified" : "Pending"}
                </span>
                . Use the Verify / Unverify button in the header to change it.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="grid gap-4 max-w-3xl">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="e-name">Company Name</Label>
                    <Input
                      id="e-name"
                      value={profileForm.company_name}
                      onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="e-email">Company Email</Label>
                    <Input
                      id="e-email"
                      type="email"
                      value={profileForm.company_email}
                      onChange={(e) => setProfileForm({ ...profileForm, company_email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="e-phone">Telephone</Label>
                    <Input
                      id="e-phone"
                      value={profileForm.telephone}
                      onChange={(e) => setProfileForm({ ...profileForm, telephone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="e-website">Website</Label>
                    <Input
                      id="e-website"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="e-contact-name">Contact Person</Label>
                    <Input
                      id="e-contact-name"
                      value={profileForm.contact_name}
                      onChange={(e) => setProfileForm({ ...profileForm, contact_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="e-contact-phone">Contact Phone</Label>
                    <Input
                      id="e-contact-phone"
                      value={profileForm.contact_phone}
                      onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Industry</Label>
                    <Select
                      value={profileForm.industry_id}
                      onValueChange={(v) => setProfileForm({ ...profileForm, industry_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {toLookupOptions(industries).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="e-employee-count">Employee Count</Label>
                    <Input
                      id="e-employee-count"
                      placeholder="e.g. 51-200"
                      value={profileForm.employee_count}
                      onChange={(e) => setProfileForm({ ...profileForm, employee_count: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e-address">Address</Label>
                  <Input
                    id="e-address"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="e-description">Company Description</Label>
                  <Textarea
                    id="e-description"
                    rows={4}
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="e-instagram">Instagram URL</Label>
                    <Input
                      id="e-instagram"
                      value={profileForm.instagram_url}
                      onChange={(e) => setProfileForm({ ...profileForm, instagram_url: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="e-tiktok">TikTok URL</Label>
                    <Input
                      id="e-tiktok"
                      value={profileForm.tiktok_url}
                      onChange={(e) => setProfileForm({ ...profileForm, tiktok_url: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Button
                    onClick={() => profileMutation.mutate()}
                    disabled={profileMutation.isPending || !profileForm.company_name.trim()}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {profileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- Job Posts ---------------- */}
        <TabsContent value="jobs" className="mt-4">
          <ResourceSection
            title="Job Posts"
            description="All job posts published by this employer. Full editing is available on the Jobs page."
            baseUrl={`/admin/employers/${id}/job-posts`}
            queryKey={["employer-job-posts", id]}
            columns={jobPostColumns}
            getItemLabel={(item) => item.title}
            searchFields={[
              { key: "title", label: "Title", getValue: (item) => item.title },
              { key: "city", label: "City", getValue: (item) => item.city },
              { key: "province", label: "Province", getValue: (item) => item.province },
              { key: "status_name", label: "Status", getValue: (item) => item.status_name },
              { key: "description", label: "Description", getValue: (item) => item.description },
              { key: "created_at", label: "Created Date", getValue: (item) => item.created_at },
            ]}
            defaultSortBy="created_at"
            canCreate={false}
            canEdit={false}
            fields={[]}
          />
        </TabsContent>

        {/* ---------------- Billing ---------------- */}
        <TabsContent value="billing" className="mt-4 space-y-8">
          <ResourceSection
            title="Subscriptions"
            description="Subscription history for this employer. Deactivate or adjust expiry when needed."
            baseUrl={`/admin/employers/${id}/subscriptions`}
            queryKey={["employer-subscriptions", id]}
            columns={subscriptionColumns}
            getItemLabel={(item) => item.plan_display_name || item.plan_name || "subscription"}
            searchFields={[
              { key: "plan_name", label: "Plan", getValue: (item) => item.plan_display_name || item.plan_name },
              { key: "price_idr", label: "Price", getValue: (item) => item.price_idr },
              { key: "starts_at", label: "Start Date", getValue: (item) => item.starts_at },
              { key: "expires_at", label: "Expiry Date", getValue: (item) => item.expires_at },
            ]}
            filters={[{
              key: "is_active",
              label: "Active",
              options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }],
              getValue: (item) => item.is_active,
            }]}
            sortFields={[
              { key: "plan_name", getValue: (item) => item.plan_display_name || item.plan_name },
              { key: "starts_at", getValue: (item) => item.starts_at },
              { key: "is_active", getValue: (item) => item.is_active },
            ]}
            canCreate={false}
            fields={[
              { name: "expires_at", label: "Expires At", type: "date", required: true },
              { name: "is_active", label: "Active", type: "checkbox" },
            ]}
          />
          <ResourceSection
            title="Payment Orders"
            description="Payment transaction history for this employer."
            baseUrl={`/admin/employers/${id}/payment-orders`}
            queryKey={["employer-payment-orders", id]}
            columns={orderColumns}
            getItemLabel={(item) => item.xendit_external_id || "order"}
            searchFields={[
              { key: "xendit_external_id", label: "External ID", getValue: (item) => item.xendit_external_id },
              { key: "xendit_invoice_id", label: "Invoice ID", getValue: (item) => item.xendit_invoice_id },
              { key: "order_type", label: "Type", getValue: (item) => item.order_type },
              { key: "status", label: "Status", getValue: (item) => item.status },
              { key: "amount", label: "Amount", getValue: (item) => item.amount },
              { key: "created_at", label: "Created Date", getValue: (item) => item.created_at },
            ]}
            defaultSortBy="created_at"
            canCreate={false}
            canEdit={false}
            canDelete={false}
            fields={[]}
          />
        </TabsContent>

        {/* ---------------- Conversations ---------------- */}
        <TabsContent value="conversations" className="mt-4">
          <ConversationsSection
            baseUrl={`/admin/employers/${id}/conversations`}
            queryKey={["employer-conversations", id]}
            perspective="employer"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
