import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@/components/ui/data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Archive,
  Edit2,
  Newspaper,
  Plus,
  Send,
  Trash2,
  ImagePlus,
} from "lucide-react"
import { toast } from "sonner"
import { useDebounce } from "@/hooks/use-debounce"
import { getTotalFromMeta } from "@/lib/pagination"
import { resolveUploadUrl } from "@/lib/uploads"
import { cn } from "@/lib/utils"

type NewsStatus = "draft" | "published" | "archived" | string

interface NewsCategory {
  id: string
  name: string
  slug: string
  created_at?: string
  updated_at?: string
}

interface NewsItem {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  body?: string
  cover_url?: string | null
  status: NewsStatus
  is_featured?: boolean
  meta_title?: string | null
  meta_description?: string | null
  category_id?: string | null
  category_name?: string | null
  category_slug?: string | null
  author_username?: string | null
  published_at?: string | null
  created_at?: string
  updated_at?: string
}

interface NewsFormState {
  title: string
  slug: string
  excerpt: string
  body: string
  category_id: string
  is_featured: boolean
  meta_title: string
  meta_description: string
}

const emptyNewsForm: NewsFormState = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  category_id: "none",
  is_featured: false,
  meta_title: "",
  meta_description: "",
}

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

function statusClass(status: string) {
  if (status === "published") return "bg-success/10 text-success border-transparent"
  if (status === "archived") return "bg-muted text-muted-foreground border-transparent"
  return "bg-warning/10 text-warning border-transparent"
}

function toNewsPayload(form: NewsFormState) {
  return {
    title: form.title.trim(),
    body: form.body,
    slug: form.slug.trim() || undefined,
    excerpt: form.excerpt.trim() || null,
    category_id: form.category_id === "none" ? null : form.category_id,
    is_featured: form.is_featured,
    meta_title: form.meta_title.trim() || null,
    meta_description: form.meta_description.trim() || null,
  }
}

export default function NewsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("articles")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 400)
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [formOpen, setFormOpen] = useState(false)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [formData, setFormData] = useState<NewsFormState>({ ...emptyNewsForm })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [deletingNews, setDeletingNews] = useState<NewsItem | null>(null)

  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [categorySlug, setCategorySlug] = useState("")
  const [deletingCategory, setDeletingCategory] = useState<NewsCategory | null>(null)

  const listParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    }),
    [page, pageSize, debouncedSearch, statusFilter]
  )

  const { data: newsResponse, isLoading: newsLoading } = useQuery({
    queryKey: ["admin-news", listParams],
    queryFn: async () => {
      const res = await apiClient.get("/admin/news", { params: listParams })
      return {
        data: (res.data?.data || []) as NewsItem[],
        meta: res.data?.meta || {},
      }
    },
  })

  const newsRows = newsResponse?.data || []
  const totalNews = getTotalFromMeta(newsResponse?.meta)

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<NewsCategory[]>({
    queryKey: ["news-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/news-categories")
      const body = res.data?.data
      return Array.isArray(body) ? body : body?.data || []
    },
  })

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const invalidateNews = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-news"] })
    queryClient.invalidateQueries({ queryKey: ["news-categories"] })
  }

  const openCreate = () => {
    setEditingNews(null)
    setFormData({ ...emptyNewsForm })
    setCoverFile(null)
    setCoverPreview(null)
    setFormOpen(true)
  }

  const openEdit = async (item: NewsItem) => {
    setEditingNews(item)
    setCoverFile(null)
    setCoverPreview(item.cover_url ? resolveUploadUrl(item.cover_url) : null)
    setFormOpen(true)
    try {
      const res = await apiClient.get(`/admin/news/${item.id}`)
      const detail = (res.data?.data || res.data) as NewsItem
      setEditingNews(detail)
      setFormData({
        title: detail.title || "",
        slug: detail.slug || "",
        excerpt: detail.excerpt || "",
        body: detail.body || "",
        category_id: detail.category_id || "none",
        is_featured: Boolean(detail.is_featured),
        meta_title: detail.meta_title || "",
        meta_description: detail.meta_description || "",
      })
      setCoverPreview(detail.cover_url ? resolveUploadUrl(detail.cover_url) : null)
    } catch {
      setFormData({
        title: item.title || "",
        slug: item.slug || "",
        excerpt: item.excerpt || "",
        body: "",
        category_id: item.category_id || "none",
        is_featured: Boolean(item.is_featured),
        meta_title: item.meta_title || "",
        meta_description: item.meta_description || "",
      })
      toast.error("Failed to load full article body.")
    }
  }

  const uploadCover = async (newsId: string, file: File) => {
    const fd = new FormData()
    fd.append("cover", file)
    const res = await apiClient.post(`/admin/news/${newsId}/cover`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return (res.data?.data || res.data) as NewsItem
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toNewsPayload(formData)
      if (!payload.title || !payload.body?.trim()) {
        throw new Error("Title and body are required.")
      }
      let news: NewsItem
      if (editingNews?.id) {
        const res = await apiClient.put(`/admin/news/${editingNews.id}`, payload)
        news = res.data?.data || res.data
      } else {
        const res = await apiClient.post("/admin/news", payload)
        news = res.data?.data || res.data
      }
      if (coverFile && news?.id) {
        news = await uploadCover(news.id, coverFile)
      }
      return news
    },
    onSuccess: (news) => {
      invalidateNews()
      setEditingNews(news)
      setCoverFile(null)
      setCoverPreview(news.cover_url ? resolveUploadUrl(news.cover_url) : null)
      setFormData((prev) => ({
        ...prev,
        slug: news.slug || prev.slug,
      }))
      toast.success(editingNews ? "Article saved." : "Draft created.")
    },
    onError: (error: any) => {
      toast.error(error?.message || error.response?.data?.message || "Failed to save article.")
    },
  })

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      // Persist latest form before publish
      const payload = toNewsPayload(formData)
      await apiClient.put(`/admin/news/${id}`, payload)
      if (coverFile) await uploadCover(id, coverFile)
      const res = await apiClient.put(`/admin/news/${id}/publish`)
      return res.data?.data || res.data
    },
    onSuccess: (news: NewsItem) => {
      invalidateNews()
      setEditingNews(news)
      setCoverFile(null)
      toast.success("Article published.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to publish article.")
    },
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.put(`/admin/news/${id}/archive`)
      return res.data?.data || res.data
    },
    onSuccess: (news: NewsItem) => {
      invalidateNews()
      setEditingNews(news)
      toast.success("Article archived.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to archive article.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/admin/news/${id}`),
    onSuccess: () => {
      invalidateNews()
      setDeletingNews(null)
      if (editingNews?.id === deletingNews?.id) setFormOpen(false)
      toast.success("Article deleted.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete article.")
    },
  })

  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: categoryName.trim(),
        slug: categorySlug.trim() || undefined,
      }
      if (!payload.name) throw new Error("Category name is required.")
      if (editingCategory?.id) {
        const res = await apiClient.put(`/admin/news-categories/${editingCategory.id}`, payload)
        return res.data?.data
      }
      const res = await apiClient.post("/admin/news-categories", payload)
      return res.data?.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-categories"] })
      setCategoryFormOpen(false)
      setEditingCategory(null)
      setCategoryName("")
      setCategorySlug("")
      toast.success(editingCategory ? "Category updated." : "Category created.")
    },
    onError: (error: any) => {
      toast.error(error?.message || error.response?.data?.message || "Failed to save category.")
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/admin/news-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-categories"] })
      setDeletingCategory(null)
      toast.success("Category deleted.")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete category.")
    },
  })

  const newsColumns: ColumnDef<NewsItem>[] = [
    {
      header: "Article",
      cell: (item) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-16 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {item.cover_url ? (
              <img
                src={resolveUploadUrl(item.cover_url)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Newspaper className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{item.title}</div>
            <div className="text-xs text-muted-foreground truncate">/{item.slug}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item) => (
        <div className="flex flex-col gap-1 items-start">
          <Badge className={statusClass(item.status)}>{item.status}</Badge>
          {item.is_featured && (
            <Badge variant="outline" className="text-[10px] h-5">
              Featured
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "Category",
      cell: (item) => (
        <span className="text-sm text-muted-foreground">{item.category_name || "—"}</span>
      ),
    },
    {
      header: "Updated",
      cell: (item) => (
        <span className="text-xs text-muted-foreground">
          {item.updated_at ? new Date(item.updated_at).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => openEdit(item)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => setDeletingNews(item)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const categoryColumns: ColumnDef<NewsCategory>[] = [
    {
      header: "Name",
      cell: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      header: "Slug",
      cell: (item) => <span className="text-sm text-muted-foreground">/{item.slug}</span>,
    },
    {
      header: "Actions",
      className: "text-right",
      cell: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingCategory(item)
              setCategoryName(item.name)
              setCategorySlug(item.slug)
              setCategoryFormOpen(true)
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={() => setDeletingCategory(item)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const busy =
    saveMutation.isPending || publishMutation.isPending || archiveMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">News</h2>
        <p className="text-muted-foreground">
          Manage portal articles, covers, SEO metadata, and categories.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <Input
                placeholder="Search title, excerpt, or slug..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="max-w-sm"
              />
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New article
            </Button>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Articles</CardTitle>
              <CardDescription>
                New posts start as drafts. Publish when ready; archive to hide from the public site.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable
                columns={newsColumns}
                data={newsRows}
                isLoading={newsLoading}
                pagination={{
                  page,
                  pageSize,
                  total: totalNews,
                  onPageChange: setPage,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingCategory(null)
                setCategoryName("")
                setCategorySlug("")
                setCategoryFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New category
            </Button>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Categories</CardTitle>
              <CardDescription>Used to group public news articles.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable
                columns={categoryColumns}
                data={categories}
                isLoading={categoriesLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Article form */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false)
            setCoverFile(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNews ? "Edit article" : "New article"}</DialogTitle>
            <DialogDescription>
              Title and HTML body are required. Slug is optional (auto-generated from title).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {editingNews && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusClass(editingNews.status)}>{editingNews.status}</Badge>
                {editingNews.published_at && (
                  <span className="text-xs text-muted-foreground">
                    Published {new Date(editingNews.published_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="news-title">Title</Label>
              <Input
                id="news-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="news-slug">Slug (optional)</Label>
              <Input
                id="news-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="auto-from-title"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer h-10">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={formData.is_featured}
                    onChange={(e) =>
                      setFormData({ ...formData, is_featured: e.target.checked })
                    }
                  />
                  Featured article
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="news-excerpt">Excerpt</Label>
              <Textarea
                id="news-excerpt"
                rows={2}
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="news-body">Body (HTML)</Label>
              <Textarea
                id="news-body"
                rows={10}
                className="font-mono text-xs"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="<p>Article content...</p>"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="meta-title">SEO meta title</Label>
                <Input
                  id="meta-title"
                  maxLength={255}
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="meta-description">SEO meta description</Label>
                <Input
                  id="meta-description"
                  maxLength={500}
                  value={formData.meta_description}
                  onChange={(e) =>
                    setFormData({ ...formData, meta_description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="news-cover">Cover image</Label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="h-28 w-44 rounded-md border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                  {coverPreview ? (
                    <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <Input
                    id="news-cover"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setCoverFile(file)
                      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview)
                      setCoverPreview(file ? URL.createObjectURL(file) : editingNews?.cover_url
                        ? resolveUploadUrl(editingNews.cover_url)
                        : null)
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPEG/PNG/WebP, max 5MB. Uploaded via multipart field <code>cover</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {editingNews?.id && editingNews.status !== "published" && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-success"
                  disabled={busy || !formData.title.trim() || !formData.body.trim()}
                  onClick={() => publishMutation.mutate(editingNews.id)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
              {editingNews?.id && editingNews.status === "published" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => archiveMutation.mutate(editingNews.id)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              )}
              {editingNews?.id && editingNews.status === "archived" && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-success"
                  disabled={busy || !formData.title.trim() || !formData.body.trim()}
                  onClick={() => publishMutation.mutate(editingNews.id)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Republish
                </Button>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Close
              </Button>
              <Button
                disabled={busy || !formData.title.trim() || !formData.body.trim()}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingNews
                    ? "Save changes"
                    : "Create draft"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category form */}
      <Dialog open={categoryFormOpen} onOpenChange={setCategoryFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Slug is optional and derived from the name when empty.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-slug">Slug (optional)</Label>
              <Input
                id="cat-slug"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryFormOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saveCategoryMutation.isPending || !categoryName.trim()}
              onClick={() => saveCategoryMutation.mutate()}
            >
              {saveCategoryMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingNews} onOpenChange={(open) => !open && setDeletingNews(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              Soft-delete <strong>{deletingNews?.title}</strong>. It will leave the public site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-danger text-danger-foreground hover:bg-danger/90")}
              onClick={() => deletingNews && deleteMutation.mutate(deletingNews.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              Soft-delete <strong>{deletingCategory?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-danger text-danger-foreground hover:bg-danger/90")}
              onClick={() => deletingCategory && deleteCategoryMutation.mutate(deletingCategory.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
