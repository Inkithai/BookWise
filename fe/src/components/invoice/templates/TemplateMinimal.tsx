// components/invoice/templates/TemplateMinimal.tsx - UPDATED WITH QUOTATION FIELDS
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

export function TemplateMinimal({ invoiceData, invoiceTypes, formatDate, getInvoiceTypeName, tempUser }: TemplateProps) {
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
    <div className="bg-white p-8">
      {/* Minimal Header with Dynamic Color */}
      <div className="flex justify-between items-start mb-12 pb-6 border-b border-gray-300">
        <div>
          {companyLogo ? (
            <img src={companyLogo} alt={companyName || "Logo"} className="h-16 w-auto object-contain mb-2" />
          ) : (
            <h2 className="text-2xl font-light mb-2" style={{ color: pdfThemeColor }}>{companyName || "COMPANY"}</h2>
          )}
          <p className="text-xs uppercase tracking-widest" style={{ color: pdfThemeColor }}>
            {isQuotationType ? "Quotation" : "Invoice"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Currency: {currency} ({currencySymbol})</p>
          {companyAddress && (
            <div className="text-xs text-gray-400 mt-2">
              {companyAddress.split(",").map((line: string, i: number) => (
                <div key={i}>{line.trim()}</div>
              ))}
            </div>
          )}
          {bank && bank_payment && (
            <div className="text-xs text-gray-400 mt-2">
              <div className="font-semibold text-gray-600">Account details</div>
              <div>Account Name: {bank?.account_name}</div>
              <div>Sort Code: {bank?.sort_code}</div>
              <div>Account Number: {bank?.account_number}</div>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-4xl font-extralight" style={{ color: pdfThemeColor }}>{code}</p>
          <p className="text-xs text-gray-600 mt-1">{getInvoiceTypeName()}</p>
        </div>
      </div>

      {/* Quotation Information - Only show for Quotation type */}
      {isQuotationType && quotation_title && (
        <div className="mb-8 p-4 border-l-4" style={{ borderLeftColor: pdfThemeColor, backgroundColor: `${pdfThemeColor}10` }}>
          <h3 className="text-base font-semibold text-gray-800 mb-2">
            {quotation_title}
          </h3>
          {quotation_content && (
            <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
              {quotation_content}
            </div>
          )}
        </div>
      )}

      {/* Minimal Info Grid */}
      <div className="grid grid-cols-3 gap-8 mb-12 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: pdfThemeColor }}>Invoice To</p>
          <p className="font-medium text-gray-900">{client?.name || "No client"}</p>
          {client?.email && <p className="text-xs text-gray-600 mt-1">{client.email}</p>}
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
          {invoiceData.client_utr && <p className="text-xs text-gray-600 mt-1">UTR: {invoiceData.client_utr}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: pdfThemeColor }}>
            {isQuotationType ? "Quotation Dates" : "Dates"}
          </p>
          <p className="font-medium text-gray-900">{formatDate(invoice_date)}</p>
          <p className="text-xs text-gray-600 mt-1">Due: {formatDate(due_date)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: pdfThemeColor }}>Currency</p>
          <p className="font-medium text-gray-900">{currency} ({currencySymbol})</p>
          <p className="text-xs text-gray-600 mt-1">All amounts in {currency}</p>
        </div>
      </div>

      {/* Minimal Items List */}
      {items.length > 0 ? (
        <div className="mb-12">
          <div className="pb-2 mb-4 border-b border-gray-300">
            <div className="grid grid-cols-12 gap-4 text-xs uppercase tracking-wider" style={{ color: pdfThemeColor }}>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-1 text-right">Qty</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id || index} className="grid grid-cols-12 gap-4 text-sm py-2">
                <div className="col-span-6">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                </div>
                <div className="col-span-2 text-right text-gray-700">{formatCurrency(item.price, currency)}</div>
                <div className="col-span-1 text-right text-gray-700">{item.quantity || 1}</div>
                <div className="col-span-3 text-right font-medium text-gray-900">{formatCurrency(item.total, currency)}</div>
              </div>
            ))}
          </div>

          {/* Minimal Totals */}
          <div className="mt-8 pt-6 border-t border-gray-300">
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(total_amount, currency)}</span>
                </div>
                {total_discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-red-600">-{formatCurrency(total_discount, currency)}</span>
                  </div>
                )}
                {total_vat > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT</span>
                    <span className="text-gray-900">{formatCurrency(total_vat, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t text-base font-medium" style={{ borderColor: pdfThemeColor }}>
                  <span style={{ color: pdfThemeColor }}>
                    {isQuotationType ? "Total Quotation" : "Total"}
                  </span>
                  <span style={{ color: pdfThemeColor }}>{formatCurrency(final_amount, currency)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                  <p>Currency: {currency} ({currencySymbol})</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-gray-400 text-sm">No items</p>
          <p className="text-xs text-gray-500 mt-1">Currency: {currency} ({currencySymbol})</p>
        </div>
      )}

      {/* Minimal Footer */}
      {items.length > 0 && (
        <div className="mt-12 pt-6 border-t border-gray-300 text-center">
          <p className="text-xs" style={{ color: pdfThemeColor }}>
            {isQuotationType ? "Thank you for your consideration!" : "Thank you!"}
          </p>
          <p className="text-xs text-gray-500 mt-2"> Generated on {new Date().toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}