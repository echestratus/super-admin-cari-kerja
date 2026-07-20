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

export function getTotalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 0
  return Math.ceil(total / pageSize)
}

export type PaginationItem = number | "ellipsis"

/** Build a compact page list with ellipsis, e.g. [1, "ellipsis", 4, 5, 6, "ellipsis", 20]. */
export function getPaginationPages(
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): PaginationItem[] {
  if (totalPages <= 0) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1)
  const rightSibling = Math.min(currentPage + siblingCount, totalPages)
  const showLeftEllipsis = leftSibling > 2
  const showRightEllipsis = rightSibling < totalPages - 1
  const edgeCount = siblingCount * 2 + 3

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = Array.from({ length: edgeCount }, (_, index) => index + 1)
    return [...leftRange, "ellipsis", totalPages]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = Array.from(
      { length: edgeCount },
      (_, index) => totalPages - edgeCount + index + 1
    )
    return [1, "ellipsis", ...rightRange]
  }

  if (showLeftEllipsis && showRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSibling - leftSibling + 1 },
      (_, index) => leftSibling + index
    )
    return [1, "ellipsis", ...middleRange, "ellipsis", totalPages]
  }

  return Array.from({ length: totalPages }, (_, index) => index + 1)
}
