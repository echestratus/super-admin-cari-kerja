import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/axios"

export interface LookupOption {
  value: string
  label: string
}

export function getLookupDisplayName(item: any): string {
  if (!item) return ""
  return (
    item.name ||
    item.country_name ||
    item.skill_name ||
    item.gender_name ||
    item.type_name ||
    item.level_name ||
    item.status_name ||
    item.religion_name ||
    item.display_name ||
    item.code ||
    "N/A"
  )
}

/** Fetches an admin lookup table and caches it for reuse across pages. */
export function useLookup(table: string) {
  return useQuery<any[]>({
    queryKey: ["lookups", table],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/lookups/${table}`)
      return res.data?.data || []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function toLookupOptions(records: any[] | undefined): LookupOption[] {
  return (records || []).map((r) => ({
    value: String(r.id),
    label: getLookupDisplayName(r),
  }))
}
