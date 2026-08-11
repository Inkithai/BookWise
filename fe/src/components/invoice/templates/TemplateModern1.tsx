// components/invoice/templates/TemplateModern1.tsx - UPDATED WITH QUOTATION FIELDS
import { useSelector } from "react-redux";
import { RootState } from "@/slices/store";
import { Client, InvoiceItem, InvoiceType, formatCurrency, getCurrencySymbol, isQuotation } from "@/services/interface/invoice";
import { formatImageUrl } from "@/utils/image-url";
import { getResolvedActiveCompanyId, getResolvedContextType } from "@/utils/account-context";
import { formatCompanyAddress, getClientAddressLines } from "@/utils/format-address";

interface TemplateProps {
  invoiceData: {
    code: string;
    client: Client | null;
    type_id: number | null;
    currency?: string;
    invoice_date: string;
    due_date: string;
    items: InvoiceItem[];
    total_amount: number;
    total_discount: number;
    total_vat: number;
    final_amount: number;
    quotation_title?: string | null;  // ADDED: Quotation title field
    quotation_content?: string | null; // ADDED: Quotation content field
    bank_payment: boolean;
    payment_link: boolean;
    account_name?: string | null;
    account_number?: string | null;
    sort_code?: string | null;
    client_utr?: string; // CIS field: client UTR
  };
  invoiceTypes: InvoiceType[];
  formatDate: (date: string) => string;
  getInvoiceTypeName: () => string;
  tempUser?: any;
}

export function TemplateModern1({ invoiceData, invoiceTypes, formatDate, getInvoiceTypeName, tempUser }: TemplateProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const pdfThemeColor = useSelector((state: RootState) => state.invoice.pdfThemeColor);
  const sourceUser = tempUser ?? user ?? {};
  const contextType = getResolvedContextType(sourceUser);
  const activeCompanyId = getResolvedActiveCompanyId(sourceUser);
  const availableCompanies = Array.isArray(sourceUser?.available_companies) ? sourceUser.available_companies : [];
  const activeCompany = activeCompanyId
    ? availableCompanies.find((c: any) => Number(c?.id ?? c?.company_id) === activeCompanyId) ?? null
    : null;
  const rawCompanyLogo =
    sourceUser?.company?.company_logo ||
    activeCompany?.company_logo ||
    activeCompany?.company?.company_logo;
  const rawProfileImage = sourceUser?.profile_img || user?.profile_img;
  const companyLogo = contextType === "company"
    ? (formatImageUrl(rawCompanyLogo) || rawCompanyLogo || null)
    : (formatImageUrl(rawProfileImage) || rawProfileImage || null);
  const companyName = contextType === "company"
    ? (
      sourceUser?.company?.company_name ||
      activeCompany?.company_name ||
      activeCompany?.name
    )
    : `${sourceUser?.first_name || ""} ${sourceUser?.last_name || ""}`.trim();
  const companyAddress = contextType === "company"
    ? (formatCompanyAddress(sourceUser?.company) || formatCompanyAddress(activeCompany))
    : undefined;

  const bank = tempUser?.bank || user?.bank;

  const {
    code,
    client,
    invoice_date,
    due_date,
    items,
    total_amount,
    total_discount,
    total_vat,
    final_amount,
    quotation_title,  // ADDED: Destructure quotation title
    quotation_content, // ADDED: Destructure quotation content
    bank_payment,
  } = invoiceData;

  // Get currency from invoice data or first item or default to GBP
  const currency = invoiceData.currency || items[0]?.currency || 'LKR';
  const currencySymbol = getCurrencySymbol(currency);

  // Check if this is a quotation
  const isQuotationType = invoiceData.type_id ? isQuotation(
    { ...invoiceData, type_id: invoiceData.type_id } as any,
    invoiceTypes
  ) : false;
  const clientAddressLines = getClientAddressLines(client);

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      {/* Modern Header with Solid Color */}
      <div className="mb-4 rounded-lg p-4 shadow-lg"
        style={{ backgroundColor: pdfThemeColor }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName || "Logo"} className="w-10 h-10 object-contain bg-white rounded-md p-1" />
            ) : (
              <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
                <span className="font-bold text-xs" style={{ color: pdfThemeColor }}>{companyName?.charAt(0) || "C"}</span>
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-white">
                {isQuotationType ? "QUOTATION" : "INVOICE"}
              </h1>
              <p className="text-white text-xs opacity-80">{companyName || "Your Company"}</p>
              <p className="text-white text-xs opacity-80 mt-1">Currency: {currency} ({currencySymbol})</p>
              {companyAddress && (
                <div className="text-white text-xs opacity-60 mt-1">
                  {companyAddress.split(",").map((line: string, i: number) => (
                    <div key={i}>{line.trim()}</div>
                  ))}
                </div>
              )}
              {bank && bank_payment && (
                <div className="text-white text-xs opacity-60 mt-1">
                  <div className="font-semibold">Account details</div>
                  <div>Account Name: {bank?.account_name}</div>
                  <div>Sort Code: {bank?.sort_code}</div>
                  <div>Account Number: {bank?.account_number}</div>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-white">{code}</p>
            <p className="text-white text-xs opacity-80">{getInvoiceTypeName()}</p>
          </div>
        </div>
      </div>

      {/* Quotation Information - Only show for Quotation type */}
      {isQuotationType && quotation_title && (
        <div className="mb-4 p-3 rounded-md bg-gradient-to-r from-teal-50 to-white border-l-4"
          style={{ borderLeftColor: pdfThemeColor }}>
          <h3 className="text-xs font-bold text-teal-700 mb-1">
            {quotation_title}
          </h3>
          {quotation_content && (
            <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
              {quotation_content}
            </div>
          )}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-md p-3 shadow-md border-l-4" style={{ borderLeftColor: pdfThemeColor }}>
          <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Invoice To</h3>
          <p className="font-bold text-gray-800 text-xs mb-1">{client?.name || "No client"}</p>
          <p className="text-xs text-gray-600">{client?.email || ""}</p>
          {client && (
            <div className="text-xs text-gray-600 mt-1">
              {clientAddressLines.length > 0 && (
                <>
                  <div>Address: {clientAddressLines[0]}</div>
                  {clientAddressLines.slice(1).map((line, idx) => (
                    <div key={`client-address-${idx}`}>{line}</div>
                  ))}
                </>
              )}
            </div>
          )}
          {invoiceData.client_utr && <p className="text-xs text-gray-600">UTR: {invoiceData.client_utr}</p>}
        </div>
        <div className="bg-white rounded-md p-3 shadow-md border-l-4" style={{ borderLeftColor: pdfThemeColor }}>
          <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
            {isQuotationType ? "Quotation Details" : "Details"}
          </h3>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">{isQuotationType ? "Quotation:" : "Invoice:"}</span>
              <span className="font-semibold text-gray-800">{formatDate(invoice_date)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Due:</span>
              <span className="font-semibold text-gray-800">{formatDate(due_date)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Currency:</span>
              <span className="font-semibold text-gray-800">{currency} ({currencySymbol})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Items Table */}
      <div className="bg-white rounded-md shadow-md overflow-hidden mb-4">
        <div className="px-3 py-1.5" style={{ backgroundColor: pdfThemeColor }}>
          <h2 className="font-bold text-white text-xs">
            Line Items • Currency: {currency} ({currencySymbol})
          </h2>
        </div>
        {items.length > 0 ? (
          <div className="p-3">
            <div className="space-y-1.5">
              {items.map((item, index) => (
                <div key={item.id || index} className="flex justify-between items-start p-2 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-xs">{item.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                    <div className="flex gap-2 mt-0.5 text-xs text-gray-600">
                      <span>{formatCurrency(item.price, currency)} × {item.quantity || 1}</span>
                      {item.discount ? <span className="text-red-600">-{item.discount}% DISCOUNT</span> : null}
                      {item.vat ? <span className="text-green-600">+{item.vat}% VAT</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xs text-gray-800">{formatCurrency(item.total, currency)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-3 pt-3 border-t-2 space-y-1" style={{ borderColor: pdfThemeColor }}>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold text-gray-800">{formatCurrency(total_amount, currency)}</span>
              </div>
              {total_discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(total_discount, currency)}</span>
                </div>
              )}
              {total_vat > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">VAT:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(total_vat, currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: pdfThemeColor }}>
                <span className="font-bold text-xs text-gray-800">
                  {isQuotationType ? "Total Quotation:" : "Total:"}
                </span>
                <span className="font-bold text-sm" style={{ color: pdfThemeColor }}>{formatCurrency(final_amount, currency)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-gray-200">
                <span className="text-xs text-gray-500">Currency:</span>
                <span className="text-xs font-semibold text-gray-700">{currency} ({currencySymbol})</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-xs">No items added</p>
            <p className="text-xs text-gray-500 mt-1">Currency: {currency} ({currencySymbol})</p>
          </div>
        )}
      </div>

      {/* Modern Footer */}
      {items.length > 0 && (
        <div className="text-center text-xs text-gray-600">
          <p className="font-medium">
            {isQuotationType ? "Thank you for your consideration!" : "Thank you for choosing us!"}
          </p>
          <p className="text-xs mt-0.5">Generated on {new Date().toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}