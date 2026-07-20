import { useMemo, useState } from "react"
import {
  applyClientTableControls,
  type FilterDef,
  type SearchFieldDef,
  type SortFieldDef,
  type SortOrder,
} from "@/lib/table-controls"

interface UseTableControlsOptions<T> {
  data: T[]
  searchFields?: SearchFieldDef[]
  filters?: FilterDef[]
  sortFields?: SortFieldDef[]
  defaultSortBy?: string | null
  defaultSortOrder?: SortOrder
  /** Optional initial/reset values per filter key (defaults to "all"). */
  defaultFilterValues?: Record<string, string>
  /** When true, search/filter/sort are applied client-side to `data`. */
  clientSide?: boolean
}

export function useTableControls<T>({
  data,
  searchFields = [],
  filters = [],
  sortFields = [],
  defaultSortBy = null,
  defaultSortOrder = "asc",
  defaultFilterValues = {},
  clientSide = true,
}: UseTableControlsOptions<T>) {
  const buildDefaultFilters = () =>
    Object.fromEntries(
      filters.map((filter) => [filter.key, defaultFilterValues[filter.key] ?? "all"])
    )

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSearchFields, setSelectedSearchFields] = useState<string[]>(
    () => searchFields.map((field) => field.key)
  )
  const [filterValues, setFilterValues] = useState<Record<string, string>>(buildDefaultFilters)
  const [sortBy, setSortBy] = useState<string | null>(defaultSortBy)
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder)

  const processedData = useMemo(() => {
    if (!clientSide) return data
    return applyClientTableControls(data, {
      searchQuery,
      searchFields,
      selectedSearchFields,
      filters,
      filterValues,
      sortFields,
      sortBy,
      sortOrder,
    })
  }, [
    clientSide,
    data,
    searchQuery,
    searchFields,
    selectedSearchFields,
    filters,
    filterValues,
    sortFields,
    sortBy,
    sortOrder,
  ])

  const setFilterValue = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
  }

  const toggleSearchField = (key: string) => {
    setSelectedSearchFields((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== key)
      }
      return [...prev, key]
    })
  }

  const selectAllSearchFields = () => {
    setSelectedSearchFields(searchFields.map((field) => field.key))
  }

  const toggleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortBy(key)
    setSortOrder("asc")
  }

  const resetControls = () => {
    setSearchQuery("")
    setSelectedSearchFields(searchFields.map((field) => field.key))
    setFilterValues(buildDefaultFilters())
    setSortBy(defaultSortBy)
    setSortOrder(defaultSortOrder)
  }

  const defaults = buildDefaultFilters()
  const hasActiveControls =
    searchQuery.trim().length > 0 ||
    (clientSide && selectedSearchFields.length !== searchFields.length) ||
    Object.keys(defaults).some((key) => (filterValues[key] || "all") !== defaults[key]) ||
    sortBy !== defaultSortBy ||
    sortOrder !== defaultSortOrder

  return {
    searchQuery,
    setSearchQuery,
    selectedSearchFields,
    toggleSearchField,
    selectAllSearchFields,
    filterValues,
    setFilterValue,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    toggleSort,
    resetControls,
    hasActiveControls,
    processedData,
    searchFields,
    filters,
    sortFields,
    clientSide,
  }
}

