"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { pdf, DocumentProps } from '@react-pdf/renderer'
import { toast } from "sonner"
import { ReactElement } from "react"

interface PdfDownloadButtonProps {
  document: ReactElement<DocumentProps> // Specify the document type
  fileName: string
  variant?: "default" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
}

export function PdfDownloadButton({
  document: pdfDocument, // Renamed to avoid conflict with global document
  fileName,
  variant = "ghost",
  size = "icon",
  className = "",
  children
}: PdfDownloadButtonProps) {
  const handleDownload = async () => {
    try {
      const blob = await pdf(pdfDocument).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName}.pdf`
      document.body.appendChild(link)
      link.click()

      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)

      toast.success("PDF downloaded successfully")
    } catch (error) {
      console.error('Download Error:', error)
      toast.error("Failed to download PDF")
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      className={className}
    >
      {children || <Download className="h-4 w-4" />}
    </Button>
  )
}