// components/invoice/PDFPreview.tsx - UPDATED WITH QUOTATION FIELDS
import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/slices/store";
import { Client, InvoiceItem, InvoiceType, InvoiceStatus } from "@/services/interface/invoice";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ZoomIn, ZoomOut, RotateCcw, Info } from "lucide-react";
import { TemplateClassic } from "./templates/TemplateClassic";
import { TemplateModern } from "./templates/TemplateModern";
import { TemplateMinimal } from "./templates/TemplateMinimal";
import { TemplateModern1 } from "./templates/TemplateModern1";

// components/invoice/PDFPreview.tsx
// ── Only the interface section is modified — all other code is unchanged ──

interface PDFPreviewProps {
  invoiceData: {
    code: string;
    client: Client | null;
    type_id: number | null;
    currency?: string;
    invoice_date: string;
    due_date: string | null;
    items: InvoiceItem[];
    total_amount: number;
    total_discount: number;
    total_vat: number;
    final_amount: number;
    status?: InvoiceStatus;
    quotation_title?: string | null;
    quotation_content?: string | null;
    bank_payment: boolean;
    payment_link: boolean;
    account_name?: string | null;
    account_number?: string | null;
    sort_code?: string | null;
    pdf_field_visibility?: {
      project_reference?: boolean;
      quantity?: boolean;
      price?: boolean;
      discount?: boolean;
      vat?: boolean;
      total?: boolean;
      custom_fields?: Record<string, boolean>;
    };
    // ── CIS additions ───────────────────────────────────────────────────────
    cis_tax?: number;
    cis_net?: number;
    client_utr?: string;       // ← NEW
    cis_tax_value?: number;    // ← NEW
  };
  invoiceTypes?: InvoiceType[];
  isViewMode?: boolean;
  tempUser: any;
}


// Comment out template options
// const TEMPLATES = [
//   { value: 'classic', label: 'Classic', description: 'Traditional invoice with company header' },
//   { value: 'modern', label: 'Modern', description: 'Contemporary style with emphasis on branding' },
//   { value: 'minimal', label: 'Minimal', description: 'Clean and simple layout' },
//   { value: 'modern1', label: 'Modern 1', description: 'Gradient design with cards' },
// ];

export function PDFPreview({ invoiceData, invoiceTypes = [], tempUser }: PDFPreviewProps) {
  const selectedPdfTemplate = useSelector((state: RootState) => state.invoice.selectedPdfTemplate);

  const [zoomLevel, setZoomLevel] = useState(75);

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const resetZoom = () => setZoomLevel(75);

  const getInvoiceTypeName = () => {
    if (!invoiceData.type_id || invoiceTypes.length === 0) return "Invoice";
    const type = invoiceTypes.find(t => t.id === invoiceData.type_id);
    return type?.name || "Invoice";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      // return new Date(dateString).toLocaleDateString('en-US', {
      //   year: 'numeric',
      //   month: 'long',
      //   day: 'numeric'
      // });
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // invalid date check

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const renderTemplate = () => {
    const currency = invoiceData.currency || "LKR";
    const templateProps = {
      invoiceData: {
        ...invoiceData,
        currency,
      },
      invoiceTypes,
      formatDate,
      getInvoiceTypeName,
      tempUser,
    };

    const modernInvoiceData = {
      code: invoiceData.code,
      client: invoiceData.client,
      type_id: invoiceData.type_id,
      currency,
      invoice_date: invoiceData.invoice_date,
      due_date: invoiceData.due_date ?? "",
      items: invoiceData.items,
      total_amount: invoiceData.total_amount,
      total_discount: invoiceData.total_discount,
      total_vat: invoiceData.total_vat,
      final_amount: invoiceData.final_amount,
      quotation_title: invoiceData.quotation_title ?? null,
      quotation_content: invoiceData.quotation_content ?? null,
      bank_payment: invoiceData.bank_payment ?? false,
      payment_link: invoiceData.payment_link ?? false,
      account_name: invoiceData.account_name ?? null,
      account_number: invoiceData.account_number ?? null,
      sort_code: invoiceData.sort_code ?? null,
      client_utr: invoiceData.client_utr,
    };
    const modernProps = {
      invoiceData: modernInvoiceData,
      invoiceTypes,
      formatDate,
      getInvoiceTypeName,
    };

    switch (selectedPdfTemplate) {
      case "modern":
        return <TemplateModern {...modernProps} />;
      case "minimal":
        return <TemplateMinimal {...modernProps} />;
      case "modern1":
        return <TemplateModern1 {...modernProps} />;
      case "classic":
      default:
        return <TemplateClassic {...templateProps} />;
    }
  };

  return (
    <TooltipProvider>
      <div className="w-full h-full bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden">
        {/* Controls Header */}
        <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomOut}
                  disabled={zoomLevel <= 50}
                  className="h-7 w-7 p-0"
                  type="button"
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom out</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-xs font-medium min-w-[45px] text-center dark:text-white">{zoomLevel}%</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={zoomIn}
                  disabled={zoomLevel >= 120}
                  className="h-7 w-7 p-0"
                  type="button"
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom in</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetZoom}
                  className="h-7 w-7 p-0"
                  type="button"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset to 75%</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Preview</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-gray-500 dark:text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Live preview of your invoice</p>
                  <p className="text-xs mt-1 capitalize">
                    Template: {selectedPdfTemplate || "classic"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="h-[calc(100%-40px)] overflow-auto bg-gray-100 dark:bg-gray-950">
          <div
            className="p-4 min-h-full"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
              width: `${100 * (100 / zoomLevel)}%`,
              height: `${100 * (100 / zoomLevel)}%`
            }}
          >
            <div className="max-w-4xl mx-auto shadow-2xl">
              {renderTemplate()}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}