import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import { TextStyle } from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import Image from "@tiptap/extension-image"
import Typography from "@tiptap/extension-typography"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  Undo2,
  Redo2,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code,
  Code2,
  Minus,
  Highlighter,
  ImageIcon,
  Pilcrow,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#111827" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#7c3aed" },
]

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-8 w-8 p-0 shrink-0", active && "bg-muted text-foreground")}
      disabled={disabled}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
}

/** True when HTML has no visible text (e.g. empty `<p></p>`). */
export function isRichTextEmpty(html: string) {
  if (!html?.trim()) return true
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.length === 0
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write article content…",
  disabled = false,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {
          HTMLAttributes: { class: "list-disc pl-6 my-2" },
        },
        orderedList: {
          HTMLAttributes: { class: "list-decimal pl-6 my-2" },
        },
        blockquote: {
          HTMLAttributes: {
            class: "border-l-4 border-muted-foreground/40 pl-4 italic my-2 text-muted-foreground",
          },
        },
        code: {
          HTMLAttributes: {
            class: "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: "rounded-md bg-muted p-3 font-mono text-sm my-2 overflow-x-auto",
          },
        },
        horizontalRule: {
          HTMLAttributes: { class: "my-4 border-t border-border" },
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: { class: "bg-yellow-200/80 rounded px-0.5" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2" },
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "max-w-full h-auto rounded-md my-2" },
      }),
      Typography,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          "tiptap-editor min-h-[260px] max-h-[520px] overflow-y-auto px-3 py-2 focus:outline-none",
          "[&_p.is-editor-empty:first-child::before]:text-muted-foreground",
          "[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_p.is-editor-empty:first-child::before]:float-left",
          "[&_p.is-editor-empty:first-child::before]:h-0",
          "[&_p.is-editor-empty:first-child::before]:pointer-events-none"
        ),
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false })
    }
  }, [editor, value])

  const setLink = () => {
    if (!editor) return
    const previous = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", previous || "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const setImage = () => {
    if (!editor) return
    const url = window.prompt("Image URL", "https://")
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
  }

  if (!editor) {
    return (
      <div className={cn("rounded-md border bg-muted/30 min-h-[300px] animate-pulse", className)} />
    )
  }

  return (
    <div className={cn("rounded-md border bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-1 py-1">
        <ToolbarButton
          active={editor.isActive("paragraph")}
          disabled={disabled}
          title="Paragraph"
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          disabled={disabled}
          title="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          active={editor.isActive("bold")}
          disabled={disabled}
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          disabled={disabled}
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          disabled={disabled}
          title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          disabled={disabled}
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("highlight")}
          disabled={disabled}
          title="Highlight"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("code")}
          disabled={disabled}
          title="Inline code"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <label
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            disabled ? "opacity-50 pointer-events-none" : "hover:bg-accent cursor-pointer"
          )}
          title="Text color"
        >
          <span
            className="h-3.5 w-3.5 rounded-sm border border-border"
            style={{
              backgroundColor:
                (editor.getAttributes("textStyle").color as string | undefined) || "#111827",
            }}
          />
          <input
            type="color"
            className="sr-only"
            disabled={disabled}
            value={
              (editor.getAttributes("textStyle").color as string | undefined)?.startsWith("#")
                ? (editor.getAttributes("textStyle").color as string)
                : "#111827"
            }
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        <select
          className="h-8 max-w-[7.5rem] rounded-md border border-transparent bg-transparent px-1 text-xs hover:bg-accent disabled:opacity-50"
          disabled={disabled}
          title="Text color preset"
          value={(editor.getAttributes("textStyle").color as string | undefined) || ""}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const next = e.target.value
            if (!next) {
              editor.chain().focus().unsetColor().run()
              return
            }
            editor.chain().focus().setColor(next).run()
          }}
        >
          {TEXT_COLORS.map((c) => (
            <option key={c.label} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <ToolbarDivider />

        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          disabled={disabled}
          title="Align left"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          disabled={disabled}
          title="Align center"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          disabled={disabled}
          title="Align right"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "justify" })}
          disabled={disabled}
          title="Justify"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          disabled={disabled}
          title="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          disabled={disabled}
          title="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          disabled={disabled}
          title="Quote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          disabled={disabled}
          title="Code block"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          disabled={disabled}
          title="Link"
          onClick={setLink}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton disabled={disabled} title="Insert image" onClick={setImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          disabled={disabled}
          title="Clear formatting"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled || !editor.can().chain().focus().undo().run()}
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled || !editor.can().chain().focus().redo().run()}
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
