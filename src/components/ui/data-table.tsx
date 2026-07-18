import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { FilterDef, SearchFieldDef, SortOrder } from "@/lib/table-controls"

export interface ColumnDef<T> {
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  className?: string
  /** Enables clickable header sorting when `onSortChange` is provided. */
  sortable?: boolean
  /** Key passed to sort handlers. Defaults to accessorKey. */
  sortKey?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  isLoading?: boolean
  searchPlaceholder?: string
  searchQuery?: string
  onSearchChange?: (query: string) => void
  searchFields?: SearchFieldDef[]
  selectedSearchFields?: string[]
  onToggleSearchField?: (key: string) => void
  onSelectAllSearchFields?: () => void
  filters?: FilterDef[]
  filterValues?: Record<string, string>
  onFilterChange?: (key: string, value: string) => void
  sortBy?: string | null
  sortOrder?: SortOrder
  onSortChange?: (key: string) => void
  onResetControls?: () => void
  hasActiveControls?: boolean
  toolbarExtra?: React.ReactNode
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  searchPlaceholder = "Search across selected fields...",
  searchQuery,
  onSearchChange,
  searchFields,
  selectedSearchFields,
  onToggleSearchField,
  onSelectAllSearchFields,
  filters,
  filterValues,
  onFilterChange,
  sortBy,
  sortOrder = "asc",
  onSortChange,
  onResetControls,
  hasActiveControls,
  toolbarExtra,
  pagination,
}: DataTableProps<T>) {
  const showToolbar =
    !!onSearchChange ||
    !!(filters && filters.length > 0) ||
    !!toolbarExtra ||
    !!onResetControls

  return (
    <div className="space-y-4">
      {showToolbar && (
        <div className="space-y-3 rounded-lg border bg-card/40 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            {onSearchChange && (
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-background border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {toolbarExtra}
              {onResetControls && hasActiveControls && (
                <Button variant="outline" size="sm" onClick={onResetControls} className="gap-1">
                  <X className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {searchFields && searchFields.length > 0 && onToggleSearchField && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Advanced search fields
                {onSelectAllSearchFields && (
                  <button
                    type="button"
                    onClick={onSelectAllSearchFields}
                    className="text-primary hover:underline"
                  >
                    Select all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {searchFields.map((field) => {
                  const active = selectedSearchFields?.includes(field.key)
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => onToggleSearchField(field.key)}
                      className="focus:outline-none"
                    >
                      <Badge
                        variant={active ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          active
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-background hover:bg-muted"
                        )}
                      >
                        {field.label}
                      </Badge>
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Tokens are matched with AND logic across the query, while selected fields are matched with OR.
              </p>
            </div>
          )}

          {filters && filters.length > 0 && onFilterChange && (
            <div className="flex flex-wrap gap-3">
              {filters.map((filter) => (
                <div key={filter.key} className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {filter.label}
                  </label>
                  <select
                    value={filterValues?.[filter.key] || "all"}
                    onChange={(e) => onFilterChange(filter.key, e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All</option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col, i) => {
                const sortKey = col.sortKey || (col.accessorKey ? String(col.accessorKey) : undefined)
                const canSort = !!(col.sortable && sortKey && onSortChange)
                const isActive = canSort && sortBy === sortKey

                return (
                  <TableHead key={i} className={col.className}>
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(sortKey!)}
                        className="inline-flex items-center gap-1 font-medium hover:text-foreground transition-colors"
                      >
                        {col.header}
                        {isActive ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex}>
                      <div className="h-5 w-full bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Inbox className="h-10 w-10 mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No data found</p>
                    <p className="text-xs">Try adjusting your filters or search query.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex} className={col.className}>
                      {col.cell
                        ? col.cell(item)
                        : col.accessorKey
                        ? (item[col.accessorKey] as React.ReactNode)
                        : null}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{" "}
            of <span className="font-medium">{pagination.total}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
