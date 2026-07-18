export type SortOrder = "asc" | "desc"

export interface SearchFieldDef {
  key: string
  label: string
  getValue: (item: any) => unknown
}

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDef {
  key: string
  label: string
  options: FilterOption[]
  getValue: (item: any) => unknown
}

export interface SortFieldDef {
  key: string
  getValue: (item: any) => unknown
}

export function normalizeSearchText(value: unknown): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

/** Advanced search: every non-empty token must match at least one selected field (AND across tokens, OR across fields). */
export function matchesAdvancedSearch(
  item: any,
  query: string,
  fields: SearchFieldDef[],
  selectedFieldKeys?: string[]
): boolean {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  if (tokens.length === 0) return true

  const activeFields =
    selectedFieldKeys && selectedFieldKeys.length > 0
      ? fields.filter((f) => selectedFieldKeys.includes(f.key))
      : fields

  if (activeFields.length === 0) return true

  const haystacks = activeFields.map((field) =>
    normalizeSearchText(field.getValue(item)).toLowerCase()
  )

  return tokens.every((token) => haystacks.some((text) => text.includes(token)))
}

export function matchesFilters(
  item: any,
  filters: FilterDef[],
  values: Record<string, string>
): boolean {
  return filters.every((filter) => {
    const selected = values[filter.key]
    if (!selected || selected === "all") return true
    return normalizeSearchText(filter.getValue(item)) === selected
  })
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === "number" && typeof b === "number") return a - b
  if (a instanceof Date || b instanceof Date) {
    const aTime = new Date(a as any).getTime()
    const bTime = new Date(b as any).getTime()
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime
  }

  const aNum = Number(a)
  const bNum = Number(b)
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && String(a).trim() !== "" && String(b).trim() !== "") {
    if (String(a).trim() === String(aNum) && String(b).trim() === String(bNum)) {
      return aNum - bNum
    }
  }

  return normalizeSearchText(a).localeCompare(normalizeSearchText(b), undefined, {
    numeric: true,
    sensitivity: "base",
  })
}

export function sortItems<T>(
  items: T[],
  sortFields: SortFieldDef[],
  sortBy: string | null | undefined,
  sortOrder: SortOrder = "asc"
): T[] {
  if (!sortBy) return items
  const field = sortFields.find((f) => f.key === sortBy)
  if (!field) return items

  const direction = sortOrder === "desc" ? -1 : 1
  return [...items].sort((left, right) => {
    const result = compareValues(field.getValue(left), field.getValue(right))
    return result * direction
  })
}

export function applyClientTableControls<T>(
  items: T[],
  options: {
    searchQuery?: string
    searchFields?: SearchFieldDef[]
    selectedSearchFields?: string[]
    filters?: FilterDef[]
    filterValues?: Record<string, string>
    sortFields?: SortFieldDef[]
    sortBy?: string | null
    sortOrder?: SortOrder
  }
): T[] {
  let result = items

  if (options.searchFields?.length) {
    result = result.filter((item) =>
      matchesAdvancedSearch(
        item,
        options.searchQuery || "",
        options.searchFields!,
        options.selectedSearchFields
      )
    )
  }

  if (options.filters?.length) {
    result = result.filter((item) =>
      matchesFilters(item, options.filters!, options.filterValues || {})
    )
  }

  if (options.sortFields?.length) {
    result = sortItems(result, options.sortFields, options.sortBy, options.sortOrder)
  }

  return result
}
