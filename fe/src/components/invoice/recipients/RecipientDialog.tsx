// RecipientDialog.tsx
"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Recipient } from "./RecipientTable"
import { toast } from "sonner"
import { ReceiptPDF } from "./ReceiptPDF"

const generateReceiptCode = () => {
  const prefix = "RC-"
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return prefix + randomNum
}

const invoiceOptions = [
  { value: "INV-001", label: "INV-001" },
  { value: "INV-002", label: "INV-002" },
  { value: "INV-003", label: "INV-003" },
  { value: "INV-004", label: "INV-004" },
  { value: "INV-005", label: "INV-005" },
  { value: "INV-006", label: "INV-006" },
  { value: "INV-007", label: "INV-007" },
  { value: "INV-008", label: "INV-008" },
  { value: "INV-009", label: "INV-009" },
  { value: "INV-010", label: "INV-010" },
]

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank", label: "Bank Transfer" },
]

type RecipientDialogProps = {
  onSave: (recipient: Recipient) => Promise<void>
  recipients: Recipient[]
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient?: Recipient
}

export function RecipientDialog({ 
  onSave, 
  recipients = [], 
  open, 
  onOpenChange,
  recipient
}: RecipientDialogProps) {
  const [formData, setFormData] = useState({
    receiptDate: new Date().toISOString().split('T')[0],
    client: "",
    receiptCode: generateReceiptCode(),
    invoiceCode: "",
    totalAmount: 0,
    amountPaid: 0,
    paymentMethod: "cash",
    email: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (recipient) {
      setFormData({
        receiptDate: recipient.receiptDate,
        client: recipient.client,
        receiptCode: recipient.receiptCode,
        invoiceCode: recipient.invoiceCode,
        totalAmount: recipient.totalAmount,
        amountPaid: recipient.amountPaid,
        paymentMethod: recipient.paymentMethod,
        email: recipient.email || ""
      })
    } else if (open) {
      setFormData({
        receiptDate: new Date().toISOString().split('T')[0],
        client: "",
        receiptCode: generateReceiptCode(),
        invoiceCode: "",
        totalAmount: 0,
        amountPaid: 0,
        paymentMethod: "cash",
        email: ""
      })
    }
    setErrors({})
    setShowPreview(false)
  }, [open, recipient])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.client.trim()) {
      newErrors.client = "Client name is required"
    }
    if (!formData.invoiceCode) {
      newErrors.invoiceCode = "Invoice is required"
    }
    if (formData.totalAmount <= 0) {
      newErrors.totalAmount = "Total amount must be greater than 0"
    }
    if (formData.amountPaid < 0) {
      newErrors.amountPaid = "Amount paid cannot be negative"
    }
    if (formData.amountPaid > formData.totalAmount) {
      newErrors.amountPaid = "Amount paid cannot exceed total amount"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData({
        ...formData,
        receiptDate: date.toISOString().split('T')[0]
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === "amountPaid" || name === "totalAmount" ? parseFloat(value) || 0 : value
    })
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev}
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    })
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev}
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    try {
      setIsSubmitting(true)
      const dueAmount = formData.totalAmount - formData.amountPaid
      
      const recipientData: Recipient = {
        id: recipient?.id || (Math.max(0, ...recipients.map(r => parseInt(r.id))) + 1 + ""),
        receiptDate: formData.receiptDate,
        client: formData.client,
        receiptCode: formData.receiptCode,
        invoiceCode: formData.invoiceCode,
        totalAmount: formData.totalAmount,
        amountPaid: formData.amountPaid,
        totalAmountPaid: formData.amountPaid,
        dueAmount: dueAmount,
        status: "Created",
        createdBy: recipient?.createdBy || "Admin",
        paymentMethod: formData.paymentMethod,
        email: formData.email,
        subtotal: formData.totalAmount,
        items: [{
          description: "Booking from 26 July to 25 August 2024",
          quantity: 1,
          unitPrice: formData.totalAmount,
          amount: formData.totalAmount
        }]
      }

      await onSave(recipientData)
    } catch {
      toast.error("An error occurred while saving the recipient")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipient ? "Edit Recipient" : "Create Recipient"}</DialogTitle>
          <DialogDescription>
            {recipient ? "Update the recipient details below." : "Fill in the details below to create a new recipient."}
          </DialogDescription>
        </DialogHeader>
        
        {showPreview ? (
          <div className="py-4">
            <ReceiptPDF 
              recipient={{
                receiptCode: formData.receiptCode,
                client: formData.client,
                invoiceCode: formData.invoiceCode,
                paymentMethod: formData.paymentMethod,
                receiptDate: formData.receiptDate,
                createdBy: "Admin",
                email: formData.email,
                items: [{
                  description: "Booking from 26 July to 25 August 2024",
                  quantity: 1,
                  unitPrice: formData.totalAmount,
                  amount: formData.totalAmount
                }],
                subtotal: formData.totalAmount,
                totalAmount: formData.totalAmount,
                amountPaid: formData.amountPaid,
                dueAmount: formData.totalAmount - formData.amountPaid
              }}
            />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invoice" className="text-right">
                Invoice
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.invoiceCode}
                  onValueChange={(value) => handleSelectChange("invoiceCode", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceOptions.map((invoice) => (
                      <SelectItem key={invoice.value} value={invoice.value}>
                        {invoice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.invoiceCode && (
                  <p className="mt-1 text-sm text-red-500">{errors.invoiceCode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receiptCode" className="text-right">
                Receipt Code
              </Label>
              <div className="col-span-3">
                <Input 
                  id="receiptCode" 
                  className="w-full"
                  value={formData.receiptCode}
                  onChange={(e) => handleSelectChange("receiptCode", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMethod" className="text-right">
                Payment Method
              </Label>
              <div className="col-span-3">
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleSelectChange("paymentMethod", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Client
              </Label>
              <div className="col-span-3">
                <Input 
                  id="client" 
                  className="w-full"
                  name="client"
                  value={formData.client}
                  onChange={handleInputChange}
                />
                {errors.client && (
                  <p className="mt-1 text-sm text-red-500">{errors.client}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <div className="col-span-3">
                <Input 
                  id="email" 
                  className="w-full"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount (£)
              </Label>
              <div className="col-span-3">
                <Input 
                  id="amount" 
                  type="number" 
                  className="w-full"
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
                {errors.totalAmount && (
                  <p className="mt-1 text-sm text-red-500">{errors.totalAmount}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amountPaid" className="text-right">
                Amount Paid (£)
              </Label>
              <div className="col-span-3">
                <Input 
                  id="amountPaid" 
                  type="number" 
                  className="w-full"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
                {errors.amountPaid && (
                  <p className="mt-1 text-sm text-red-500">{errors.amountPaid}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receiptDate" className="text-right">
                Receipt Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(formData.receiptDate), 'dd/MM/yy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={new Date(formData.receiptDate)}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(!showPreview)}
            disabled={isSubmitting}
          >
            {showPreview ? "Back to Form" : "Preview"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {!showPreview && (
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : recipient ? "Update" : "Create"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}