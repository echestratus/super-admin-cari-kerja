import { apiClient } from "@/lib/axios"

export interface JobTitle {
  id: string
  name: string
  slug?: string
  is_active?: boolean
}

export interface JobTitleRef {
  id: string
  name: string
  slug?: string
}

export async function searchJobTitles(search: string, limit = 20): Promise<JobTitle[]> {
  const res = await apiClient.get("/job-titles", {
    params: {
      search: search.trim() || undefined,
      page: 1,
      limit,
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
