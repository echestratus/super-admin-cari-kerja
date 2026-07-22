import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  ThumbsDown,
  ThumbsUp,
  ClipboardList,
} from "lucide-react"
import { toast } from "sonner"
import { getTotalFromMeta } from "@/lib/pagination"
import { resolveUploadUrl } from "@/lib/uploads"
import { cn } from "@/lib/utils"

type ApplicationStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | string
type ReactivationStatus = "open" | "approved" | "rejected" | "cancelled" | string

interface VerificationApplication {
  id: string
  recruiter_id: string
  status: ApplicationStatus
  company_legal_name?: string
  npwp_number?: string
  nib_number?: string
  applicant_notes?: string | null
  admin_note?: string | null
  rejection_reason?: string | null
  submitted_at?: string | null
  reviewed_at?: string | null
  created_at?: string
  company_name?: string
  verification_status?: string
  is_verified?: boolean
  email?: string
  username?: string
  is_suspended?: boolean
  suspension_reason?: string | null
  verification_deadline_at?: string | null
}

interface VerificationDocument {
  id: string
  application_id: string
  doc_type: string
  file_url: string
  file_name?: string
  mime_type?: string
  uploaded_at?: string
}

interface ReactivationRequest {
  id: string
  user_id: string
  recruiter_id: string
  application_id?: string | null
  reason?: string | null
  status: ReactivationStatus
  admin_note?: string | null
  created_at?: string
  company_name?: string
  verification_status?: string
  is_verified?: boolean
  email?: string
  is_suspended?: boolean
  suspension_reason?: string | null
  application_status?: string
  submitted_at?: string | null
}

interface ApplicationDetail {
  application: VerificationApplication
  documents: VerificationDocument[]
  reactivation_request?: ReactivationRequest | null
  missing_required?: string[]
}

const DOC_LABELS: Record<string, string> = {
  npwp: "NPWP Perusahaan",
  nib: "NIB",
  akta: "Akta Pendirian",
  ktp_pic: "KTP PIC",
  sk_kemenkumham: "SK Kemenkumham",
  domicile: "Surat Domisili",
}

const APP_STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
]

const REACTIVATION_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
]

function appStatusClass(status: string) {
  if (status === "approved") return "bg-success/10 text-success border-transparent"
  if (status === "rejected") return "bg-danger/10 text-danger border-transparent"
  if (status === "under_review") return "bg-accent/10 text-accent border-transparent"
  if (status === "submitted") return "bg-warning/10 text-warning border-transparent"
  return "bg-muted text-muted-foreground border-transparent"
}

function canReview(status?: string) {
  return status === "submitted" || status === "under_review"
}

export default function EmployerVerificationPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get("tab") === "reactivation" ? "reactivation" : "applications"
  const [tab, setTab] = useState(initialTab)

  const statusFromUrl = searchParams.get("status")
  const [appStatus, setAppStatus] = useState(
    statusFromUrl && APP_STATUS_OPTIONS.some((o) => o.value === statusFromUrl)
      ? statusFromUrl
      : "submitted"
  )
  const [appPage, setAppPage] = useState(1)
  const [reactivationStatus, setReactivationStatus] = useState("open")
  const [reactivationPage, setReactivationPage] = useState(1)
  const pageSize = 20

  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("applicationId") || null
  )
  const [adminNote, setAdminNote] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    const id = searchParams.get("applicationId")
    if (id) setSelectedId(id)
  }, [searchParams])

  const listParams = { status: appStatus === "all" ? undefined : appStatus, page: appPage, limit: pageSize }

  const { data: listResponse, isLoading: listLoading } = useQuery({
    queryKey: ["employer-verification-applications", listParams],
    queryFn: async () => {
      const res = await apiClient.get("/admin/employer-verification/applications", {
        params: {
          page: listParams.page,
          limit: listParams.limit,
          ...(listParams.status ? { status: listParams.status } : {}),
        },
      })
      const body = res.data?.data
      return {
        data: (body?.data || []) as VerificationApplication[],
        meta: body?.meta || {},
      }
    },
  })

  const applications = listResponse?.data || []
  const totalApplications = getTotalFromMeta(listResponse?.meta)

  const { data: reactivationResponse, isLoading: reactivationLoading } = useQuery({
    queryKey: ["employer-reactivation-requests", reactivationStatus, reactivationPage],
    queryFn: async () => {
      const res = await apiClient.get("/admin/employer-verification/reactivation-requests", {
        params: {
          page: reactivationPage,
          limit: pageSize,
          ...(reactivationStatus !== "all" ? { status: reactivationStatus } : {}),
        },
      })
      const body = res.data?.data
      return {
        data: (body?.data || []) as ReactivationRequest[],
        meta: body?.meta || {},
      }
    },
    enabled: tab === "reactivation",
  })

  const reactivationRows = reactivationResponse?.data || []
  const totalReactivation = getTotalFromMeta(reactivationResponse?.meta)

  const { data: detail, isLoading: detailLoading } = useQuery<ApplicationDetail>({
    queryKey: ["employer-verification-application", selectedId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/employer-verification/applications/${selectedId}`)
      return res.data?.data
    },
    enabled: !!selectedId,
  })

  useEffect(() => {
    if (detail?.application) {
      setAdminNote(detail.application.admin_note || "")
      setRejectionReason(detail.application.rejection_reason || "")
    } else {
      setAdminNote("")
      setRejectionReason("")
    }
  }, [detail?.application?.id])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["employer-verification-applications"] })
    queryClient.invalidateQueries({ queryKey: ["employer-verification-application", selectedId] })
    queryClient.invalidateQueries({ queryKey: ["employer-reactivation-requests"] })
    queryClient.invalidateQueries({ queryKey: ["employers"] })
  }

  const underReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.put(`/admin/employer-verification/applications/${id}/under-review`)
      return res.data
    },
    onSuccess: (body) => {
      toast.success(body?.message || "Marked as under review.")
      invalidateAll()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to mark under review.")
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string
      action: "approve" | "reject"
    }) => {
      const payload: {
        action: "approve" | "reject"
        admin_note?: string
        rejection_reason?: string
      } = { action }
      if (adminNote.trim()) payload.admin_note = adminNote.trim()
      if (action === "reject") payload.rejection_reason = rejectionReason.trim()
      const res = await apiClient.put(
        `/admin/employer-verification/applications/${id}/review`,
        payload
      )
      return { body: res.data, action }
    },
    onSuccess: ({ body, action }) => {
      toast.success(
        body?.data?.message ||
          body?.message ||
          (action === "approve" ? "Application approved." : "Application rejected.")
      )
      invalidateAll()
      setSelectedId(null)
      const next = new URLSearchParams(searchParams)
      next.delete("applicationId")
      setSearchParams(next, { replace: true })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to review application.")
    },
  })

  const openDetail = (id: string) => {
    setSelectedId(id)
    const next = new URLSearchParams(searchParams)
    next.set("applicationId", id)
    setSearchParams(next, { replace: true })
  }

  const closeDetail = () => {
    setSelectedId(null)
    const next = new URLSearchParams(searchParams)
    next.delete("applicationId")
    setSearchParams(next, { replace: true })
  }

  const applicationColumns: ColumnDef<VerificationApplication>[] = [
    {
      header: "Company",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-secondary/10 flex items-center justify-center text-secondary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{item.company_legal_name || item.company_name || "—"}</div>
            <div className="text-sm text-muted-foreground">{item.email || "No email"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => (
        <div className="flex flex-col gap-1 items-start">
          <Badge className={appStatusClass(item.status)}>{item.status}</Badge>
          {item.verification_status && (
            <span className="text-[11px] text-muted-foreground">{item.verification_status}</span>
          )}
        </div>
      ),
    },
    {
      header: "Submitted",
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      header: "Account",
      cell: (item) => (
        <div className="text-xs space-y-0.5">
          {item.is_suspended && (
            <Badge className="bg-danger/10 text-danger border-transparent">Suspended</Badge>
          )}
          {item.is_verified && (
            <Badge className="bg-success/10 text-success border-transparent">Verified</Badge>
          )}
          {!item.is_suspended && !item.is_verified && (
            <span className="text-muted-foreground">Unverified</span>
          )}
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
          onClick={() => openDetail(item.id)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  const reactivationColumns: ColumnDef<ReactivationRequest>[] = [
    {
      header: "Company",
      cell: (item) => (
        <div>
          <div className="font-medium">{item.company_name || "—"}</div>
          <div className="text-sm text-muted-foreground">{item.email || "—"}</div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => <Badge className={appStatusClass(item.status)}>{item.status}</Badge>,
    },
    {
      header: "Application",
      cell: (item) => (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>{item.application_status || "—"}</div>
          {item.suspension_reason && <div>Reason: {item.suspension_reason}</div>}
        </div>
      ),
    },
    {
      header: "Created",
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right w-[80px]",
      cell: (item) =>
        item.application_id ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => {
              setTab("applications")
              openDetail(item.application_id!)
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">No app</span>
        ),
    },
  ]

  const app = detail?.application
  const reviewable = canReview(app?.status)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Employer Verification</h2>
        <p className="text-muted-foreground">
          Review company KYC submissions, mark under review, and approve or reject with reasons.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value)
          const next = new URLSearchParams(searchParams)
          if (value === "reactivation") next.set("tab", "reactivation")
          else next.delete("tab")
          setSearchParams(next, { replace: true })
        }}
      >
        <TabsList>
          <TabsTrigger value="applications" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Applications
          </TabsTrigger>
          <TabsTrigger value="reactivation" className="gap-2">
            <Building2 className="h-4 w-4" /> Reactivation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Status</Label>
            <Select
              value={appStatus}
              onValueChange={(value) => {
                setAppStatus(value)
                setAppPage(1)
                const next = new URLSearchParams(searchParams)
                next.set("status", value)
                setSearchParams(next, { replace: true })
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Verification queue</CardTitle>
              <CardDescription>
                Default filter is <code className="text-xs">submitted</code>. Open a row to inspect documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable
                columns={applicationColumns}
                data={applications}
                isLoading={listLoading}
                pagination={{
                  page: appPage,
                  pageSize,
                  total: totalApplications,
                  onPageChange: setAppPage,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reactivation" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Status</Label>
            <Select
              value={reactivationStatus}
              onValueChange={(value) => {
                setReactivationStatus(value)
                setReactivationPage(1)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REACTIVATION_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Reactivation requests</CardTitle>
              <CardDescription>
                Closed automatically when the linked application is approved or rejected.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable
                columns={reactivationColumns}
                data={reactivationRows}
                isLoading={reactivationLoading}
                pagination={{
                  page: reactivationPage,
                  pageSize,
                  total: totalReactivation,
                  onPageChange: setReactivationPage,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Verification application</SheetTitle>
            <SheetDescription>
              Review company documents, then approve or reject. Approve restores a suspended account.
            </SheetDescription>
          </SheetHeader>

          {detailLoading || !app ? (
            <div className="py-10 text-sm text-muted-foreground text-center">Loading detail...</div>
          ) : (
            <div className="space-y-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={appStatusClass(app.status)}>{app.status}</Badge>
                {app.verification_status && (
                  <Badge variant="outline">{app.verification_status}</Badge>
                )}
                {app.is_suspended && (
                  <Badge className="bg-danger/10 text-danger border-transparent">Suspended</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Legal name</div>
                  <div className="font-medium">{app.company_legal_name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Trade name</div>
                  <div className="font-medium">{app.company_name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">NPWP</div>
                  <div className="font-mono text-xs">{app.npwp_number || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">NIB</div>
                  <div className="font-mono text-xs">{app.nib_number || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div>{app.email || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Submitted</div>
                  <div>{app.submitted_at ? new Date(app.submitted_at).toLocaleString() : "—"}</div>
                </div>
              </div>

              {app.applicant_notes && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">Applicant notes</div>
                  <p className="whitespace-pre-wrap">{app.applicant_notes}</p>
                </div>
              )}

              {(detail.missing_required || []).length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-warning">
                  Missing required docs: {(detail.missing_required || []).join(", ")}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium">Documents</div>
                {(detail.documents || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {DOC_LABELS[doc.doc_type] || doc.doc_type}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {doc.file_name || doc.mime_type || "file"}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={resolveUploadUrl(doc.file_url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {app.recruiter_id && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/employers/${app.recruiter_id}`}>Open employer profile</Link>
                </Button>
              )}

              {reviewable ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="admin-note">Admin note (optional)</Label>
                    <Textarea
                      id="admin-note"
                      rows={2}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Internal note for audit trail..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rejection-reason">Rejection reason (required to reject)</Label>
                    <Textarea
                      id="rejection-reason"
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Shown when rejecting this application..."
                    />
                  </div>

                  <SheetFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                    {app.status === "submitted" && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        disabled={underReviewMutation.isPending || reviewMutation.isPending}
                        onClick={() => underReviewMutation.mutate(app.id)}
                      >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Mark under review
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-success hover:bg-success/10")}
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ id: app.id, action: "approve" })}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-danger hover:bg-danger/10")}
                      disabled={reviewMutation.isPending || !rejectionReason.trim()}
                      title={!rejectionReason.trim() ? "Enter a rejection reason first" : undefined}
                      onClick={() => reviewMutation.mutate({ id: app.id, action: "reject" })}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </SheetFooter>
                </>
              ) : (
                <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/30">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Already reviewed
                  </div>
                  {app.rejection_reason && (
                    <p className="text-muted-foreground">Reason: {app.rejection_reason}</p>
                  )}
                  {app.admin_note && (
                    <p className="text-muted-foreground">Admin note: {app.admin_note}</p>
                  )}
                  {app.reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed {new Date(app.reviewed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
