import { apiClient } from "@/lib/axios"

export interface JobTitle {
  id: string
  name: string
  slug?: string
  category_id?: number | null
  category_name?: string | null
  is_active?: boolean
}

export interface JobTitleRef {
  id: string
  name: string
  slug?: string
  category_id?: number | null
}

export async function searchJobTitles(
  search: string,
  options?: { limit?: number; categoryId?: number | string | null; locale?: string }
): Promise<JobTitle[]> {
  const limit = options?.limit ?? 20
  const categoryId = options?.categoryId
  const res = await apiClient.get("/job-titles", {
    params: {
      search: search.trim() || undefined,
      page: 1,
      limit,
      locale: options?.locale || "id",
      ...(categoryId !== undefined && categoryId !== null && categoryId !== ""
        ? { category_id: Number(categoryId) }
        : {}),
    },
  })
  const body = res.data?.data
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.data)) return body.data
  return []
}

/** Prefer canonical taxonomy name when present. */
export function displayJobTitle(item: {
  job_title?: string | null
  job_title_ref?: JobTitleRef | null
}): string {
  return item.job_title_ref?.name || item.job_title || "—"
}
