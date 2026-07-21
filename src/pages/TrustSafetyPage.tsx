import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Eye, ShieldAlert, CheckCircle2, ThumbsUp, ThumbsDown, Ban } from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"
import { getTotalFromMeta } from "@/lib/pagination"
import { buildListQueryParams } from "@/lib/list-query"
import { useTableControls } from "@/hooks/use-table-controls"
import type { FilterDef, SortFieldDef } from "@/lib/table-controls"
import { cn } from "@/lib/utils"

type FraudStatus = "open" | "reviewing" | "resolved_clean" | "resolved_actioned"
type FraudEntityType = "job_post" | "user" | "chat_message" | "payment_order"
type ResolveAction = "mark_clean" | "approve_job" | "reject_job" | "suspend_user"

interface FraudFlag {
  code: string
  detail?: string
  weight?: number
}

interface FraudEvent {
  id: string
  entity_type: FraudEntityType | string
  entity_id: string
  source?: string
  risk_score: number
  status: FraudStatus | string
  flags?: FraudFlag[] | string[] | string | Record<string, unknown> | null
  summary?: string
  metadata?: Record<string, unknown> | string | null
  job_title?: string
  company_name?: string
  recruiter_id?: string
  recruiter_user_id?: string
  job_status_name?: string
  resolved_by?: string
  resolved_by_username?: string
  resolved_at?: string
  resolution_action?: string
  resolution_note?: string
  created_at?: string
  updated_at?: string
}

interface PaginatedResponse {
  data: FraudEvent[]
  meta?: Record<string, unknown>
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved_clean", label: "Resolved clean" },
  { value: "resolved_actioned", label: "Resolved actioned" },
]

const ENTITY_TYPE_OPTIONS = [
  { value: "job_post", label: "Job post" },
  { value: "user", label: "User" },
  { value: "chat_message", label: "Chat message" },
  { value: "payment_order", label: "Payment order" },
]

const SOURCE_OPTIONS = [
  { value: "chat_report", label: "Chat report" },
  { value: "job_heuristic", label: "Job heuristic" },
  { value: "manual", label: "Manual" },
]

const SORT_KEYS = ["risk_score", "created_at", "status", "updated_at"]
const FILTER_KEYS = ["status", "entity_type", "source"]

const fraudFilters: FilterDef[] = [
  {
    key: "status",
    label: "Status",
    options: STATUS_OPTIONS,
    getValue: (item: FraudEvent) => item.status,
  },
  {
    key: "entity_type",
    label: "Entity",
    options: ENTITY_TYPE_OPTIONS,
    getValue: (item: FraudEvent) => item.entity_type,
  },
  {
    key: "source",
    label: "Source",
    options: SOURCE_OPTIONS,
    getValue: (item: FraudEvent) => item.source,
  },
]

const fraudSortFields: SortFieldDef[] = [
  { key: "risk_score", getValue: (item: FraudEvent) => item.risk_score },
  { key: "created_at", getValue: (item: FraudEvent) => item.created_at },
  { key: "status", getValue: (item: FraudEvent) => item.status },
  { key: "updated_at", getValue: (item: FraudEvent) => item.updated_at },
]

function normalizeFlag(raw: unknown): FraudFlag | null {
  if (raw == null) return null
  if (typeof raw === "string") {
    const code = raw.trim()
    return code ? { code } : null
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const code = String(obj.code ?? obj.flag ?? obj.name ?? "").trim()
    if (!code) return null
    return {
      code,
      detail: obj.detail != null ? String(obj.detail) : undefined,
      weight: typeof obj.weight === "number" ? obj.weight : undefined,
    }
  }
  return { code: String(raw) }
}

function parseFlags(flags: FraudEvent["flags"]): FraudFlag[] {
  if (!flags) return []

  let rawList: unknown[] = []
  if (Array.isArray(flags)) {
    rawList = flags
  } else if (typeof flags === "string") {
    try {
      const parsed = JSON.parse(flags)
      rawList = Array.isArray(parsed) ? parsed : [flags]
    } catch {
      rawList = flags.split(",").map((part) => part.trim()).filter(Boolean)
    }
  } else if (typeof flags === "object") {
    rawList = Object.values(flags)
  }

  return rawList.map(normalizeFlag).filter((flag): flag is FraudFlag => !!flag)
}

function isResolvable(status: string) {
  return status === "open" || status === "reviewing"
}

function isResolved(status: string) {
  return status === "resolved_clean" || status === "resolved_actioned"
}

function statusBadgeClass(status: string) {
  if (status === "open") return "bg-warning/10 text-warning border-transparent"
  if (status === "reviewing") return "bg-primary/10 text-primary border-transparent"
  if (status === "resolved_clean") return "bg-success/10 text-success border-transparent"
  if (status === "resolved_actioned") return "bg-danger/10 text-danger border-transparent"
  return "bg-muted text-muted-foreground border-transparent"
}

function riskTone(score: number) {
  if (score >= 80) return "text-danger font-semibold"
  if (score >= 50) return "text-warning font-semibold"
  return "text-foreground font-medium"
}

function formatMetadata(metadata: FraudEvent["metadata"]) {
  if (!metadata) return null
  if (typeof metadata === "string") return metadata
  try {
    return JSON.stringify(metadata, null, 2)
  } catch {
    return String(metadata)
  }
}

function parseMetadataObject(metadata: FraudEvent["metadata"]): Record<string, unknown> {
  if (!metadata) return {}
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata)
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  return typeof metadata === "object" ? metadata : {}
}

function isChatReportEvent(event: FraudEvent | undefined) {
  if (!event) return false
  if (event.source === "chat_report") return true
  if (event.entity_type === "chat_message") return true
  const meta = parseMetadataObject(event.metadata)
  return !!(meta.chat_report_id || meta.conversation_id || meta.reported_user_id)
}

const RESOLVE_ACTIONS: {
  action: ResolveAction
  label: string
  icon: typeof CheckCircle2
  className: string
  /** Only show for job_post events */
  jobOnly?: boolean
  /** Hide for chat report / chat_message events */
  hideForChat?: boolean
}[] = [
  {
    action: "mark_clean",
    label: "Mark clean",
    icon: CheckCircle2,
    className: "text-success hover:bg-success/10",
  },
  {
    action: "approve_job",
    label: "Approve job",
    icon: ThumbsUp,
    className: "text-success hover:bg-success/10",
    jobOnly: true,
    hideForChat: true,
  },
  {
    action: "reject_job",
    label: "Reject job",
    icon: ThumbsDown,
    className: "text-danger hover:bg-danger/10",
    jobOnly: true,
    hideForChat: true,
  },
  {
    action: "suspend_user",
    label: "Suspend user",
    icon: Ban,
    className: "text-danger hover:bg-danger/10",
  },
]

export default function TrustSafetyPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 500)
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState("")

  useEffect(() => {
    const deepLinkId =
      searchParams.get("eventId") || searchParams.get("open_fraud_event_id")
    if (deepLinkId) {
      setResolveNote("")
      setSelectedId(deepLinkId)
    }
  }, [searchParams])

  const clearDeepLink = () => {
    if (searchParams.has("eventId") || searchParams.has("open_fraud_event_id")) {
      const next = new URLSearchParams(searchParams)
      next.delete("eventId")
      next.delete("open_fraud_event_id")
      setSearchParams(next, { replace: true })
    }
  }

  const tableControls = useTableControls({
    data: [],
    filters: fraudFilters,
    sortFields: fraudSortFields,
    defaultSortBy: "risk_score",
    defaultSortOrder: "desc",
    defaultFilterValues: { status: "open" },
    clientSide: false,
  })

  const listParams = buildListQueryParams({
    page,
    limit: pageSize,
    search: debouncedSearch,
    sortBy: tableControls.sortBy,
    sortOrder: tableControls.sortOrder,
    defaultSortBy: "risk_score",
    defaultSortOrder: "desc",
    filterValues: tableControls.filterValues,
    allowedFilters: FILTER_KEYS,
    allowedSortBy: SORT_KEYS,
  })

  const { data: response, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["fraud-events", listParams],
    queryFn: async () => {
      const res = await apiClient.get("/admin/fraud-events", { params: listParams })
      return res.data
    },
  })

  const events = response?.data || []
  const totalEvents = getTotalFromMeta(response?.meta)

  const {
    data: detail,
    isLoading: detailLoading,
  } = useQuery<FraudEvent>({
    queryKey: ["fraud-event", selectedId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/fraud-events/${selectedId}`)
      return res.data?.data || res.data
    },
    enabled: !!selectedId,
  })

  const resolveMutation = useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: ResolveAction; note?: string }) => {
      const res = await apiClient.put(`/admin/fraud-events/${id}/resolve`, {
        action,
        note: note?.trim() || undefined,
      })
      return res.data
    },
    onSuccess: (body) => {
      toast.success(body?.message || "Fraud event resolved successfully.")
      queryClient.invalidateQueries({ queryKey: ["fraud-events"] })
      queryClient.invalidateQueries({ queryKey: ["fraud-event", selectedId] })
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      setResolveNote("")
      setSelectedId(null)
      clearDeepLink()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resolve fraud event.")
    },
  })

  const openDetail = (item: FraudEvent) => {
    setResolveNote("")
    setSelectedId(item.id)
  }

  const columns: ColumnDef<FraudEvent>[] = [
    {
      header: "Risk",
      sortKey: "risk_score",
      sortable: true,
      className: "w-[80px]",
      cell: (item) => (
        <span className={cn("tabular-nums", riskTone(Number(item.risk_score) || 0))}>
          {item.risk_score ?? "—"}
        </span>
      ),
    },
    {
      header: "Flags",
      cell: (item) => {
        const flags = parseFlags(item.flags)
        if (!flags.length) return <span className="text-muted-foreground text-sm">—</span>
        return (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {flags.slice(0, 3).map((flag) => (
              <Badge
                key={flag.code}
                variant="outline"
                className="bg-background text-[10px] font-normal"
                title={flag.detail || flag.code}
              >
                {flag.code}
              </Badge>
            ))}
            {flags.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">
                +{flags.length - 3}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      header: "Summary",
      cell: (item) => (
        <span className="text-sm line-clamp-2 max-w-[280px] block" title={item.summary}>
          {item.summary || "—"}
        </span>
      ),
    },
    {
      header: "Job / Company",
      cell: (item) => (
        <div>
          <div className="font-medium text-sm">{item.job_title || item.summary || "—"}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <span>{item.company_name || item.entity_type}</span>
            {item.source && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal bg-background">
                {item.source}
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      sortKey: "status",
      sortable: true,
      cell: (item) => (
        <Badge className={statusBadgeClass(item.status)} variant="secondary">
          {item.status}
        </Badge>
      ),
    },
    {
      header: "Created",
      sortKey: "created_at",
      sortable: true,
      cell: (item) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}
        </span>
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
          onClick={() => openDetail(item)}
          title="Review"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  const activeDetail = detail
  const detailFlags = parseFlags(activeDetail?.flags)
  const metadataObj = parseMetadataObject(activeDetail?.metadata)
  const metadataText = formatMetadata(activeDetail?.metadata)
  const canResolve = activeDetail && isResolvable(activeDetail.status)
  const isJobPost = activeDetail?.entity_type === "job_post"
  const isChatReport = isChatReportEvent(activeDetail)
  const chatConversationId = metadataObj.conversation_id
    ? String(metadataObj.conversation_id)
    : null
  const chatReportedUserId = metadataObj.reported_user_id
    ? String(metadataObj.reported_user_id)
    : null
  const chatReason =
    metadataObj.reason != null
      ? String(metadataObj.reason)
      : detailFlags.find((f) => f.code === "USER_REPORT")?.detail || null
  const chatReporterUserId = metadataObj.reporter_user_id
    ? String(metadataObj.reporter_user_id)
    : null
  const chatMessageId = metadataObj.message_id ? String(metadataObj.message_id) : null
  const chatReportId = metadataObj.chat_report_id ? String(metadataObj.chat_report_id) : null

  const visibleResolveActions = RESOLVE_ACTIONS.filter((item) => {
    if (item.jobOnly && !isJobPost) return false
    if (item.hideForChat && isChatReport) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-warning" />
          Trust & Safety
        </h2>
        <p className="text-muted-foreground">
          Review flagged jobs and chat reports held by heuristics or user reports, then resolve in one queue.
          Filter by source <span className="font-medium">chat_report</span> or entity{" "}
          <span className="font-medium">chat_message</span> / <span className="font-medium">user</span>.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Fraud queue</CardTitle>
          <CardDescription>
            Default view shows open items sorted by risk score (highest first).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <DataTable
            columns={columns}
            data={events}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q)
              tableControls.setSearchQuery(q)
              setPage(1)
            }}
            searchPlaceholder="Search summary, source, or entity type..."
            hideSearchFields
            filters={fraudFilters}
            filterValues={tableControls.filterValues}
            onFilterChange={(key, value) => {
              tableControls.setFilterValue(key, value)
              setPage(1)
            }}
            sortBy={tableControls.sortBy}
            sortOrder={tableControls.sortOrder}
            onSortChange={(key) => {
              tableControls.toggleSort(key)
              setPage(1)
            }}
            onResetControls={() => {
              setSearchQuery("")
              setPage(1)
              tableControls.resetControls()
            }}
            hasActiveControls={tableControls.hasActiveControls || searchQuery.trim().length > 0}
            pagination={{
              page,
              pageSize,
              total: totalEvents,
              onPageChange: setPage,
            }}
          />
        </CardContent>
      </Card>

      <Sheet
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
            clearDeepLink()
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Fraud event review</SheetTitle>
            <SheetDescription>
              Inspect flags and take a resolution action without leaving this queue.
            </SheetDescription>
          </SheetHeader>

          {detailLoading || !activeDetail ? (
            <div className="py-10 text-sm text-muted-foreground text-center">Loading detail...</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusBadgeClass(activeDetail.status)} variant="secondary">
                  {activeDetail.status}
                </Badge>
                <Badge variant="outline" className="bg-background">
                  {activeDetail.entity_type}
                </Badge>
                <span className={cn("text-sm tabular-nums", riskTone(Number(activeDetail.risk_score) || 0))}>
                  Risk {activeDetail.risk_score}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Summary</div>
                <p className="text-sm whitespace-pre-wrap">{activeDetail.summary || "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Job title</div>
                  <div className="font-medium">{activeDetail.job_title || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Company</div>
                  <div className="font-medium">{activeDetail.company_name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Job status</div>
                  <div>{activeDetail.job_status_name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div>{activeDetail.source || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div>
                    {activeDetail.created_at
                      ? new Date(activeDetail.created_at).toLocaleString()
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Entity ID</div>
                  <div className="font-mono text-xs break-all">{activeDetail.entity_id}</div>
                </div>
              </div>

              {isChatReport && (
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 space-y-3">
                  <div className="text-sm font-medium text-warning">Chat report details</div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Reason</div>
                      <p className="whitespace-pre-wrap">{chatReason || "—"}</p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Conversation ID</div>
                      <div className="font-mono text-xs break-all">{chatConversationId || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Reported user ID</div>
                      <div className="font-mono text-xs break-all">{chatReportedUserId || "—"}</div>
                    </div>
                    {chatReporterUserId && (
                      <div>
                        <div className="text-xs text-muted-foreground">Reporter user ID</div>
                        <div className="font-mono text-xs break-all">{chatReporterUserId}</div>
                      </div>
                    )}
                    {chatMessageId && (
                      <div>
                        <div className="text-xs text-muted-foreground">Message ID</div>
                        <div className="font-mono text-xs break-all">{chatMessageId}</div>
                      </div>
                    )}
                    {chatReportId && (
                      <div>
                        <div className="text-xs text-muted-foreground">Chat report ID</div>
                        <div className="font-mono text-xs break-all">{chatReportId}</div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Resolve with Mark clean or Suspend user — backend syncs linked chat_reports.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Flags</div>
                <div className="flex flex-wrap gap-1.5">
                  {detailFlags.length ? (
                    detailFlags.map((flag) => (
                      <Badge
                        key={flag.code}
                        variant="outline"
                        className="bg-background"
                        title={flag.detail || flag.code}
                      >
                        {flag.code}
                        {flag.detail ? (
                          <span className="ml-1 font-normal text-muted-foreground">
                            · {flag.detail}
                          </span>
                        ) : null}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No flags</span>
                  )}
                </div>
              </div>

              {metadataText && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Metadata</div>
                  <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-40">
                    {metadataText}
                  </pre>
                </div>
              )}

              {isResolved(activeDetail.status) ? (
                <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/30">
                  <div className="font-medium">Already resolved</div>
                  <div className="text-muted-foreground">
                    Action: {activeDetail.resolution_action || "—"}
                    {activeDetail.resolved_by_username && ` · by @${activeDetail.resolved_by_username}`}
                  </div>
                  {activeDetail.resolution_note && (
                    <div className="text-muted-foreground">Note: {activeDetail.resolution_note}</div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="resolve-note">Resolution note (optional)</Label>
                    <Textarea
                      id="resolve-note"
                      rows={3}
                      placeholder="Context for audit trail..."
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                    />
                  </div>

                  <SheetFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                    {visibleResolveActions.map((item) => (
                      <Button
                        key={item.action}
                        variant="outline"
                        className={cn("w-full justify-start", item.className)}
                        disabled={resolveMutation.isPending || !canResolve}
                        onClick={() =>
                          selectedId &&
                          resolveMutation.mutate({
                            id: selectedId,
                            action: item.action,
                            note: resolveNote,
                          })
                        }
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    ))}
                  </SheetFooter>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
