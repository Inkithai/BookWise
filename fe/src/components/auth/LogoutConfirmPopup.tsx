'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface LogoutConfirmPopupProps {
  open: boolean
  onClose: () => void
  onLogout: () => void
}

export default function LogoutConfirmPopup({
  open,
  onClose,
  onLogout,
}: LogoutConfirmPopupProps) {
    const [loading, setLoading] = useState(false)

    const handleLogout = async () => {
    if (loading) return
    setLoading(true)

    try {
      await onLogout()
    } finally {
      // optional: keep disabled until dialog closes
      // setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary dark:text-white">
            Confirm Logout
          </DialogTitle>
        </DialogHeader>

        <p className="text-gray-500 text-[15px] leading-relaxed dark:text-white">
          Are you sure you want to logout? You will need to login again to access your account.
        </p>

        <DialogFooter className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            onClick={handleLogout}
            disabled={loading}
            className="bg-[#1a88e1] hover:bg-teal-600 text-white"
          >
            Logout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
