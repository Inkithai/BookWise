"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { COMPANY, companyContactLine, companyLegalLine, companyThanksLine } from '@/lib/company';

// Type Definitions
interface ReceiptItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

interface RecipientData {
  receiptCode: string
  client: string
  invoiceCode: string
  paymentMethod: string
  receiptDate: string
  createdBy: string
  email?: string
  items: ReceiptItem[]
  subtotal: number
  totalAmount: number
  amountPaid: number
  dueAmount: number
}

interface ReceiptPDFProps {
  recipient: RecipientData | null
}

export function ReceiptPDF({ recipient }: ReceiptPDFProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const fetchImageAsUint8Array = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  }

  const generatePdf = async () => {
    if (!recipient) {
      setError("No recipient data available")
      return null
    }

    try {
      setIsGenerating(true)
      setError(null)

      // Validate required fields
      if (!recipient.items || recipient.items.length === 0) {
        throw new Error("No items in receipt")
      }

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595, 842]) // A4 size in points (595 x 842 pt = 210 x 297 mm)

      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      // Load and embed the logo image
      const logoUrl = '/logo.png' // Path to your logo in public folder
      const logoImageBytes = await fetchImageAsUint8Array(logoUrl)
      const logoImage = await pdfDoc.embedPng(logoImageBytes)
      
      // Set up styles and measurements
      const margin = 40
      const pageWidth = page.getWidth()
      const pageHeight = page.getHeight()
      
      // Colors
      const black = rgb(0, 0, 0)
      const darkGray = rgb(0.4, 0.4, 0.4)
      

      // Draw black header background
      const headerHeight = 120
      page.drawRectangle({
        x: margin,
        y: pageHeight - margin - headerHeight,
        width: pageWidth - margin * 2,
        height: headerHeight,
        color: black,
      })

      // Draw logo (centered in header)
      const logoAspectRatio = logoImage.width / logoImage.height
      const logoDisplayHeight = 60 // Adjust as needed
      const logoDisplayWidth = logoDisplayHeight * logoAspectRatio
      
      page.drawImage(logoImage, {
        x: (pageWidth - logoDisplayWidth) / 2,
        y: pageHeight - margin - headerHeight + (headerHeight - logoDisplayHeight) / 2,
        width: logoDisplayWidth,
        height: logoDisplayHeight,
      })

      // Draw title (centered below logo)
      const title = "SALES RECEIPT"
      const titleWidth = fontBold.widthOfTextAtSize(title, 24)
      page.drawText(title, {
        x: (pageWidth - titleWidth) / 2,
        y: pageHeight - margin - headerHeight - 30,
        size: 24,
        font: fontBold,
        color: black,
      })

      // Draw address (centered)
      const address = "158 Burgass Road, Nottingham, NG3 6JP"
      const addressWidth = font.widthOfTextAtSize(address, 12)
      page.drawText(address, {
        x: (pageWidth - addressWidth) / 2,
        y: pageHeight - margin - headerHeight - 50,
        size: 12,
        font: font,
        color: black,
      })

      // Draw receipt details
      let yPos = pageHeight - margin - headerHeight - 100

      // Left column details
      const leftColX = margin
      const rightColX = pageWidth / 2

      const drawDetail = (label: string, value: string, x: number, y: number) => {
        page.drawText(`${label}:`, {
          x,
          y,
          size: 10,
          font: fontBold,
          color: black,
        })
        page.drawText(value, {
          x: x + 100,
          y,
          size: 10,
          font: font,
          color: black,
        })
      }

      drawDetail("Receipt Number", recipient.receiptCode, leftColX, yPos)
      yPos -= 20
      drawDetail("Recipient", recipient.client, leftColX, yPos)
      yPos -= 20
      drawDetail("Recipient Email", recipient.email || "N/A", leftColX, yPos)
      yPos -= 20
      drawDetail("Paid on", recipient.receiptDate, leftColX, yPos)
      yPos -= 40

      // Right column details
      yPos = pageHeight - margin - headerHeight - 100
      drawDetail("Invoice Number", recipient.invoiceCode, rightColX, yPos)
      yPos -= 20
      drawDetail("Payment Method", recipient.paymentMethod, rightColX, yPos)
      yPos -= 20
      drawDetail("Receipt Created By", recipient.createdBy, rightColX, yPos)
      yPos -= 40

      // Draw table header
      page.drawText("DESCRIPTION", {
        x: margin,
        y: yPos,
        size: 10,
        font: fontBold,
        color: black,
      })
      page.drawText("QTY", {
        x: margin + 300,
        y: yPos,
        size: 10,
        font: fontBold,
        color: black,
      })
      page.drawText("UNIT PRICE", {
        x: margin + 350,
        y: yPos,
        size: 10,
        font: fontBold,
        color: black,
      })
      page.drawText("AMOUNT", {
        x: margin + 450,
        y: yPos,
        size: 10,
        font: fontBold,
        color: black,
      })
      yPos -= 15

      // Draw a line under the header
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 1,
        color: black,
      })
      yPos -= 20

      // Draw items
      recipient.items.forEach(item => {
        page.drawText(item.description, {
          x: margin,
          y: yPos,
          size: 10,
          font: font,
          color: black,
        })
        page.drawText(item.quantity.toFixed(2), {
          x: margin + 300,
          y: yPos,
          size: 10,
          font: font,
          color: black,
        })
        page.drawText(`£${item.unitPrice.toFixed(2)}`, {
          x: margin + 350,
          y: yPos,
          size: 10,
          font: font,
          color: black,
        })
        page.drawText(`£${item.amount.toFixed(2)}`, {
          x: margin + 450,
          y: yPos,
          size: 10,
          font: font,
          color: black,
        })
        yPos -= 20
      })

      // Draw totals
      yPos -= 20
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 1,
        color: black,
      })
      yPos -= 20

      const drawTotal = (label: string, value: string, bold = false) => {
        page.drawText(`${label}:`, {
          x: margin + 350,
          y: yPos,
          size: 10,
          font: bold ? fontBold : font,
          color: black,
        })
        page.drawText(value, {
          x: margin + 450,
          y: yPos,
          size: 10,
          font: bold ? fontBold : font,
          color: black,
        })
        yPos -= bold ? 25 : 20
      }

      drawTotal("SUBTOTAL", `£${recipient.subtotal.toFixed(2)}`)
      drawTotal("TOTAL AMOUNT", `£${recipient.totalAmount.toFixed(2)}`)
      drawTotal("PAID AMOUNT", `£${recipient.amountPaid.toFixed(2)}`)
      drawTotal("BALANCE", `£${recipient.dueAmount.toFixed(2)}`, true)

      // Draw footer (centered)
      const footerLines = [
        companyThanksLine(),
        companyLegalLine(),
        COMPANY.address,
        companyContactLine()
      ]

      yPos = margin + 60
      footerLines.forEach(line => {
        const lineWidth = font.widthOfTextAtSize(line, 8)
        page.drawText(line, {
          x: (pageWidth - lineWidth) / 2,
          y: yPos,
          size: 8,
          font: font,
          color: darkGray,
        })
        yPos -= 12
      })

      // Save the PDF
      const pdfBytes = await pdfDoc.save()
return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    } catch (error) {
      console.error('PDF Generation Error:', error)
      setError(error instanceof Error ? error.message : "Failed to generate PDF")
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!recipient) return

    try {
      const blob = await generatePdf()
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${recipient.receiptCode}.pdf`
      document.body.appendChild(link)
      link.click()

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 100)

      toast.success("Receipt downloaded successfully")
    } catch (error) {
      console.error('Download Error:', error)
      toast.error("Failed to download receipt")
    }
  }

  useEffect(() => {
    let isMounted = true
    let objectUrl: string | null = null

    const generateAndSetPdfUrl = async () => {
      if (!recipient) return

      try {
        const blob = await generatePdf()
        if (blob && isMounted) {
          objectUrl = URL.createObjectURL(blob)
          setPdfUrl(objectUrl)
        }
      } catch (error) {
        console.error('PDF URL Generation Error:', error)
        if (isMounted) {
          setError("Failed to generate PDF preview")
        }
      }
    }

    generateAndSetPdfUrl()

    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [recipient])

  if (!recipient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>No recipient data available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button 
          variant="default" 
          onClick={handleDownload}
          disabled={isGenerating || !pdfUrl}
        >
          {isGenerating ? "Generating..." : "Download PDF"}
        </Button>
      </div>

      <div className="overflow-auto border rounded-lg bg-white">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 p-4">
            <p className="text-red-500 mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </div>
        ) : pdfUrl ? (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            width="100%"
            height="800px"
            style={{ border: 'none' }}
            onError={() => setError('Failed to load PDF preview')}
            title="Receipt PDF Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p>{isGenerating ? "Generating PDF..." : "Loading PDF..."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}