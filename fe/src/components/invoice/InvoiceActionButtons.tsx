// components/invoice/InvoiceActionButtons.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Mail, FileText, Receipt, Loader2 } from "lucide-react";
import { generateInvoicePDF, generateInvoiceReceiptPDF, downloadBlob } from "@/services/invoice.service";
import { toast } from "sonner";

interface InvoiceActionButtonsProps {
  invoiceId?: number;
  companyId?: number | null;
  invoiceCode?: string;
  onMailClick: () => void;
  disabled?: boolean;
}

export function InvoiceActionButtons({
  invoiceId,
  companyId,
  invoiceCode,
  onMailClick,
  disabled = false
}: InvoiceActionButtonsProps) {
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const handleDownloadPDF = async (type: "invoice" | "receipt" = "invoice") => {
    if (!invoiceId) {
      toast.error("No invoice ID available for download");
      return;
    }

    try {
      setDownloadingPdf(type);
      toast.loading(`Generating ${type} PDF...`, { id: `pdf-${type}` });

      let blob: Blob;
      if (type === "invoice") {
        blob = await generateInvoicePDF(invoiceId, companyId);
      } else {
        blob = await generateInvoiceReceiptPDF(invoiceId, companyId);
      }

      if (!blob || blob.size === 0) {
        throw new Error("Received empty or invalid PDF file");
      }

      const filename = `${type}-${invoiceCode || `inv-${invoiceId}`}.pdf`;
      downloadBlob(blob, filename);

      toast.success(
        `${type === "invoice" ? "Invoice" : "Receipt"} PDF downloaded successfully!`,
        { id: `pdf-${type}` }
      );
    } catch (error) {
      console.error(`Failed to generate ${type} PDF:`, error);

      let errorMessage = `Failed to generate ${type} PDF`;
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: `pdf-${type}` });
    } finally {
      setDownloadingPdf(null);
    }
  };

  const isDownloading = downloadingPdf !== null;
  const isDisabled = disabled || !invoiceId || isDownloading;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Download PDF Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isDisabled}
              className="h-9"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => handleDownloadPDF("invoice")}
              disabled={downloadingPdf !== null}
            >
              <FileText className="mr-2 h-4 w-4" />
              {downloadingPdf === "invoice" ? "Generating Invoice..." : "Download Invoice PDF"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDownloadPDF("receipt")}
              disabled={downloadingPdf !== null}
            >
              <Receipt className="mr-2 h-4 w-4" />
              {downloadingPdf === "receipt" ? "Generating Receipt..." : "Download Receipt PDF"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Send Email Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onMailClick}
              disabled={isDisabled}
              className="h-9"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send invoice via email</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}