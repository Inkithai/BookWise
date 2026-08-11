'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteInvoicePopupProps {
  open: boolean
  invoiceCode?: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function DeleteInvoicePopup({
  open,
  invoiceCode,
  onClose,
  onConfirm,
}: DeleteInvoicePopupProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsDeleting(true)
      await onConfirm()
      onClose()
    } catch {
      toast.error('Failed to delete invoice')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary dark:text-white">
            Delete Invoice
          </DialogTitle>
        </DialogHeader>

        <p className="text-gray-500 text-[15px] leading-relaxed dark:text-white">
          Are you sure you want to delete{' '}
          <span className="font-bold text-gray-800 dark:text-white">
            {invoiceCode || 'this invoice'}
          </span>
          ? This action cannot be undone.
        </p>

        <DialogFooter className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
