import type { SortOrder } from "@/lib/table-controls"

interface BuildListQueryParamsOptions {
  page: number
  limit: number
  search?: string
  sortBy?: string | null
  sortOrder?: SortOrder
  /** Default sort_by when none selected. Omit to let backend default apply. */
  defaultSortBy?: string | null
  defaultSortOrder?: SortOrder
  filterValues?: Record<string, string>
  /**
   * Only these filter keys are sent. Values of "all"/empty are skipped.
   * Boolean filters: values "true"/"false" are sent as booleans.
   * Number filters: digits-only values are sent as numbers.
   */
  allowedFilters?: string[]
  /** Map UI sort keys → backend `sort_by` whitelist values. */
  sortKeyMap?: Record<string, string>
  /** Whitelist of allowed sort_by values after mapping. */
  allowedSortBy?: string[]
}

/**
 * Build query params for admin list endpoints.
 * Only includes known keys to avoid backend 400 on unknown params.
 */
export function buildListQueryParams(options: BuildListQueryParamsOptions): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: options.page,
    limit: options.limit,
  }

  const search = options.search?.trim()
  if (search) params.search = search

  const rawSortBy = options.sortBy || options.defaultSortBy || null
  const mappedSortBy = rawSortBy
    ? options.sortKeyMap?.[rawSortBy] ?? rawSortBy
    : null

  if (mappedSortBy && (!options.allowedSortBy || options.allowedSortBy.includes(mappedSortBy))) {
    params.sort_by = mappedSortBy
    const order = options.sortBy
      ? options.sortOrder || "desc"
      : options.defaultSortOrder || "desc"
    params.sort_order = order
  }

  const allowed = options.allowedFilters || Object.keys(options.filterValues || {})
  for (const key of allowed) {
    const value = options.filterValues?.[key]
    if (value == null || value === "" || value === "all") continue

    if (value === "true" || value === "false") {
      params[key] = value === "true"
    } else if (/^-?\d+(\.\d+)?$/.test(value) && !["recruiter_id"].includes(key)) {
      // Keep UUIDs as strings; numeric IDs as numbers.
      params[key] = Number(value)
    } else {
      params[key] = value
    }
  }

  return params
}
