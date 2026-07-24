import { cn } from "@/lib/utils"

/** Shared article body styles — keep in sync with frontend RichTextContent.vue */
export const RICH_TEXT_CONTENT_CLASS = "rich-text-content"

interface RichTextContentProps {
  html: string
  className?: string
}

/** Read-only render of news/article HTML (same look as public news detail). */
export function RichTextContent({ html, className }: RichTextContentProps) {
  if (!html?.trim()) {
    return (
      <p className={cn("text-sm text-muted-foreground italic", className)}>
        No content yet.
      </p>
    )
  }

  return (
    <div
      className={cn(RICH_TEXT_CONTENT_CLASS, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
