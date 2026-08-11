// components/invoice/templates/TemplateClassic.tsx
import { useSelector } from "react-redux";
import { RootState } from "@/slices/store";
import {
  Client,
  InvoiceItem,
  InvoiceType,
  formatCurrency,
  getCurrencySymbol,
  isQuotation,
} from "@/services/interface/invoice";
import { useEffect, useState } from "react";
import { AdminUser } from "@/services/interface/AdminUser";
import { formatImageUrl } from "@/utils/image-url";
import { getResolvedContextType, getResolvedActiveCompanyId } from "@/utils/account-context";
import { formatCompanyAddress, getClientAddressLines } from "@/utils/format-address";

// ── Constant kept local so the template is self-contained ────────────────────
const CIS_RATE = 0.20;

interface TemplateProps {
  invoiceData: {
    code: string;
    client: Client | null;
    type_id: number | null;
    currency?: string;
    invoice_date: string;
    due_date: string | null;
    items: InvoiceItem[];
    final_amount: number;

    // Quotation fields
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

    // ── CIS fields (present only when CIS invoice type is selected) ──────────
    cis_tax?: number;
    cis_net?: number;
    client_utr?: string;      // ← NEW
    cis_tax_value?: number;   // ← NEW
  };
  invoiceTypes: InvoiceType[];
  formatDate: (date: string) => string;
  getInvoiceTypeName: () => string;
  tempUser: any;
}

export function TemplateClassic({
  invoiceData,
  invoiceTypes,
  formatDate,
  getInvoiceTypeName,
  tempUser,
}: TemplateProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const pdfThemeColor = useSelector(
    (state: RootState) => state.invoice.pdfThemeColor
  );

  const activeThemeColor = tempUser?.invoice_theme_color || user?.invoice_theme_color || pdfThemeColor;
  const accentColor = activeThemeColor;

  const sourceUser = tempUser ?? user ?? {};
  const contextType = getResolvedContextType(sourceUser);
  const activeCompanyId = getResolvedActiveCompanyId(sourceUser);
  const availableCompanies = Array.isArray(sourceUser?.available_companies) ? sourceUser.available_companies : [];
  const activeCompany = activeCompanyId
    ? availableCompanies.find((c: any) => Number(c?.id ?? c?.company_id) === activeCompanyId) ?? null
    : null;

  const rawCompanyLogo = sourceUser?.company?.company_logo || activeCompany?.company_logo || activeCompany?.company?.company_logo;
  const rawProfileImage = sourceUser?.profile_img || user?.profile_img;

  const brandingImage = contextType === "company"
    ? (formatImageUrl(rawCompanyLogo) || rawCompanyLogo || null)
    : (formatImageUrl(rawProfileImage) || rawProfileImage || null);

  const senderDisplayName = contextType === "company"
    ? (sourceUser?.company?.company_name || activeCompany?.company_name || activeCompany?.name)
    : `${sourceUser?.first_name || ""} ${sourceUser?.last_name || ""}`.trim();

  const personalDisplayName = `${sourceUser?.first_name || ""} ${sourceUser?.last_name || ""}`.trim();

  // const [tempUser, setCurrentUser] = useState<AdminUser | null>(null);

  // useEffect(() => {
  //   const loadUserData = async () => {
  //     try {
  //       const response = await getCurrentUser();
  //       const userData: AdminUser | null = response.data || response;

  //       if (!userData) return;

  //       setCurrentUser(userData);
  //     } catch (error) {
  //       console.error('❌ Failed to load user data:', error);
  //     }
  //   };

  //   loadUserData();
  // }, []);

  const company = tempUser?.company || user?.company;
  const bank = tempUser?.bank || user?.bank;
  const accountType = (tempUser?.account_type || user?.account_type || "").toString().toLowerCase();
  const showCompanyBranding = accountType !== "personal";
  const items = invoiceData.items || [];
  const customFieldColumns = Array.from(
    new Set(
      items.flatMap((item) =>
        (Array.isArray(item.custom_fields) ? item.custom_fields : [])
          .map((field) => field.key?.trim())
          .filter((key): key is string => Boolean(key))
      )
    )
  );
  const showCustomFieldsAsColumns =
    customFieldColumns.length > 0 && customFieldColumns.length <= 2;
  const showCustomFieldsUnderDescription = customFieldColumns.length > 2;
  const toWordCase = (label: string): string =>
    label
      .replace(/[_-]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  const fieldVisibility = invoiceData.pdf_field_visibility || {};
  const showProjectReference = fieldVisibility.project_reference !== false;
  const showQuantity = fieldVisibility.quantity !== false;
  const showPrice = fieldVisibility.price !== false;
  const showDiscount = fieldVisibility.discount !== false;
  const showVat = fieldVisibility.vat !== false;
  const showTotal = fieldVisibility.total !== false;
  const visibleCustomFieldColumns = showCustomFieldsAsColumns
    ? customFieldColumns.filter((key) => fieldVisibility.custom_fields?.[key] !== false)
    : [];
  const visibleCustomFieldKeysUnderDescription = showCustomFieldsUnderDescription
    ? customFieldColumns.filter((key) => fieldVisibility.custom_fields?.[key] !== false)
    : [];
  const charges = tempUser?.stripe;

  const currency = invoiceData.currency || items[0]?.currency || "LKR";
  const currencySymbol = getCurrencySymbol(currency);

  const isQuotationType = invoiceData.type_id
    ? isQuotation(
      { ...invoiceData, type_id: invoiceData.type_id } as any,
      invoiceTypes
    )
    : false;
  const clientAddressLines = getClientAddressLines(invoiceData.client);

  // ── CIS: use pre-calculated values passed from InvoiceForm when present ────
  const isCIS =
    typeof invoiceData.cis_tax === "number" &&
    typeof invoiceData.cis_net === "number";

  const cisTax = isCIS
    ? (invoiceData.cis_tax as number)
    : parseFloat((invoiceData.final_amount * CIS_RATE).toFixed(2));

  const cisNet = isCIS
    ? (invoiceData.cis_net as number)
    : parseFloat((invoiceData.final_amount - cisTax).toFixed(2));

  // ── Resolve the actual CIS percentage to display ─────────────────────────
  // Uses cis_tax_value if provided and > 0, otherwise falls back to CIS_RATE
  const cisDisplayRate =
    invoiceData.cis_tax_value && invoiceData.cis_tax_value > 0
      ? invoiceData.cis_tax_value
      : Math.round(CIS_RATE * 100);

  // For CIS invoices, show the document title as "INVOICE" (QA requirement)
  const documentTitle = isCIS ? "INVOICE" : getInvoiceTypeName().toUpperCase();

  return (
    <>
      {/* ========================= */}
      {/* PAGE 1 — INVOICE          */}
      {/* ========================= */}
      <div
        className="max-w-[740px] mx-auto p-8 text-black text-sm bg-white flex flex-col shadow-lg mb-8"
        style={{
          minHeight: "100vh",
          pageBreakAfter: "always",
          border: "1px solid #ccc",
        }}
      >
        {/* PAGE NUMBER LABEL */}
        <div className="text-right text-xs text-gray-400 mb-2">Page 1</div>

        {/* MAIN CONTENT */}
        <div>
          {/* TITLE */}
          <h1
            className="text-[42px] font-extrabold mb-4"
            style={{ color: accentColor }}
          >
            {documentTitle}
          </h1>

          {/* COMPANY DETAILS & LOGO */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1 max-w-[60%]">
              <div className="leading-tight mb-4">
                {senderDisplayName && <strong className="text-base">{senderDisplayName}</strong>}
                {(() => {
                  const formattedAddress = formatCompanyAddress(company);
                  return formattedAddress &&
                    formattedAddress
                      .split(",")
                      .map((line: any, i: any) => (
                        <div key={i} className="text-xs">
                          {line.trim()}
                        </div>
                      ));
                })()}
              </div>

              {bank && invoiceData.bank_payment && (
                <div className="leading-tight">
                  <strong>Account details</strong>
                  <div>Account Name: {bank?.account_name}</div>
                  <div>Sort Code: {bank?.sort_code}</div>
                  <div>Account Number: {bank?.account_number}</div>
                </div>
              )}
            </div>

            {brandingImage && (
              <div className="flex-shrink-0 text-right">
                <img
                  src={brandingImage}
                  alt={showCompanyBranding ? (company?.company_name || "Company Logo") : (personalDisplayName || "Profile Image")}
                  className="w-[100px] h-[100px] object-contain ml-auto"
                  style={{ display: "block" }}
                />
              </div>
            )}
          </div>

          {/* INVOICE TO + META */}
          <div className="flex justify-between mb-8">
            <div>
              <div
                className="font-bold mb-1"
                style={{ color: activeThemeColor }}
              >
                INVOICE TO
              </div>
              <div>Email: {invoiceData.client?.email}</div>
              <div>Company: {invoiceData.client?.name}</div>
              {clientAddressLines.length > 0 && (
                <div>
                  <div>Address: {clientAddressLines[0]}</div>
                  {clientAddressLines.slice(1).map((line, idx) => (
                    <div key={`client-address-${idx}`}>{line}</div>
                  ))}
                </div>
              )}
              {invoiceData.client_utr && <div>UTR: {invoiceData.client_utr}</div>}
            </div>

            <div className="text-right">
              <div>
                <strong style={{ color: accentColor }}>
                  {isQuotationType ? "QUOTATION #" : "INVOICE #"}
                </strong>{" "}
                {invoiceData.code}
              </div>
              <div>
                <strong style={{ color: accentColor }}>
                  {isQuotationType ? "QUOTATION DATE" : "INVOICE DATE"}
                </strong>{" "}
                {formatDate(invoiceData.invoice_date)}
              </div>
              {invoiceData.due_date && (
                <div>
                  <strong style={{ color: accentColor }}>DUE DATE</strong>{" "}
                  {formatDate(invoiceData.due_date)}
                </div>
              )}
            </div>
          </div>

          {/* ── ITEMS TABLE ──────────────────────────────────────────────────
               CIS invoices show only: Description | Project Ref | Amount
               All other invoice types keep the original 6-column layout.
          ─────────────────────────────────────────────────────────────────── */}
          {isCIS ? (
            /* ── CIS ITEMS TABLE (3 columns) ─────────────────────────────── */
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr
                  className="border-b-2 text-xs"
                  style={{ borderColor: accentColor }}
                >
                  {showProjectReference && <th className="text-left py-2">{toWordCase("project reference")}</th>}
                  <th className="text-left py-2">{toWordCase("description")}</th>
                  {showCustomFieldsAsColumns &&
                    visibleCustomFieldColumns.map((columnKey) => (
                      <th key={columnKey} className="text-left py-2">
                        {toWordCase(columnKey)}
                      </th>
                    ))}
                  {showTotal && <th className="text-right py-2">{toWordCase("amount claimed")}</th>}
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      {showProjectReference && (
                        <td className="py-2 text-gray-600">
                          {item.project_reference || "-"}
                        </td>
                      )}
                      <td className="py-2">
                        <div>{item.name}</div>
                        {showCustomFieldsUnderDescription &&
                          Array.isArray(item.custom_fields) &&
                          item.custom_fields.length > 0 && (
                            <div className="space-y-0.5 text-xs text-gray-700 mt-1">
                              {item.custom_fields
                                .filter(
                                  (field) =>
                                    field.key?.trim() &&
                                    visibleCustomFieldKeysUnderDescription.includes(field.key.trim())
                                )
                                .map((field, fieldIndex) => (
                                  <div key={`${field.key}-${fieldIndex}`}>
                                    <span className="font-medium">{field.key}:</span>{" "}
                                    {field.value || "-"}
                                  </div>
                                ))}
                            </div>
                          )}
                      </td>

                      {showCustomFieldsAsColumns &&
                        visibleCustomFieldColumns.map((columnKey) => {
                          const value =
                            (Array.isArray(item.custom_fields) ? item.custom_fields : []).find(
                              (field) => field.key?.trim() === columnKey
                            )?.value || "-";
                          return (
                            <td key={`${item.id || idx}-${columnKey}`} className="py-2 text-xs text-gray-800">
                              {value}
                            </td>
                          );
                        })}

                      {showTotal && (
                        <td className="text-right py-2 max-w-[140px]">
                          <span
                            className="block truncate"
                            title={formatCurrency(
                              item.total || item.total_amount || 0,
                              currency
                            )}
                          >
                            {formatCurrency(
                              item.total || item.total_amount || 0,
                              currency
                            )}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={(showProjectReference ? 1 : 0) + 1 + (showCustomFieldsAsColumns ? visibleCustomFieldColumns.length : 0) + (showTotal ? 1 : 0)} className="text-center py-6">
                      No projects
                    </td>
                  </tr>
                )}
              </tbody>
              {showTotal && (
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={(showProjectReference ? 1 : 0) + 1 + (showCustomFieldsAsColumns ? visibleCustomFieldColumns.length : 0)} className="text-right pr-2">
                      TOTAL
                    </td>
                    <td
                      className="text-right text-lg max-w-[180px]"
                      style={{ color: pdfThemeColor }}
                    >
                      <span
                        className="block truncate"
                        title={formatCurrency(invoiceData.final_amount, currency)}
                      >
                        {formatCurrency(invoiceData.final_amount, currency)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            /* ── STANDARD ITEMS TABLE (original 6-column layout) ─────────── */
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr
                  className="border-b-2 text-xs"
                  style={{ borderColor: accentColor }}
                >
                  <th className="text-left py-2">{toWordCase("description")}</th>
                  {showCustomFieldsAsColumns &&
                    visibleCustomFieldColumns.map((columnKey) => (
                      <th key={columnKey} className="text-left py-2">
                        {toWordCase(columnKey)}
                      </th>
                    ))}
                  {showQuantity && <th className="text-center">{toWordCase("qty")}</th>}
                  {showPrice && <th className="text-right">{toWordCase("price")}</th>}
                  {showDiscount && <th className="text-right">{toWordCase("discount")}</th>}
                  {showVat && <th className="text-right">{toWordCase("vat")}</th>}
                  {showTotal && <th className="text-right">{toWordCase("amount")}</th>}
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2">
                        <div>{item.name}</div>
                        {item.type && (
                          <div className="text-xs text-gray-500 capitalize">
                            {item.type}
                          </div>
                        )}
                        {showCustomFieldsUnderDescription &&
                          Array.isArray(item.custom_fields) &&
                          item.custom_fields.length > 0 && (
                            <div className="space-y-0.5 text-xs text-gray-700 mt-1">
                              {item.custom_fields
                                .filter(
                                  (field) =>
                                    field.key?.trim() &&
                                    visibleCustomFieldKeysUnderDescription.includes(field.key.trim())
                                )
                                .map((field, fieldIndex) => (
                                  <div key={`${field.key}-${fieldIndex}`}>
                                    <span className="font-medium">{field.key}:</span>{" "}
                                    {field.value || "-"}
                                  </div>
                                ))}
                            </div>
                          )}
                      </td>
                      {showCustomFieldsAsColumns &&
                        visibleCustomFieldColumns.map((columnKey) => {
                          const value =
                            (Array.isArray(item.custom_fields) ? item.custom_fields : []).find(
                              (field) => field.key?.trim() === columnKey
                            )?.value || "-";
                          return (
                            <td key={`${item.id || idx}-${columnKey}`} className="py-2 text-xs text-gray-800">
                              {value}
                            </td>
                          );
                        })}
                      {showQuantity && (
                        <td className="text-center">
                          {item.type?.toLowerCase() === "service"
                            ? "-"
                            : item.quantity || "-"}
                        </td>
                      )}
                      {showPrice && (
                        <td className="text-right max-w-[120px]">
                          <span
                            className="block truncate"
                            title={formatCurrency(item.price, currency)}
                          >
                            {formatCurrency(item.price, currency)}
                          </span>
                        </td>
                      )}
                      {showDiscount && (
                        <td className="text-right">
                          {item.discount ? `${item.discount}%` : "-"}
                        </td>
                      )}
                      {showVat && (
                        <td className="text-right">
                          {item.vat ? `${item.vat}%` : "-"}
                        </td>
                      )}
                      {showTotal && (
                        <td className="text-right max-w-[140px]">
                          <span
                            className="block truncate"
                            title={formatCurrency(item.total, currency)}
                          >
                            {formatCurrency(item.total, currency)}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={1 + (showCustomFieldsAsColumns ? visibleCustomFieldColumns.length : 0) + (showQuantity ? 1 : 0) + (showPrice ? 1 : 0) + (showDiscount ? 1 : 0) + (showVat ? 1 : 0) + (showTotal ? 1 : 0)} className="text-center py-6">
                      No items
                    </td>
                  </tr>
                )}
              </tbody>
              {showTotal && (
                <tfoot>
                  <tr className="font-bold">
                    <td colSpan={1 + (showCustomFieldsAsColumns ? visibleCustomFieldColumns.length : 0) + (showQuantity ? 1 : 0) + (showPrice ? 1 : 0) + (showDiscount ? 1 : 0) + (showVat ? 1 : 0)} className="text-right pr-2">
                      TOTAL
                    </td>
                    <td
                      className="text-right text-lg max-w-[180px]"
                      style={{ color: pdfThemeColor }}
                    >
                      <span
                        className="block truncate"
                        title={formatCurrency(invoiceData.final_amount, currency)}
                      >
                        {formatCurrency(invoiceData.final_amount, currency)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {/* ── CIS TAX DEDUCTION BLOCK ─────────────────────────────────────
               Uses `cisDisplayRate` so the header & body always reflect the
               actual rate (cis_tax_value override or 20% default).
          ─────────────────────────────────────────────────────────────────── */}
          {isCIS && invoiceData.final_amount > 0 && (
            <div className="mb-8">
              <div className="font-bold mb-2">CIS Tax Summary</div>

              <div className="flex justify-between">
                <span>Gross Amount:</span>
                <span>{formatCurrency(invoiceData.final_amount, currency)}</span>
              </div>

              <div className="flex justify-between">
                <span>CIS Deduction ({cisDisplayRate}%):</span>
                <span>- {formatCurrency(cisTax, currency)}</span>
              </div>

              <div
                className="flex justify-between font-bold mt-2"
                style={{ color: accentColor }}
              >
                <span>Net Amount Payable:</span>
                <span>{formatCurrency(cisNet, currency)}</span>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                CIS tax is deducted at source and paid to HMRC.
              </div>
            </div>
          )}

          {/* STRIPE CHARGES — unchanged */}
          {invoiceData.payment_link &&
            charges &&
            (() => {
              const percentage = charges.stripe_fee_percentage ?? 0;
              const fixedFee = charges.stripe_fixed_fee ?? 0;
              const netAmount = isCIS ? cisNet : invoiceData.final_amount;
              const percentageDecimal = percentage / 100;
              let grossAmount = netAmount;
              if (percentage > 0 || fixedFee > 0) {
                grossAmount = (netAmount + fixedFee) / (1 - percentageDecimal);
              }
              grossAmount = Math.round(grossAmount * 100) / 100;
              const stripeFeeAmount =
                Math.round((grossAmount - netAmount) * 100) / 100;

              return (
                <div className="mb-8">
                  <div className="font-bold mb-2">Stripe Payment Summary</div>

                  <div className="flex justify-between">
                    <span>Invoice Amount:</span>
                    <span>{formatCurrency(netAmount, currency)}</span>
                  </div>

                  {stripeFeeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>
                        Processing Fee ({percentage}%
                        {fixedFee > 0 &&
                          ` + ${formatCurrency(fixedFee, currency)}`}
                        )
                      </span>
                      <span>{formatCurrency(stripeFeeAmount, currency)}</span>
                    </div>
                  )}

                  <div
                    className="flex justify-between font-bold mt-2"
                    style={{ color: accentColor }}
                  >
                    <span>Total To Pay:</span>
                    <span>{formatCurrency(grossAmount, currency)}</span>
                  </div>
                </div>
              );
            })()}
        </div>

        {/* FOOTER — unchanged */}
        <div
          className="mt-auto pt-6 border-t text-center text-sm text-gray-600"
          style={{ color: accentColor }}
        >
          <div className="text-base font-medium">Thank you</div>
          <div className="mt-1 text-xs text-gray-400">
            Generated on {formatDate(new Date().toISOString())}
          </div>
        </div>
      </div>

      {/* ========================= */}
      {/* PAGE 2 — QUOTATION DETAILS — unchanged */}
      {/* ========================= */}
      {isQuotationType &&
        (invoiceData.quotation_title || invoiceData.quotation_content) && (
          <div
            className="max-w-[740px] mx-auto p-8 text-black text-sm bg-white flex flex-col shadow-lg mb-8"
            style={{
              minHeight: "100vh",
              pageBreakBefore: "always",
              breakBefore: "page",
              border: "1px solid #ccc",
            }}
          >
            <div className="text-right text-xs text-gray-400 mb-2">Page 2</div>

            <div>
              <h2
                className="text-3xl font-bold mb-6"
                style={{ color: accentColor }}
              >
                Quotation Note
              </h2>

              {invoiceData.quotation_title && (
                <>
                  <strong>Title</strong>
                  <h3 className="mb-4">{invoiceData.quotation_title}</h3>
                </>
              )}

              {invoiceData.quotation_content && (
                <div className="whitespace-pre-line leading-relaxed text-gray-800">
                  <strong>Content:</strong>
                  <br />
                  {invoiceData.quotation_content}
                </div>
              )}
            </div>

            <div
              className="mt-auto pt-6 border-t text-center text-sm text-gray-600"
              style={{ color: accentColor }}
            >
              <div className="text-base font-medium">Thank you</div>
              <div className="mt-1 text-xs text-gray-400">
                Generated on {formatDate(new Date().toISOString())}
              </div>
            </div>
          </div>
        )}
    </>
  );
}
