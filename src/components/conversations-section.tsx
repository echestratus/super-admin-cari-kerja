import { useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { MessageSquare, Eye, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTableControls } from "@/hooks/use-table-controls"
import type { SearchFieldDef } from "@/lib/table-controls"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface Conversation {
  id: string
  worker_id: string
  recruiter_id: string
  job_id?: string
  worker_name?: string
  company_name?: string
  job_title?: string
  last_message?: string
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

export function ConversationsSection({ baseUrl, queryKey, perspective }: ConversationsSectionProps) {
  const queryClient = useQueryClient()
  const [viewingConversation, setViewingConversation] = useState<Conversation | null>(null)
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null)

  const { data: conversations = [], isLoading, isError, error } = useQuery<Conversation[]>({
    queryKey,
    queryFn: async () => {
      const res = await apiClient.get(baseUrl)
      const body = res.data?.data
      return Array.isArray(body) ? body : body?.data || []
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

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/admin/conversations/${viewingConversation!.id}/messages/${id}`)
    },
    onSuccess: (_data, deletedId) => {
      const conversationId = viewingConversation?.id
      const messagesKey = ["admin-conversation-messages", conversationId] as const
      const previousMessages =
        queryClient.getQueryData<Message[]>(messagesKey) || []
      const remaining = previousMessages.filter((msg) => msg.id !== deletedId)

      queryClient.setQueryData<Message[]>(messagesKey, remaining)

      // Keep list "Last Message" in sync. Do not refetch conversations yet — backend
      // currently leaves conversations.last_message stale after delete.
      const latest = [...remaining].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      })[0]

      queryClient.setQueryData<Conversation[]>(queryKey, (prev) => {
        if (!prev || !conversationId) return prev
        return prev.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                last_message: latest?.message || "",
                updated_at: latest?.created_at || item.updated_at,
              }
            : item
        )
      })

      setDeletingMessage(null)
      toast.success("Message deleted successfully.")
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete message.")
    },
  })

  const resolveSenderLabel = (msg: Message) => {
    // Prefer decrypted names from the conversation row (worker_name / company_name).
    // Message API aliases encrypted columns as sender_name, which may still be ciphertext.
    if (msg.role_id === 1) {
      return viewingConversation?.worker_name || msg.sender_name || "Worker"
    }
    return viewingConversation?.company_name || msg.sender_name || "Recruiter"
  }

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
            <div className="font-medium text-foreground">
              {perspective === "worker"
                ? item.company_name || item.recruiter_id.slice(0, 8)
                : item.worker_name || item.worker_id.slice(0, 8)}
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
      className: "text-right w-[80px]",
      cell: (item) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => setViewingConversation(item)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Conversations</CardTitle>
        <CardDescription>Chat history for moderation purposes. Messages can be viewed and removed.</CardDescription>
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
      <Dialog open={!!viewingConversation} onOpenChange={(open) => !open && setViewingConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conversation Messages</DialogTitle>
            <DialogDescription>
              {viewingConversation?.worker_name || "Worker"} ↔ {viewingConversation?.company_name || "Company"}
              {viewingConversation?.job_title && ` — ${viewingConversation.job_title}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {messagesLoading ? (
              <div className="text-sm text-muted-foreground text-center py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No messages in this conversation.</div>
            ) : (
              messages.map((msg) => {
                const isWorker = msg.role_id === 1
                return (
                  <div key={msg.id} className={cn("flex", isWorker ? "justify-start" : "justify-end")}>
                    <div
                      className={cn(
                        "group relative max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        isWorker ? "bg-muted" : "bg-primary/10"
                      )}
                    >
                      <div className="text-xs font-medium text-muted-foreground mb-0.5">
                        {resolveSenderLabel(msg)}
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

      {/* Delete Message Confirmation */}
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
    </Card>
  )
}
