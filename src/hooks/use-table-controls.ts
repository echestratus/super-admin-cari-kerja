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
  clientSide = true,
}: UseTableControlsOptions<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSearchFields, setSelectedSearchFields] = useState<string[]>(
    () => searchFields.map((field) => field.key)
  )
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((filter) => [filter.key, "all"]))
  )
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
    setFilterValues(Object.fromEntries(filters.map((filter) => [filter.key, "all"])))
    setSortBy(defaultSortBy)
    setSortOrder(defaultSortOrder)
  }

  const hasActiveControls =
    searchQuery.trim().length > 0 ||
    (clientSide && selectedSearchFields.length !== searchFields.length) ||
    Object.values(filterValues).some((value) => value && value !== "all") ||
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
