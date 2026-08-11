"use client"

import * as React from "react"
import { useState } from "react"
import { Table, Column, CardConfig } from "@/components/elements/Table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RecipientDialog } from "./RecipientDialog"
import { RecipientView } from "./RecipientView"
import { RecipientDelete } from "./RecipientDelete"
import { Eye, Edit, Trash2, Download, Mail } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { ErrorBoundary } from "react-error-boundary"
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { COMPANY, companyContactLine, companyLegalLine, companyThanksLine } from '@/lib/company';

export type Recipient = {
  id: string
  receiptDate: string
  client: string
  receiptCode: string
  invoiceCode: string
  totalAmount: number
  amountPaid: number
  totalAmountPaid: number
  dueAmount: number
  status: "Created" | "Updated" | "Mailed" | "Printed"
  createdBy: string
  paymentMethod: string
  email?: string
  items: {
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }[]
  subtotal: number
}

const initialRecipients: Recipient[] = [
  {
    id: "1",
    receiptDate: "2023-05-15",
    client: "Client X",
    receiptCode: "RC-001",
    invoiceCode: "INV-001",
    totalAmount: 1000,
    amountPaid: 500,
    totalAmountPaid: 500,
    dueAmount: 500,
    status: "Created",
    createdBy: "Admin",
    paymentMethod: "cash",
    subtotal: 1000,
    items: [{
      description: "Booking from 26 July to 25 August 2024",
      quantity: 1,
      unitPrice: 1000,
      amount: 1000
    }]
  },
  {
    id: "2",
    receiptDate: "2023-05-16",
    client: "Client Y",
    receiptCode: "RC-002",
    invoiceCode: "INV-002",
    totalAmount: 1500,
    amountPaid: 1500,
    totalAmountPaid: 1500,
    dueAmount: 0,
    status: "Mailed",
    createdBy: "Manager",
    paymentMethod: "card",
    subtotal: 1500,
    items: [{
      description: "Booking from 26 July to 25 August 2024",
      quantity: 1,
      unitPrice: 1500,
      amount: 1500
    }]
  }
]

function ErrorFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
  
  // Provide user-friendly error messages
  let userMessage = 'Unable to load recipients'
  let suggestion = 'Please try again or contact support if the issue persists.'
  
  if (errorMessage.includes('Network Error') || errorMessage.includes('network')) {
    userMessage = 'Network connection error'
    suggestion = 'Please check your internet connection and try again.'
  } else if (errorMessage.includes('timeout')) {
    userMessage = 'Request timed out'
    suggestion = 'The server is taking too long. Please try again.'
  } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
    userMessage = 'Session expired'
    suggestion = 'Please log in again to view recipients.'
  } else if (errorMessage.includes('500')) {
    userMessage = 'Server error'
    suggestion = 'Our servers are experiencing issues. Please try again later.'
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-64 p-4 text-center">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="text-lg font-medium text-red-600">{userMessage}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{suggestion}</p>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-3 text-left p-3 bg-gray-50 rounded text-xs max-w-md">
          <summary className="cursor-pointer font-medium text-gray-600">Error details (Development only)</summary>
          <pre className="mt-2 text-red-600 overflow-auto">{errorMessage}</pre>
        </details>
      )}
      <Button 
        variant="outline" 
        onClick={resetErrorBoundary}
        className="mt-4"
      >
        Try Again
      </Button>
    </div>
  )
}

export function RecipientTable() {
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClient, setSelectedClient] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalEntries = recipients.length
  const totalPages = Math.ceil(totalEntries / itemsPerPage)
  const showingFrom = (currentPage - 1) * itemsPerPage + 1
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries)

  const clientOptions = Array.from(new Set(recipients.map(r => r.client))).map(client => ({
    value: client,
    label: client
  }))

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Created", label: "Created" },
    { value: "Updated", label: "Updated" },
    { value: "Mailed", label: "Mailed" },
    { value: "Printed", label: "Printed" }
  ]

  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = 
      recipient.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.receiptCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.invoiceCode.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesClient = selectedClient === "all" || recipient.client === selectedClient
    const matchesStatus = selectedStatus === "all" || recipient.status === selectedStatus
    
    return matchesSearch && matchesClient && matchesStatus
  })

  const currentRecipients = filteredRecipients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page: number) => {
    if (page < 1) page = 1
    if (page > totalPages) page = totalPages
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value)
    setCurrentPage(1)
  }

  const handleSelectChange = (value: string) => {
    handleItemsPerPageChange(Number(value))
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedClient("all")
    setSelectedStatus("all")
    setCurrentPage(1)
  }

  const handleCreateRecipient = async (newRecipient: Recipient) => {
    try {
      setIsLoading(true)
      await new Promise(resolve => setTimeout(resolve, 500))
      setRecipients([...recipients, {
        ...newRecipient,
        subtotal: newRecipient.totalAmount,
        status: "Created"
      }])
      toast.success("Recipient created successfully")
    } catch {
      setError("Failed to create recipient")
      toast.error("Failed to create recipient")
    } finally {
      setIsLoading(false)
      setIsDialogOpen(false)
      setSelectedRecipient(undefined)
    }
  }

  const handleEditRecipient = async (updatedRecipient: Recipient) => {
    try {
      setIsLoading(true)
      await new Promise(resolve => setTimeout(resolve, 500))
      setRecipients(recipients.map(r => 
        r.id === updatedRecipient.id ? {
          ...updatedRecipient,
          subtotal: updatedRecipient.subtotal || updatedRecipient.totalAmount,
          status: "Updated"
        } : r
      ))
      toast.success("Recipient updated successfully")
    } catch {
      setError("Failed to update recipient")
      toast.error("Failed to update recipient")
    } finally {
      setIsLoading(false)
      setIsDialogOpen(false)
      setSelectedRecipient(undefined)
    }
  }

  const handleDeleteRecipient = async () => {
    if (!selectedRecipient) return
    
    try {
      setIsLoading(true)
      await new Promise(resolve => setTimeout(resolve, 500))
      setRecipients(recipients.filter(r => r.id !== selectedRecipient.id))
      toast.success("Recipient deleted successfully")
    } catch {
      setError("Failed to delete recipient")
      toast.error("Failed to delete recipient")
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setSelectedRecipient(undefined)
    }
  }

const handleDownloadReceipt = async (recipient: Recipient) => {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4 size in points
    
    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Load and embed the logo image
    const fetchImageAsUint8Array = async (url: string): Promise<Uint8Array> => {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    }
    
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
    let yPos = pageHeight - margin - 190

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
    yPos = pageHeight - margin - 190
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

// Save and download the PDF
    const pdfBytes = await pdfDoc.save()
const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${recipient.receiptCode}.pdf`
    link.click()
    URL.revokeObjectURL(url)

    // Update status
    setRecipients(recipients.map(r => 
      r.id === recipient.id ? {...r, status: "Printed"} : r
    ))
    toast.success("Receipt downloaded successfully")
  } catch (err) {
    console.error("Error generating PDF:", err)
    toast.error("Failed to generate PDF")
  }
}
  const handleMailReceipt = (recipient: Recipient) => {
    setRecipients(recipients.map(r => 
      r.id === recipient.id ? {...r, status: "Mailed"} : r
    ))
    toast.success("Receipt sent via email")
  }

  const openViewDialog = (recipient: Recipient) => {
    setSelectedRecipient(recipient)
    setIsViewDialogOpen(true)
  }

  const openEditDialog = (recipient: Recipient) => {
    setSelectedRecipient(recipient)
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (recipient: Recipient) => {
    setSelectedRecipient(recipient)
    setIsDeleteDialogOpen(true)
  }

  const columns: Column<Recipient>[] = [
    {
      accessor: "receiptDate",
      header: "Receipt Date",
      cell: (row) => <div>{row.receiptDate}</div>,
      priority: 2, // Mobile+
    },
    {
      accessor: "client",
      header: "Client",
      cell: (row) => <div>{row.client}</div>,
      priority: 1, // Always show
    },
    {
      accessor: "receiptCode",
      header: "Receipt Code",
      cell: (row) => <div>{row.receiptCode}</div>,
      priority: 2, // Mobile+
    },
    {
      accessor: "invoiceCode",
      header: "Invoice Code",
      cell: (row) => <div>{row.invoiceCode}</div>,
      priority: 3, // Tablet+
    },
    {
      accessor: "totalAmount",
      header: "Total Amount",
      cell: (row) => {
        const formatted = new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "LKR",
        }).format(row.totalAmount)
        return <div className="text-left">{formatted}</div>
      },
      priority: 2, // Mobile+
    },
    {
      accessor: "totalAmountPaid",
      header: "Total Amount Paid",
      cell: (row) => {
        const formatted = new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "LKR",
        }).format(row.totalAmountPaid)
        return <div className="text-left">{formatted}</div>
      },
      priority: 3, // Tablet+
    },
    {
      accessor: "dueAmount",
      header: "Due Amount",
      cell: (row) => {
        const formatted = new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "LKR",
        }).format(row.dueAmount)
        return <div className="text-left">{formatted}</div>
      },
      priority: 3, // Tablet+
    },
    {
      accessor: "status",
      header: "Status",
      cell: (row) => (
        <div className="capitalize">
          <span className={`px-2 py-1 rounded-full text-xs ${
            row.status === "Created" 
              ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" 
              : row.status === "Updated"
                ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                : row.status === "Mailed"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          }`}>
            {row.status}
          </span>
        </div>
      ),
      priority: 2, // Mobile+
    },
    {
      accessor: "id",
      header: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => openViewDialog(row)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(row)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDownloadReceipt(row)}
                  className="hover:text-teal-600"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => handleMailReceipt(row)}>
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Email</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(row)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      priority: 1, // Always show
    },
  ]

  // Card configuration for mobile view
  const recipientCardConfig: CardConfig<Recipient> = {
    title: (row) => row.client || 'Unknown Client',
    subtitle: (row) => `${row.receiptCode} / ${row.invoiceCode}`,
    primaryMetric: {
      field: 'totalAmount',
      label: 'Total Amount',
      format: (val) => new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "LKR",
      }).format(val as number),
    },
    secondaryMetrics: [
      { 
        field: 'totalAmountPaid', 
        label: 'Paid',
        format: (val) => new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "LKR",
        }).format(val as number)
      },
      { 
        field: 'dueAmount', 
        label: 'Due',
        format: (val) => new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "LKR",
        }).format(val as number)
      },
    ],
    statusField: 'status',
    statusColors: {
      'created': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      'updated': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      'mailed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'printed': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    actions: (row) => (
      <div className="flex gap-3">
        <Button 
          className="flex-1 h-14 min-h-[56px] text-base font-semibold rounded-xl"
          onClick={() => openViewDialog(row)}
        >
          <Eye className="h-5 w-5 mr-2" />
          View
        </Button>
        <Button 
          variant="outline"
          className="h-14 w-14 min-h-[56px] rounded-xl"
          onClick={() => openEditDialog(row)}
        >
          <Edit className="h-5 w-5" />
        </Button>
      </div>
    ),
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p>{error}</p>
          <Button 
            variant="outline" 
            onClick={() => setError(null)}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        setError(null)
        setSelectedRecipient(undefined)
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Invoice Recipient</h2>
          <Button 
            variant="default" 
            onClick={() => {
              setSelectedRecipient(undefined)
              setIsDialogOpen(true)
            }}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Create Recipient"}
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search recipients..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="max-w-xs"
          />

          <Select
            value={selectedClient}
            onValueChange={(value) => {
              setSelectedClient(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clientOptions.map((client) => (
                <SelectItem key={client.value} value={client.value}>
                  {client.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={clearAllFilters}
            disabled={searchTerm === "" && selectedClient === "all" && selectedStatus === "all"}
          >
            Clear All
          </Button>

          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-sm text-muted-foreground">Rows:</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage.toString()} />
              </SelectTrigger>
              <SelectContent side="bottom">
                {[10, 20, 30, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table
          data={currentRecipients}
          columns={columns}
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalEntries}
          showingFrom={showingFrom}
          showingTo={showingTo}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          cardConfig={recipientCardConfig}
          tableName="recipients"
        />

        <RecipientDialog 
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setSelectedRecipient(undefined)
          }}
          onSave={selectedRecipient ? handleEditRecipient : handleCreateRecipient}
          recipients={recipients}
          recipient={selectedRecipient}
        />

        {selectedRecipient && (
          <>
            <RecipientView
              recipient={selectedRecipient}
              open={isViewDialogOpen}
              onOpenChange={setIsViewDialogOpen}
            />

            <RecipientDelete
              recipient={selectedRecipient}
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onDelete={handleDeleteRecipient}
            />
          </>
        )}
      </div>
    </ErrorBoundary>
  )
}