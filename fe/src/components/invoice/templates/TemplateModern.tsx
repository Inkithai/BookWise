// components/invoice/templates/TemplateModern.tsx - UPDATED WITH QUOTATION FIELDS
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

export function TemplateModern({ invoiceData, invoiceTypes, formatDate, getInvoiceTypeName, tempUser }: TemplateProps) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">

        {/* Modern Card */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-slate-200">

          {/* Accent Strip with Dynamic Color */}
          <div className="h-1" style={{ backgroundColor: pdfThemeColor }}></div>

          <div className="p-8">
            {/* Minimal Header */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {companyLogo ? (
                  <div className="w-10 h-10 rounded border overflow-hidden" style={{ borderColor: pdfThemeColor }}>
                    <img src={companyLogo} alt={companyName || "Logo"} className="w-full h-full object-contain p-1" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: pdfThemeColor }}>
                    <span className="text-white font-bold text-sm">{companyName?.charAt(0) || "C"}</span>
                  </div>
                )}
                <div>
                  <h1 className="text-sm font-bold" style={{ color: pdfThemeColor }}>{companyName || "Your Company"}</h1>
                  <p className="text-xs text-slate-500">
                    {isQuotationType ? "Quotation" : "Invoice"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Currency: {currency} ({currencySymbol})</p>
                  {companyAddress && (
                    <div className="text-xs text-slate-400 mt-1">
                      {companyAddress.split(",").map((line: string, i: number) => (
                        <div key={i}>{line.trim()}</div>
                      ))}
                    </div>
                  )}
                  {bank && bank_payment && (
                    <div className="text-xs text-slate-400 mt-2">
                      <div className="font-semibold text-slate-600">Account details</div>
                      <div>Account Name: {bank?.account_name}</div>
                      <div>Sort Code: {bank?.sort_code}</div>
                      <div>Account Number: {bank?.account_number}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">{getInvoiceTypeName()}</p>
                <p className="text-base font-bold" style={{ color: pdfThemeColor }}>{code}</p>
              </div>
            </div>

            {/* Quotation Information - Only show for Quotation type */}
            {isQuotationType && quotation_title && (
              <div className="mb-6 p-4 rounded-lg border bg-gradient-to-r from-teal-50 to-white" style={{ borderColor: `${pdfThemeColor}40` }}>
                <h3 className="text-sm font-bold text-teal-700 mb-2">
                  {quotation_title}
                </h3>
                {quotation_content && (
                  <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {quotation_content}
                  </div>
                )}
              </div>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-lg border" style={{ borderColor: `${pdfThemeColor}30` }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: pdfThemeColor }}>Invoice To</p>
                <p className="text-sm font-bold text-black mb-0.5">{client?.name || "No client"}</p>
                {client?.email && <p className="text-xs text-slate-600">{client.email}</p>}
                {client && (
                  <div className="text-xs text-slate-600 mt-1">
                    {clientAddressLines.length > 0 && (
                      <>
                        <p>Address: {clientAddressLines[0]}</p>
                        {clientAddressLines.slice(1).map((line, idx) => (
                          <p key={`client-address-${idx}`}>{line}</p>
                        ))}
                      </>
                    )}
                  </div>
                )}
                {invoiceData.client_utr && <p className="text-xs text-slate-600">UTR: {invoiceData.client_utr}</p>}
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-lg border" style={{ borderColor: `${pdfThemeColor}30` }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: pdfThemeColor }}>
                  {isQuotationType ? "Quotation Details" : "Invoice Details"}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">{isQuotationType ? "Quotation Date" : "Issue Date"}</span>
                    <span className="font-semibold text-black">{formatDate(invoice_date)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Due Date</span>
                    <span className="font-semibold text-black">{formatDate(due_date)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Currency</span>
                    <span className="font-semibold text-black">{currency} ({currencySymbol})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Table */}
            {items.length > 0 ? (
              <div className="mb-8">
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200" style={{ backgroundColor: `${pdfThemeColor}15` }}>
                          <th className="text-left font-semibold px-3 py-2.5" style={{ color: pdfThemeColor }}>Item</th>
                          <th className="text-right font-semibold px-3 py-2.5 w-12" style={{ color: pdfThemeColor }}>Qty</th>
                          <th className="text-right font-semibold px-3 py-2.5 w-20" style={{ color: pdfThemeColor }}>Price</th>
                          <th className="text-right font-semibold px-3 py-2.5 w-14" style={{ color: pdfThemeColor }}>Disc</th>
                          <th className="text-right font-semibold px-3 py-2.5 w-14" style={{ color: pdfThemeColor }}>VAT</th>
                          <th className="text-right font-semibold px-3 py-2.5 w-24" style={{ color: pdfThemeColor }}>Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {items.map((item, index) => (
                          <tr key={item.id || index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-black">{item.name}</p>
                              <p className="text-xs text-slate-500 capitalize mt-0.5">{item.type}</p>
                            </td>
                            <td className="text-right px-3 py-2.5 text-slate-700 font-medium text-black">{item.quantity || 1}</td>
                            <td className="text-right px-3 py-2.5 text-slate-600">{formatCurrency(item.price, currency)}</td>
                            <td className="text-right px-3 py-2.5">
                              {item.discount ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-50 text-red-600">
                                  {item.discount}%
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="text-right px-3 py-2.5">
                              {item.vat ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-green-50 text-green-600">
                                  {item.vat}%
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="text-right px-3 py-2.5 font-bold text-black">{formatCurrency(item.total, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Modern Totals */}
                <div className="mt-6 flex justify-end">
                  <div className="w-64 bg-gradient-to-br from-slate-50 to-white rounded-lg border p-4 space-y-2" style={{ borderColor: `${pdfThemeColor}40` }}>
                    <div className="flex justify-between text-xs pb-2 border-b border-slate-200">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-semibold text-black">{formatCurrency(total_amount, currency)}</span>
                    </div>
                    {total_discount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Discount</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(total_discount, currency)}</span>
                      </div>
                    )}
                    {total_vat > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">VAT</span>
                        <span className="font-semibold text-green-600">+{formatCurrency(total_vat, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t-2" style={{ borderColor: pdfThemeColor }}>
                      <span className="font-bold" style={{ color: pdfThemeColor }}>
                        {isQuotationType ? "Total Quotation" : "Total"}
                      </span>
                      <span className="font-bold" style={{ color: pdfThemeColor }}>{formatCurrency(final_amount, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center rounded-lg border-2 border-dashed border-slate-200">
                <p className="text-xs text-slate-500">No items added</p>
              </div>
            )}

            {/* Minimal Footer */}
            {items.length > 0 && (
              <div className="pt-6 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-500">
                  {isQuotationType ? "Thank you for your consideration!" : "Thank you for your business!"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}