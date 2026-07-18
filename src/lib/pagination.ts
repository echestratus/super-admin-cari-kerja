/** Normalize admin list pagination meta across camelCase and snake_case shapes. */
export function getTotalFromMeta(meta?: Record<string, any> | null): number {
  if (!meta) return 0
  return Number(meta.total_data ?? meta.totalData ?? 0)
}

export function getPageFromMeta(meta?: Record<string, any> | null, fallback = 1): number {
  if (!meta) return fallback
  return Number(meta.page ?? fallback)
}

export function getPerPageFromMeta(meta?: Record<string, any> | null, fallback = 10): number {
  if (!meta) return fallback
  return Number(meta.per_page ?? meta.limit ?? fallback)
}
