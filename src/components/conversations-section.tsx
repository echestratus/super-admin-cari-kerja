import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Archive, ArchiveRestore, Eye, MessageSquare, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTableControls } from "@/hooks/use-table-controls"
import type { SearchFieldDef } from "@/lib/table-controls"
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

type ConversationStatus = "ACTIVE" | "ARCHIVED" | string

interface Conversation {
  id: string
  worker_id: string
  recruiter_id: string
  job_id?: string
  worker_name?: string
  company_name?: string
  job_title?: string
  last_message?: string
  status?: ConversationStatus
  created_at?: string
  updated_at?: string
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_name?: string
  role_id: number
  message: string
  type: string
  created_at?: string
}

interface ConversationsSectionProps {
  /** e.g. /admin/workers/123/conversations */
  baseUrl: string
  queryKey: (string | undefined)[]
  /** The perspective of this page: highlights the other party. */
  perspective: "worker" | "employer"
}

function normalizeStatus(status?: string | null): ConversationStatus {
  const value = String(status || "ACTIVE").toUpperCase()
  return value === "ARCHIVED" ? "ARCHIVED" : value === "ACTIVE" ? "ACTIVE" : value
}

function statusBadgeClass(status: ConversationStatus) {
  if (status === "ARCHIVED") {
    return "bg-muted text-muted-foreground border-transparent"
  }
  return "bg-success/10 text-success border-transparent"
}

export function ConversationsSection({ baseUrl, queryKey, perspective }: ConversationsSectionProps) {
  const queryClient = useQueryClient()
  const [viewingConversation, setViewingConversation] = useState<Conversation | null>(null)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set())
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null)
  const [confirmPurge, setConfirmPurge] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [statusTarget, setStatusTarget] = useState<{
    conversation: Conversation
    nextStatus: "ACTIVE" | "ARCHIVED"
  } | null>(null)
  const [statusReason, setStatusReason] = useState("")

  const { data: conversations = [], isLoading, isError, error } = useQuery<Conversation[]>({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get(baseUrl)
      const body = res.data?.data
      const rows = Array.isArray(body) ? body : body?.data || []
      return rows.map((row: Conversation) => ({
        ...row,
        status: normalizeStatus(row.status),
      }))
    },
  })

  const searchFields = useMemo<SearchFieldDef[]>(
    () => [
      {
        key: "counterpart",
        label: perspective === "worker" ? "Company" : "Worker",
        getValue: (item) =>
          perspective === "worker"
            ? item.company_name || item.recruiter_id
            : item.worker_name || item.worker_id,
      },
      { key: "job_title", label: "Job Title", getValue: (item) => item.job_title },
      { key: "last_message", label: "Last Message", getValue: (item) => item.last_message },
      { key: "status", label: "Status", getValue: (item) => item.status },
      { key: "updated_at", label: "Updated", getValue: (item) => item.updated_at },
    ],
    [perspective]
  )

  const tableControls = useTableControls({
    data: conversations,
    searchFields,
    sortFields: searchFields.map((field) => ({ key: field.key, getValue: field.getValue })),
    defaultSortBy: "updated_at",
    defaultSortOrder: "desc",
  })

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["admin-conversation-messages", viewingConversation?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/conversations/${viewingConversation!.id}/messages`)
      const body = res.data?.data
      return Array.isArray(body) ? body : body?.data || []
    },
    enabled: !!viewingConversation,
  })

  const openConversation = (item: Conversation) => {
    setSelectedMessageIds(new Set())
    setViewingConversation({ ...item, status: normalizeStatus(item.status) })
  }

  const syncConversationStatus = (id: string, status: ConversationStatus) => {
    const next = normalizeStatus(status)
    setViewingConversation((prev) => (prev?.id === id ? { ...prev, status: next } : prev))
    queryClient.setQueryData<Conversation[]>(queryKey, (prev) =>
      (prev || []).map((row) => (row.id === id ? { ...row, status: next } : row))
    )
  }

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string
      status: "ACTIVE" | "ARCHIVED"
      reason?: string
    }) => {
      const payload: { status: string; reason?: string } = { status }
      const trimmed = reason?.trim()
      if (trimmed) payload.reason = trimmed
      const res = await apiClient.put(`/admin/conversations/${id}/status`, payload)
      return res.data?.data || { id, status }
    },
    onSuccess: (data, variables) => {
      const nextStatus = normalizeStatus(data?.status || variables.status)
      syncConversationStatus(variables.id, nextStatus)
      queryClient.invalidateQueries({ queryKey })
      setStatusTarget(null)
      setStatusReason("")
      toast.success(
        nextStatus === "ARCHIVED"
          ? "Conversation archived. Portal users cannot send messages (CHAT_ARCHIVED)."
          : "Conversation restored to ACTIVE."
      )
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update conversation status.")
    },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({
      conversationId,
      messageIds,
    }: {
      conversationId: string
      messageIds?: string[]
    }) => {
      const config =
        messageIds && messageIds.length > 0
          ? { data: { message_ids: messageIds } }
          : undefined
      return apiClient.delete(`/admin/conversations/${conversationId}/messages`, config)
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin-conversation-messages", variables.conversationId],
      })
      queryClient.invalidateQueries({ queryKey })
      setSelectedMessageIds(new Set())
      setDeletingMessage(null)
      setConfirmBulkDelete(false)
      setConfirmPurge(false)
      toast.success(
        variables.messageIds && variables.messageIds.length > 0
          ? `Deleted ${variables.messageIds.length} message(s).`
          : "All messages purged from this conversation."
      )
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete messages.")
    },
  })

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/conversations/${viewingConversation!.id}/messages/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-conversation-messages", viewingConversation?.id],
      })
      queryClient.invalidateQueries({ queryKey })
      setDeletingMessage(null)
      setSelectedMessageIds((prev) => {
        const next = new Set(prev)
        if (deletingMessage) next.delete(deletingMessage.id)
        return next
      })
      toast.success("Message deleted successfully.")
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete message.")
    },
  })

  const toggleMessageSelection = (id: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedMessageIds.size === messages.length) {
      setSelectedMessageIds(new Set())
      return
    }
    setSelectedMessageIds(new Set(messages.map((m) => m.id)))
  }

  const viewingStatus = normalizeStatus(viewingConversation?.status)
  const isArchived = viewingStatus === "ARCHIVED"

  const columns: ColumnDef<Conversation>[] = [
    {
      header: perspective === "worker" ? "Company" : "Worker",
      sortKey: "counterpart",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-secondary/10 flex items-center justify-center text-secondary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-foreground flex items-center gap-2 flex-wrap">
              {perspective === "worker"
                ? item.company_name || item.recruiter_id.slice(0, 8)
                : item.worker_name || item.worker_id.slice(0, 8)}
              <Badge className={cn("text-[10px] h-5", statusBadgeClass(normalizeStatus(item.status)))}>
                {normalizeStatus(item.status)}
              </Badge>
            </div>
            {item.job_title && (
              <div className="text-sm text-muted-foreground">Re: {item.job_title}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Last Message",
      sortKey: "last_message",
      sortable: true,
      cell: (item) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[300px] block">
          {item.last_message || "—"}
        </span>
      ),
    },
    {
      header: "Status",
      sortKey: "status",
      sortable: true,
      cell: (item) => {
        const status = normalizeStatus(item.status)
        return (
          <div className="flex flex-col gap-0.5">
            <Badge className={statusBadgeClass(status)}>{status}</Badge>
            {status === "ARCHIVED" && (
              <span className="text-[10px] text-muted-foreground">Portal send blocked</span>
            )}
          </div>
        )
      },
    },
    {
      header: "Updated",
      sortKey: "updated_at",
      sortable: true,
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.updated_at ? new Date(item.updated_at).toLocaleString() : "N/A"}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right w-[120px]",
      cell: (item) => {
        const status = normalizeStatus(item.status)
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => openConversation(item)}
              title="View messages"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={
                status === "ARCHIVED"
                  ? "text-success hover:text-success hover:bg-success/10"
                  : "text-warning hover:text-warning hover:bg-warning/10"
              }
              onClick={() => {
                setStatusReason("")
                setStatusTarget({
                  conversation: item,
                  nextStatus: status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
                })
              }}
              title={status === "ARCHIVED" ? "Restore" : "Archive"}
            >
              {status === "ARCHIVED" ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Conversations</CardTitle>
        <CardDescription>
          Chat moderation: archive blocks portal sends (CHAT_ARCHIVED). Delete selected or purge all messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {isError ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {(error as any)?.response?.status === 404
              ? "This section requires a backend admin endpoint that is not available yet."
              : "Failed to load conversations."}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={tableControls.processedData}
            isLoading={isLoading}
            searchQuery={tableControls.searchQuery}
            onSearchChange={tableControls.setSearchQuery}
            searchPlaceholder="Search company/worker, job title, or last message..."
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
        )}
      </CardContent>

      {/* Messages Dialog */}
      <Dialog
        open={!!viewingConversation}
        onOpenChange={(open) => {
          if (!open) {
            setViewingConversation(null)
            setSelectedMessageIds(new Set())
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Conversation Messages
              {viewingConversation && (
                <Badge className={statusBadgeClass(viewingStatus)}>{viewingStatus}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewingConversation?.worker_name || "Worker"} ↔ {viewingConversation?.company_name || "Company"}
              {viewingConversation?.job_title && ` — ${viewingConversation.job_title}`}
            </DialogDescription>
          </DialogHeader>

          {isArchived && (
            <div className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
              Archived — portal users cannot send messages (CHAT_ARCHIVED). Restore to reopen chat.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (!viewingConversation) return
                setStatusReason("")
                setStatusTarget({
                  conversation: viewingConversation,
                  nextStatus: isArchived ? "ACTIVE" : "ARCHIVED",
                })
              }}
            >
              {isArchived ? (
                <>
                  <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="h-3.5 w-3.5 mr-1.5" />
                  Archive
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-danger border-danger/30"
              disabled={selectedMessageIds.size === 0 || bulkDeleteMutation.isPending}
              onClick={() => setConfirmBulkDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete selected ({selectedMessageIds.size})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-danger border-danger/30"
              disabled={messages.length === 0 || bulkDeleteMutation.isPending}
              onClick={() => setConfirmPurge(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Purge all messages
            </Button>
            {messages.length > 0 && (
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={selectedMessageIds.size === messages.length && messages.length > 0}
                  onChange={toggleSelectAll}
                />
                Select all
              </label>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {messagesLoading ? (
              <div className="text-sm text-muted-foreground text-center py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No messages in this conversation.</div>
            ) : (
              messages.map((msg) => {
                const isWorker = msg.role_id === 1
                const selected = selectedMessageIds.has(msg.id)
                return (
                  <div key={msg.id} className={cn("flex items-start gap-2", isWorker ? "justify-start" : "justify-end")}>
                    {isWorker && (
                      <input
                        type="checkbox"
                        className="mt-3 rounded border-border"
                        checked={selected}
                        onChange={() => toggleMessageSelection(msg.id)}
                      />
                    )}
                    <div
                      className={cn(
                        "group relative max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        isWorker ? "bg-muted" : "bg-primary/10",
                        selected && "ring-1 ring-danger/40"
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-0.5">
                        {msg.sender_name || (isWorker ? "Worker" : "Recruiter")}
                      </div>
                      <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                          onClick={() => setDeletingMessage(msg)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {!isWorker && (
                      <input
                        type="checkbox"
                        className="mt-3 rounded border-border"
                        checked={selected}
                        onChange={() => toggleMessageSelection(msg.id)}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
          <div className="border-t pt-3">
            <Badge variant="outline" className="bg-background text-xs">
              Read-only moderation view — admins cannot send messages.
            </Badge>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive / Restore dialog */}
      <Dialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null)
            setStatusReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusTarget?.nextStatus === "ARCHIVED" ? "Archive conversation" : "Restore conversation"}
            </DialogTitle>
            <DialogDescription>
              {statusTarget?.nextStatus === "ARCHIVED"
                ? "Archived chats block portal users from sending messages (CHAT_ARCHIVED)."
                : "Restoring sets status back to ACTIVE so users can chat again."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="conversation-status-reason">Reason (optional)</Label>
            <Textarea
              id="conversation-status-reason"
              rows={3}
              placeholder="Audit note for this moderation action..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusTarget(null)
                setStatusReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={statusMutation.isPending || !statusTarget}
              onClick={() =>
                statusTarget &&
                statusMutation.mutate({
                  id: statusTarget.conversation.id,
                  status: statusTarget.nextStatus,
                  reason: statusReason,
                })
              }
            >
              {statusMutation.isPending
                ? "Saving..."
                : statusTarget?.nextStatus === "ARCHIVED"
                  ? "Archive"
                  : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single message */}
      <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the message from the conversation. Use this only for content
              moderation purposes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMessage && deleteMessageMutation.mutate(deletingMessage.id)}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {deleteMessageMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete selected */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected messages?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {selectedMessageIds.size} selected message(s) from this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={() =>
                viewingConversation &&
                bulkDeleteMutation.mutate({
                  conversationId: viewingConversation.id,
                  messageIds: Array.from(selectedMessageIds),
                })
              }
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge all */}
      <AlertDialog open={confirmPurge} onOpenChange={setConfirmPurge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge all messages?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes every message in the conversation. The conversation record remains; use Archive
              if you only need to block further sends.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-danger-foreground hover:bg-danger/90"
              onClick={() =>
                viewingConversation &&
                bulkDeleteMutation.mutate({
                  conversationId: viewingConversation.id,
                })
              }
            >
              {bulkDeleteMutation.isPending ? "Purging..." : "Purge all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
