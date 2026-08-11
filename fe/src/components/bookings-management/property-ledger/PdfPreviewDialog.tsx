'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { Invoice } from './types'; // Import the existing type

interface PdfPreviewDialogProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
}

export function PdfPreviewDialog({ 
  invoice, 
  isOpen, 
  onOpenChange
}: PdfPreviewDialogProps) {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !invoice) return;

    const generatePreview = async () => {
      setIsLoading(true);
      try {
        const { generatePdf } = await import('./pdf-generator');
        const pdfBuffer = await generatePdf(invoice, true);
        
        if (pdfBuffer) {
          const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfPreviewUrl(url);
        }
      } catch (error) {
        console.error('Error generating PDF preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generatePreview();

    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [isOpen, invoice, pdfPreviewUrl]);

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Invoice Preview</DialogTitle>
          </div>
        </DialogHeader>
        
        {/* PDF Preview Container */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4 flex items-center justify-center">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : pdfPreviewUrl ? (
            <div className="shadow-lg" style={{ width: '612px', height: '792px', transform: 'scale(0.7)' }}>
              <embed 
                src={`${pdfPreviewUrl}#view=FitH`}
                type="application/pdf"
                width="100%"
                height="100%"
              />
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              Failed to load PDF preview
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}