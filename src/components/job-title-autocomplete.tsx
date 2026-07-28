import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"
import { searchJobTitles, type JobTitle } from "@/lib/job-titles"
import { Loader2 } from "lucide-react"

interface JobTitleAutocompleteProps {
  value: string
  jobTitleId?: string | null
  categoryId?: number | string | null
  onChange: (next: { job_title: string; job_title_id: string | null }) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function JobTitleAutocomplete({
  value,
  jobTitleId,
  categoryId,
  onChange,
  placeholder = "Search or type a job title…",
  disabled = false,
  id,
  className,
}: JobTitleAutocompleteProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || "")
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const debouncedSearch = useDebounce(inputValue, 300)
  const hasCategory = categoryId !== undefined && categoryId !== null && categoryId !== ""
  const isDisabled = disabled || !hasCategory

  useEffect(() => {
    setInputValue(value || "")
  }, [value])

  const { data: options = [], isFetching } = useQuery({
    queryKey: ["job-titles", debouncedSearch, categoryId],
    queryFn: () =>
      searchJobTitles(debouncedSearch, {
        limit: 20,
        categoryId,
        locale: "id",
      }),
    enabled: open && hasCategory,
    staleTime: 30_000,
  })

  useLayoutEffect(() => {
    if (!open || !inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 80,
    })
  }, [open, inputValue, options.length])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        const menu = document.getElementById(listId)
        if (menu?.contains(event.target as Node)) return
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [listId])

  const selectOption = (option: JobTitle) => {
    setInputValue(option.name)
    onChange({ job_title: option.name, job_title_id: option.id })
    setOpen(false)
  }

  const handleInputChange = (next: string) => {
    setInputValue(next)
    onChange({ job_title: next, job_title_id: null })
    setOpen(true)
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={isDisabled}
        placeholder={
          hasCategory ? placeholder : "Select a category first…"
        }
        value={inputValue}
        autoComplete="off"
        onFocus={() => hasCategory && setOpen(true)}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false)
        }}
      />
      {hasCategory && jobTitleId && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Linked to taxonomy id <code className="text-[10px]">{jobTitleId.slice(0, 8)}…</code>
        </p>
      )}
      {hasCategory && !jobTitleId && inputValue.trim() && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Free text — backend will resolve or create under this category on save.
        </p>
      )}

      {open &&
        hasCategory &&
        createPortal(
          <div
            id={listId}
            role="listbox"
            style={menuStyle}
            className="max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            {isFetching && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching…
              </div>
            )}
            {!isFetching && options.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {debouncedSearch.trim()
                  ? "No matches in this category — keep typing to create a new title on save."
                  : "Type to search job titles in this category."}
              </div>
            )}
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent",
                  option.id === jobTitleId && "bg-accent"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option)}
              >
                <span className="font-medium">{option.name}</span>
                {option.slug && (
                  <span className="text-[11px] text-muted-foreground">/{option.slug}</span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  )
}
