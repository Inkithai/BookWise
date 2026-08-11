"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Recipient } from "./RecipientTable"
import { ErrorBoundary } from "react-error-boundary"
import { ReceiptPDF } from "./ReceiptPDF"

function ErrorFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
  
  // Provide user-friendly error messages
  let userMessage = 'Unable to load recipient details'
  let suggestion = 'Please try again or contact support if the issue persists.'
  
  if (errorMessage.includes('Network Error') || errorMessage.includes('network')) {
    userMessage = 'Network connection error'
    suggestion = 'Please check your internet connection and try again.'
  } else if (errorMessage.includes('timeout')) {
    userMessage = 'Request timed out'
    suggestion = 'The server is taking too long. Please try again.'
  } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
    userMessage = 'Session expired'
    suggestion = 'Please log in again to view recipient details.'
  } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
    userMessage = 'Recipient not found'
    suggestion = 'This recipient may have been deleted or is no longer available.'
  }
  
  return (
    <div className="p-6 text-center">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="text-lg font-semibold text-red-600 mb-2">{userMessage}</h3>
      <p className="text-sm text-muted-foreground mb-4">{suggestion}</p>
      {process.env.NODE_ENV === 'development' && (
        <details className="text-left mb-4 p-3 bg-gray-50 rounded text-xs">
          <summary className="cursor-pointer font-medium text-gray-600">Error details (Development only)</summary>
          <pre className="mt-2 text-red-600 overflow-auto">{errorMessage}</pre>
        </details>
      )}
      <Button onClick={resetErrorBoundary} variant="outline">
        Try Again
      </Button>
    </div>
  )
}

type RecipientViewProps = {
  recipient: Recipient & { subtotal: number }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecipientView({ recipient, open, onOpenChange }: RecipientViewProps) {
  if (!recipient) {
    throw new Error("Recipient data is missing")
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => onOpenChange(false)}
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>View Recipient</DialogTitle>
            <DialogDescription>
              Details for recipient {recipient.receiptCode}
            </DialogDescription>
          </DialogHeader>
          
          <ReceiptPDF recipient={{
            ...recipient,
            subtotal: recipient.subtotal || recipient.totalAmount
          }} />
          
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  )
}