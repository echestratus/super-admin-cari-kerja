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
import { RichTextEditor, isRichTextEmpty } from "@/components/rich-text-editor"

type NewsStatus = "draft" | "published" | "archived" | string
type LocaleCode = "id" | "en"

interface LocaleContent {
  title: string
  slug: string
  excerpt: string
  body: string
  meta_title: string
  meta_description: string
}

interface NewsTranslations {
  id?: Partial<LocaleContent> | null
  en?: Partial<LocaleContent> | null
}

interface NewsCategory {
  id: string
  name: string
  slug: string
  translations?: {
    id?: { name?: string; slug?: string }
    en?: { name?: string; slug?: string }
  }
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
  translations?: NewsTranslations
}

interface NewsFormState {
  category_id: string
  is_featured: boolean
  translations: Record<LocaleCode, LocaleContent>
}

interface CategoryFormState {
  translations: Record<LocaleCode, { name: string; slug: string }>
}

const emptyLocaleContent = (): LocaleContent => ({
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  meta_title: "",
  meta_description: "",
})

const emptyNewsForm = (): NewsFormState => ({
  category_id: "none",
  is_featured: false,
  translations: {
    id: emptyLocaleContent(),
    en: emptyLocaleContent(),
  },
})

const emptyCategoryForm = (): CategoryFormState => ({
  translations: {
    id: { name: "", slug: "" },
    en: { name: "", slug: "" },
  },
})

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

const LIST_LOCALE_OPTIONS: { value: LocaleCode; label: string }[] = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
]

function statusClass(status: string) {
  if (status === "published") return "bg-success/10 text-success border-transparent"
  if (status === "archived") return "bg-muted text-muted-foreground border-transparent"
  return "bg-warning/10 text-warning border-transparent"
}

function fromTranslation(
  tr?: Partial<LocaleContent> | null,
  fallback?: Partial<NewsItem> | null
): LocaleContent {
  return {
    title: tr?.title ?? fallback?.title ?? "",
    slug: tr?.slug ?? fallback?.slug ?? "",
    excerpt: tr?.excerpt ?? fallback?.excerpt ?? "",
    body: tr?.body ?? fallback?.body ?? "",
    meta_title: tr?.meta_title ?? fallback?.meta_title ?? "",
    meta_description: tr?.meta_description ?? fallback?.meta_description ?? "",
  }
}

function isLocaleFilled(fields: LocaleContent) {
  return Boolean(
    fields.title.trim() ||
      fields.slug.trim() ||
      fields.excerpt.trim() ||
      !isRichTextEmpty(fields.body) ||
      fields.meta_title.trim() ||
      fields.meta_description.trim()
  )
}

function isLocaleComplete(fields: LocaleContent) {
  return Boolean(fields.title.trim() && !isRichTextEmpty(fields.body))
}

function localePayload(fields: LocaleContent) {
  return {
    title: fields.title.trim(),
    body: fields.body,
    slug: fields.slug.trim() || undefined,
    excerpt: fields.excerpt.trim() || null,
    meta_title: fields.meta_title.trim() || null,
    meta_description: fields.meta_description.trim() || null,
  }
}

function toNewsPayload(form: NewsFormState) {
  const translations: Record<string, ReturnType<typeof localePayload>> = {
    id: localePayload(form.translations.id),
  }
  if (isLocaleFilled(form.translations.en)) {
    translations.en = localePayload(form.translations.en)
  }
  return {
    category_id: form.category_id === "none" ? null : form.category_id,
    is_featured: form.is_featured,
    translations,
  }
}

function detailToForm(detail: NewsItem): NewsFormState {
  const tr = detail.translations || {}
  return {
    category_id: detail.category_id || "none",
    is_featured: Boolean(detail.is_featured),
    translations: {
      id: fromTranslation(tr.id, detail),
      en: fromTranslation(tr.en),
    },
  }
}

function validateNewsForm(form: NewsFormState): string | null {
  if (!isLocaleComplete(form.translations.id)) {
    return "Bahasa Indonesia: title and body are required."
  }
  if (isLocaleFilled(form.translations.en) && !isLocaleComplete(form.translations.en)) {
    return "English: title and body are required when English content is provided."
  }
  return null
}

function toCategoryPayload(form: CategoryFormState) {
  const translations: Record<string, { name: string; slug?: string }> = {
    id: {
      name: form.translations.id.name.trim(),
      slug: form.translations.id.slug.trim() || undefined,
    },
  }
  const enName = form.translations.en.name.trim()
  if (enName) {
    translations.en = {
      name: enName,
      slug: form.translations.en.slug.trim() || undefined,
    }
  }
  return { translations }
}

export default function NewsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("articles")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 400)
  const [statusFilter, setStatusFilter] = useState("all")
  const [listLocale, setListLocale] = useState<LocaleCode>("id")
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [formOpen, setFormOpen] = useState(false)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [formData, setFormData] = useState<NewsFormState>(emptyNewsForm)
  const [contentLocale, setContentLocale] = useState<LocaleCode>("id")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [deletingNews, setDeletingNews] = useState<NewsItem | null>(null)

  const [categoryFormOpen, setCategoryFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [categoryLocale, setCategoryLocale] = useState<LocaleCode>("id")
  const [deletingCategory, setDeletingCategory] = useState<NewsCategory | null>(null)

  const listParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      locale: listLocale,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    }),
    [page, pageSize, listLocale, debouncedSearch, statusFilter]
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

  const { data: categoriesId = [], isLoading: categoriesLoading } = useQuery<NewsCategory[]>({
    queryKey: ["news-categories", "id"],
    queryFn: async () => {
      const res = await apiClient.get("/news-categories", { params: { locale: "id" } })
      const body = res.data?.data
      return Array.isArray(body) ? body : body?.data || []
    },
  })

  const { data: categoriesEn = [] } = useQuery<NewsCategory[]>({
    queryKey: ["news-categories", "en"],
    queryFn: async () => {
      const res = await apiClient.get("/news-categories", { params: { locale: "en" } })
      const body = res.data?.data
      return Array.isArray(body) ? body : body?.data || []
    },
  })

  const categories = useMemo(() => {
    const enById = new Map(categoriesEn.map((c) => [c.id, c]))
    return categoriesId.map((cat) => ({
      ...cat,
      translations: {
        id: { name: cat.name, slug: cat.slug },
        en: enById.has(cat.id)
          ? { name: enById.get(cat.id)!.name, slug: enById.get(cat.id)!.slug }
          : undefined,
      },
    }))
  }, [categoriesId, categoriesEn])

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const invalidateNews = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-news"] })
    queryClient.invalidateQueries({ queryKey: ["news-categories"] })
  }

  const updateLocaleFields = (locale: LocaleCode, patch: Partial<LocaleContent>) => {
    setFormData((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: { ...prev.translations[locale], ...patch },
      },
    }))
  }

  const openCreate = () => {
    setEditingNews(null)
    setFormData(emptyNewsForm())
    setContentLocale("id")
    setCoverFile(null)
    setCoverPreview(null)
    setFormOpen(true)
  }

  const openEdit = async (item: NewsItem) => {
    setEditingNews(item)
    setCoverFile(null)
    setCoverPreview(item.cover_url ? resolveUploadUrl(item.cover_url) : null)
    setContentLocale("id")
    setFormData(detailToForm(item))
    setFormOpen(true)
    try {
      const res = await apiClient.get(`/admin/news/${item.id}`)
      const detail = (res.data?.data || res.data) as NewsItem
      setEditingNews(detail)
      setFormData(detailToForm(detail))
      setCoverPreview(detail.cover_url ? resolveUploadUrl(detail.cover_url) : null)
    } catch {
      toast.error("Failed to load full article translations.")
    }
  }

  const openCreateCategory = () => {
    setEditingCategory(null)
    setCategoryForm(emptyCategoryForm())
    setCategoryLocale("id")
    setCategoryFormOpen(true)
  }

  const openEditCategory = (item: NewsCategory) => {
    setEditingCategory(item)
    setCategoryLocale("id")
    setCategoryForm({
      translations: {
        id: {
          name: item.translations?.id?.name || item.name || "",
          slug: item.translations?.id?.slug || item.slug || "",
        },
        en: {
          name: item.translations?.en?.name || "",
          slug: item.translations?.en?.slug || "",
        },
      },
    })
    setCategoryFormOpen(true)
  }

  const uploadCover = async (newsId: string, file: File) => {
    const fd = new FormData()
    fd.append("cover", file)
    const res = await apiClient.post(`/admin/news/${newsId}/cover`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return (res.data?.data || res.data) as NewsItem
  }

  const syncFormFromNews = (news: NewsItem) => {
    setEditingNews(news)
    if (news.translations) {
      setFormData(detailToForm(news))
    } else {
      setFormData((prev) => ({
        ...prev,
        category_id: news.category_id || prev.category_id,
        is_featured: news.is_featured ?? prev.is_featured,
        translations: {
          ...prev.translations,
          id: {
            ...prev.translations.id,
            slug: news.slug || prev.translations.id.slug,
            title: news.title || prev.translations.id.title,
          },
        },
      }))
    }
    setCoverPreview(news.cover_url ? resolveUploadUrl(news.cover_url) : null)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const error = validateNewsForm(formData)
      if (error) throw new Error(error)
      const payload = toNewsPayload(formData)
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
      if (news?.id) {
        try {
          const detailRes = await apiClient.get(`/admin/news/${news.id}`)
          news = detailRes.data?.data || detailRes.data || news
        } catch {
          /* keep save response */
        }
      }
      return news
    },
    onSuccess: (news) => {
      invalidateNews()
      setCoverFile(null)
      syncFormFromNews(news)
      toast.success(editingNews ? "Article saved." : "Draft created.")
    },
    onError: (error: any) => {
      toast.error(error?.message || error.response?.data?.message || "Failed to save article.")
    },
  })

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const error = validateNewsForm(formData)
      if (error) throw new Error(error)
      const payload = toNewsPayload(formData)
      await apiClient.put(`/admin/news/${id}`, payload)
      if (coverFile) await uploadCover(id, coverFile)
      const res = await apiClient.put(`/admin/news/${id}/publish`)
      return res.data?.data || res.data
    },
    onSuccess: async (news: NewsItem) => {
      invalidateNews()
      setCoverFile(null)
      try {
        const detailRes = await apiClient.get(`/admin/news/${news.id}`)
        syncFormFromNews(detailRes.data?.data || detailRes.data || news)
      } catch {
        syncFormFromNews(news)
      }
      toast.success("Article published.")
    },
    onError: (error: any) => {
      toast.error(error?.message || error.response?.data?.message || "Failed to publish article.")
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
      const idName = categoryForm.translations.id.name.trim()
      if (!idName) throw new Error("Bahasa Indonesia: category name is required.")
      const enName = categoryForm.translations.en.name.trim()
      const enSlug = categoryForm.translations.en.slug.trim()
      if (enSlug && !enName) {
        throw new Error("English: category name is required when English slug is provided.")
      }
      const payload = toCategoryPayload(categoryForm)
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
      setCategoryForm(emptyCategoryForm())
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
            <div className="font-medium truncate">{item.title || "—"}</div>
            <div className="text-xs text-muted-foreground truncate">/{item.slug || "—"}</div>
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
      cell: (item) => (
        <div className="min-w-0">
          <div className="font-medium">{item.name}</div>
          {item.translations?.en?.name && (
            <div className="text-xs text-muted-foreground truncate">
              EN: {item.translations.en.name}
            </div>
          )}
        </div>
      ),
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
          <Button variant="ghost" size="sm" onClick={() => openEditCategory(item)}>
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

  const idValid = isLocaleComplete(formData.translations.id)
  const enOk =
    !isLocaleFilled(formData.translations.en) || isLocaleComplete(formData.translations.en)
  const formValid = idValid && enOk

  const busy =
    saveMutation.isPending || publishMutation.isPending || archiveMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">News</h2>
        <p className="text-muted-foreground">
          Manage portal articles in Bahasa Indonesia and English. Cover, status, and category are
          shared across locales.
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
              <Select
                value={listLocale}
                onValueChange={(value) => {
                  setListLocale(value as LocaleCode)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="List language" />
                </SelectTrigger>
                <SelectContent>
                  {LIST_LOCALE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      List: {opt.label}
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
                Titles follow the selected list language. New posts start as drafts; publish when
                Indonesian content is complete.
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
            <Button onClick={openCreateCategory}>
              <Plus className="h-4 w-4 mr-2" />
              New category
            </Button>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Category names can be localized; Indonesian name is required.
              </CardDescription>
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
              Indonesian title and body are required. English is optional. Cover, category, and
              featured flag are shared.
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

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category (shared)</Label>
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
                  Featured article (shared)
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="news-cover">Cover image (shared)</Label>
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
                      setCoverPreview(
                        file
                          ? URL.createObjectURL(file)
                          : editingNews?.cover_url
                            ? resolveUploadUrl(editingNews.cover_url)
                            : null
                      )
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPEG/PNG/WebP, max 5MB. One cover for all languages.
                  </p>
                </div>
              </div>
            </div>

            <Tabs
              value={contentLocale}
              onValueChange={(value) => setContentLocale(value as LocaleCode)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="id">
                  Bahasa Indonesia
                  <span className="ml-1 text-[10px] text-muted-foreground">required</span>
                </TabsTrigger>
                <TabsTrigger value="en">
                  English
                  <span className="ml-1 text-[10px] text-muted-foreground">optional</span>
                </TabsTrigger>
              </TabsList>

              {(["id", "en"] as LocaleCode[]).map((locale) => (
                <TabsContent key={locale} value={locale} className="mt-4 space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`news-title-${locale}`}>
                      Title {locale === "id" ? "*" : ""}
                    </Label>
                    <Input
                      id={`news-title-${locale}`}
                      value={formData.translations[locale].title}
                      onChange={(e) => updateLocaleFields(locale, { title: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`news-slug-${locale}`}>Slug (optional)</Label>
                    <Input
                      id={`news-slug-${locale}`}
                      value={formData.translations[locale].slug}
                      onChange={(e) => updateLocaleFields(locale, { slug: e.target.value })}
                      placeholder="auto-from-title"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`news-excerpt-${locale}`}>Excerpt</Label>
                    <Textarea
                      id={`news-excerpt-${locale}`}
                      rows={2}
                      value={formData.translations[locale].excerpt}
                      onChange={(e) => updateLocaleFields(locale, { excerpt: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Body {locale === "id" ? "*" : ""}</Label>
                    <RichTextEditor
                      key={`${editingNews?.id || "new"}-${locale}`}
                      value={formData.translations[locale].body}
                      onChange={(html) => updateLocaleFields(locale, { body: html })}
                      placeholder={
                        locale === "id"
                          ? "Tulis konten artikel…"
                          : "Write the English article content…"
                      }
                      disabled={busy}
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`meta-title-${locale}`}>SEO meta title</Label>
                      <Input
                        id={`meta-title-${locale}`}
                        maxLength={255}
                        value={formData.translations[locale].meta_title}
                        onChange={(e) =>
                          updateLocaleFields(locale, { meta_title: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`meta-description-${locale}`}>SEO meta description</Label>
                      <Input
                        id={`meta-description-${locale}`}
                        maxLength={500}
                        value={formData.translations[locale].meta_description}
                        onChange={(e) =>
                          updateLocaleFields(locale, { meta_description: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {!enOk && contentLocale === "en" && (
              <p className="text-sm text-danger">
                English title and body are both required once any English field is filled.
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {editingNews?.id && editingNews.status !== "published" && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-success"
                  disabled={busy || !formValid}
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
                  disabled={busy || !formValid}
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
              <Button disabled={busy || !formValid} onClick={() => saveMutation.mutate()}>
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

      <Dialog open={categoryFormOpen} onOpenChange={setCategoryFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              Indonesian name is required. English name is optional. Slug per locale is optional.
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={categoryLocale}
            onValueChange={(value) => setCategoryLocale(value as LocaleCode)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="id">Bahasa Indonesia</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
            </TabsList>
            {(["id", "en"] as LocaleCode[]).map((locale) => (
              <TabsContent key={locale} value={locale} className="mt-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor={`cat-name-${locale}`}>
                    Name {locale === "id" ? "*" : ""}
                  </Label>
                  <Input
                    id={`cat-name-${locale}`}
                    value={categoryForm.translations[locale].name}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        translations: {
                          ...prev.translations,
                          [locale]: {
                            ...prev.translations[locale],
                            name: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`cat-slug-${locale}`}>Slug (optional)</Label>
                  <Input
                    id={`cat-slug-${locale}`}
                    value={categoryForm.translations[locale].slug}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        translations: {
                          ...prev.translations,
                          [locale]: {
                            ...prev.translations[locale],
                            slug: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryFormOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                saveCategoryMutation.isPending || !categoryForm.translations.id.name.trim()
              }
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
              onClick={() =>
                deletingCategory && deleteCategoryMutation.mutate(deletingCategory.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
