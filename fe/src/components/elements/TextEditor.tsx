"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import TiptapImage from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import { useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  Minus,
  Table as TableIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TextEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
}

export const TextEditor = ({
  value = "",
  onChange,
  placeholder = "Type your description here...",
  className = "",
  readOnly = false,
}: TextEditorProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [hasHeader, setHasHeader] = useState(true)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc pl-5",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal pl-5",
          },
        },
        code: false,
        codeBlock: false,
      }),
      Underline.configure({
        HTMLAttributes: {
          class: "underline",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-teal-500 dark:text-teal-400 underline hover:text-teal-700 dark:hover:text-teal-300",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph", "image"],
        alignments: ["left", "center", "right", "justify"],
      }),
      TiptapImage.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg border border-border",
        },
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: placeholder,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse border border-border",
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: "border border-border",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "bg-muted border border-border px-4 py-2",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border px-4 py-2",
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML())
      }
    },
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl dark:prose-invert w-full focus:outline-none p-4",
          "min-h-[100px] max-h-[500px] overflow-y-auto",
          // Custom heading styles
          "prose-h1:text-3xl prose-h1:font-bold prose-h1:my-4 prose-h1:border-b prose-h1:pb-2 prose-h1:border-border",
          "prose-h2:text-2xl prose-h2:font-bold prose-h2:my-3 prose-h2:border-b prose-h2:pb-1 prose-h2:border-border",
          "prose-h3:text-xl prose-h3:font-semibold prose-h3:my-2",
          // List styles
          "prose-ul:list-disc prose-ol:list-decimal prose-li:my-1",
          // Blockquote styles
          "prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:rounded",
          // Table styles
          "prose-table:border-collapse prose-table:w-full prose-th:bg-muted",
          // General styles
          "prose-p:my-2 prose-pre:bg-muted prose-pre:rounded prose-pre:p-2",
          className
        ),
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string
      editor?.chain().focus().setImage({ src: imageUrl }).run()
    }
    reader.readAsDataURL(file)
  }

  const setLink = () => {
    const previousUrl = editor?.getAttributes("link").href
    const url = window.prompt("URL", previousUrl)

    if (url === null) return

    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const addTable = () => {
    setIsTableDialogOpen(true)
  }

  const confirmTable = () => {
    editor?.chain()
      .focus()
      .insertTable({
        rows: Math.max(1, Math.min(rows, 10)),
        cols: Math.max(1, Math.min(cols, 10)),
        withHeaderRow: hasHeader,
      })
      .run()
    setIsTableDialogOpen(false)
  }

  if (!editor) {
    return null
  }

  if (readOnly) {
    return (
      <div className={cn(
        "p-4 w-full bg-background border border-border rounded-lg",
        "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl dark:prose-invert w-full",
        // Custom heading styles
        "prose-h1:text-3xl prose-h1:font-bold prose-h1:my-4 prose-h1:border-b prose-h1:pb-2 prose-h1:border-border",
        "prose-h2:text-2xl prose-h2:font-bold prose-h2:my-3 prose-h2:border-b prose-h2:pb-1 prose-h2:border-border",
        "prose-h3:text-xl prose-h3:font-semibold prose-h3:my-2",
        // List styles
        "prose-ul:list-disc prose-ol:list-decimal prose-li:my-1",
        // Blockquote styles
        "prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:rounded",
        // Table styles
        "prose-table:border-collapse prose-table:w-full prose-th:bg-muted",
        // General styles
        "prose-p:my-2 prose-pre:bg-muted prose-pre:rounded prose-pre:p-2",
        "min-h-[100px] overflow-y-auto",
        className
      )}>
        {value ? (
          <div dangerouslySetInnerHTML={{ __html: value }} />
        ) : (
          <div className="text-muted-foreground italic">{placeholder}</div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full border border-border rounded-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 border-b border-border rounded-t-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="hover:bg-muted-foreground/10"
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="hover:bg-muted-foreground/10"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-border" />

        {/* Headings */}
        <Select
          value={
            editor.isActive("heading", { level: 1 })
              ? "h1"
              : editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
              ? "h3"
              : "p"
          }
          onValueChange={(value) => {
            if (value === "p") {
              editor.chain().focus().setParagraph().run()
            } else {
              const level = parseInt(value.replace("h", "")) as 1 | 2 | 3
              editor.chain().focus().toggleHeading({ level }).run()
            }
          }}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Paragraph" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value="h1">
              <div className="flex items-center gap-2">
                <Heading1 className="h-4 w-4" /> Heading 1
              </div>
            </SelectItem>
            <SelectItem value="h2">
              <div className="flex items-center gap-2">
                <Heading2 className="h-4 w-4" /> Heading 2
              </div>
            </SelectItem>
            <SelectItem value="h3">
              <div className="flex items-center gap-2">
                <Heading3 className="h-4 w-4" /> Heading 3
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 bg-border" />

        {/* Text Formatting */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive("bold") ? "bg-accent" : ""
              )}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive("italic") ? "bg-accent" : ""
              )}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive("underline") ? "bg-accent" : ""
              )}
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-border" />

        {/* Text Alignment */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive({ textAlign: "left" }) ? "bg-accent" : ""
              )}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align Left</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive({ textAlign: "center" }) ? "bg-accent" : ""
              )}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align Center</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive({ textAlign: "right" }) ? "bg-accent" : ""
              )}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align Right</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive({ textAlign: "justify" }) ? "bg-accent" : ""
              )}
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Justify</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 bg-border" />

        {/* Lists */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive("bulletList") ? "bg-accent" : ""
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bullet List</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive("orderedList") ? "bg-accent" : ""
              )}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered List</TooltipContent>
        </Tooltip>

        {/* Table */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={addTable}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive("table") ? "bg-accent" : ""
              )}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert Table</TooltipContent>
        </Tooltip>

        {/* Link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={setLink}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive("link") ? "bg-accent" : ""
              )}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Link</TooltipContent>
        </Tooltip>

        {/* Image */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "hover:bg-muted-foreground/10",
                  editor.isActive("image") ? "bg-accent" : ""
                )}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>Insert Image</TooltipContent>
        </Tooltip>

        {/* Blockquote */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={cn(
                "hover:bg-muted-foreground/10",
                editor.isActive("blockquote") ? "bg-accent" : ""
              )}
            >
              <Quote className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Blockquote</TooltipContent>
        </Tooltip>

        {/* Horizontal Rule */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="hover:bg-muted-foreground/10"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Horizontal Rule</TooltipContent>
        </Tooltip>
      </div>

      {/* Editor Content */}
      <div className="w-full bg-background rounded-b-lg">
        <EditorContent
          editor={editor}
          className={cn("w-full min-h-[100px] overflow-y-auto", className)}
        />
      </div>

      {/* Table Creation Dialog */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Table</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rows" className="text-right">
                Rows
              </Label>
              <Input
                id="rows"
                type="number"
                min="1"
                max="10"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cols" className="text-right">
                Columns
              </Label>
              <Input
                id="cols"
                type="number"
                min="1"
                max="10"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="header" className="text-right">
                Header Row
              </Label>
              <div className="col-span-3 flex items-center">
                <input
                  id="header"
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="h-4 w-4 text-primary"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmTable}>Insert Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}