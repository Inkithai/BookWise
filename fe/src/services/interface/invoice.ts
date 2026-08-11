// services/interface/invoice.ts - FULL UPDATED VERSION WITH QUOTATION FIELDS
export type InvoiceStatus =
  | "Created"
  | "Mail Sent"
  | "Rejected"
  | "Paid"
  | "Installment Payment"
  | "Not Paid"
  | "Receipt Sent"
  | "Draft";

export type PdfTemplateType = 'classic' | 'modern' | 'minimal' | 'modern1';

export type ClientType = "Personal" | "Business" | "";

// ============================================================================
// INVOICE TYPE INTERFACES
// ============================================================================

export interface InvoiceType {
  id: number;
  name: string;
}

// ============================================================================
// CLIENT INTERFACES
// ============================================================================

export interface Client {
  id: number;
  name: string;
  email?: string;
  telephone?: string;
  address?: string;
  address_no?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_town?: string | null;
  address_postcode?: string | null;
  address_county?: string | null;
  address_country?: string | null;
  host_id?: number;
  client_type?: ClientType;
  company_registration_number?: string | null;
  vat_number?: string | null;
  utr?: string | null;
}

export interface StoreClientRequest {
  name: string;
  email: string;
  telephone?: string;
  address?: string;
  address_no?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_town?: string | null;
  address_postcode?: string | null;
  address_county?: string | null;
  address_country?: string | null;
  client_type?: ClientType;
  company_registration_number?: string;
  vat_number?: string;
  utr?: string;
}

export interface UpdateClientRequest {
  name: string;
  email: string;
  telephone?: string | null;
  address?: string | null;
  address_no?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_town?: string | null;
  address_postcode?: string | null;
  address_county?: string | null;
  address_country?: string | null;
  client_type?: ClientType;
  company_registration_number?: string | null;
  vat_number?: string | null;
  utr?: string | null;
}

/** Map cleared optional client fields to null so PUT updates persist (undefined is omitted from JSON). */
export function nullableClientField(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

export interface ClientResponse {
  success: boolean;
  data: Client;
  message?: string;
}

export interface ClientsResponse {
  success: boolean;
  data: Client[];
}

// ============================================================================
// INVOICE ITEM INTERFACES
// ============================================================================

export interface InvoiceItem {
  id: number;
  invoice_id?: number;
  name: string;
  type: string;
  currency: string;
  price: number | string;
  quantity: number | string | null;
  discount: number | string | null;
  discount_value?: number | string | null;
  vat: number | string | null;
  vat_value?: number | string | null;
  total: number | string;
  total_amount?: number;
  project_reference?: string | null;
  custom_fields?: { key: string; value: string }[];
  cis_enabled?: boolean;
}

export interface InvoiceItemRequest {
  name: string;
  type: string;
  currency: string;
  price: number;
  quantity?: number | null;
  discount?: number | null;
  discount_value?: number | null;
  vat?: number | null;
  vat_value?: number | null;
  total_amount: number;
  project_reference: string | null;
  custom_fields?: { key: string; value: string }[];
}

// ============================================================================
// INVOICE INTERFACES - UPDATED WITH QUOTATION FIELDS
// ============================================================================

export interface Invoice {
  id: number;
  code: string;
  client: string;
  client_id?: number;
  client_object?: Client;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  total_discount: number;
  total_vat: number;
  final_amount: number;
  status: InvoiceStatus;
  created_by: string;
  items: InvoiceItem[];
  type_id?: number;
  invoice_type?: string;
  services?: InvoiceItem[];
  cleaning_fee?: InvoiceItem[];
  products?: InvoiceItem[];
  pdf_type?: PdfTemplateType | null;
  pdf_file?: string | null;
  quotation_title?: string | null;  // ADDED: Quotation title field
  quotation_content?: string | null; // ADDED: Quotation content field
  payment_link: boolean;
  bank_payment: boolean;
  notes?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  cis_enabled?: boolean;
  cis_tax?: number | null;
  // Company context
  company_id?: number | null;
  host_id?: number | null;
  company_name?: string | null;
}

export interface StoreInvoiceRequest {
  invoice_code: string;
  client_id: number;
  type_id: number;
  pdf_type?: string;
  due_date: string | null;
  invoice_date: string;
  items: InvoiceItemRequest[];
  total_amount: number;
  total_vat?: number | null;
  total_discount?: number | null;
  final_amount: number;
  status?: InvoiceStatus;
  quotation_title?: string;
  quotation_content?: string;
  bank_payment: boolean;
  payment_link: boolean;
  notes?: string;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  cis_tax?: number | null;
  client_utr?: string | null;
  cis_enabled?: boolean | null;
  pdf_field_visibility?: Record<string, boolean> | null;
  // Company selector: which company's branding/context to use for this invoice
  company_id?: number | null;
  // Flag: true when invoice is created from ALL-Accounts View
  all_accounts_view?: boolean;
}

export type DraftInvoiceItem = {
  id?: number;
  invoice_id?: number;
  name?: string;
  type?: string;
  currency?: string;
  price?: number;
  quantity?: number;
  discount?: number;
  discount_value?: number;
  vat?: number;
  vat_value?: number;
  total?: number;
  custom_fields?: { key: string; value: string }[];
};

export type DraftInvoice = {
  id?: number;
  code?: string;
  client?: string;
  invoice_type?: string;
  pdf_type?: string;
  pdf_file?: string;
  invoice_date?: string;
  due_date?: string;
  total_amount?: number;
  total_discount?: number;
  total_vat?: number;
  final_amount?: number;
  status?: string;
  quotation_title?: string;
  quotation_content?: string;
  created_by?: string;
  items?: DraftInvoiceItem[];
};

export interface StoreDraftInvoiceRequest {
  invoice_code?: string;
  client_id?: number;
  type_id?: number;
  pdf_type?: string;
  due_date?: string;
  invoice_date?: string;
  items?: DraftInvoiceItem[];
  total_amount?: number;
  total_vat?: number | null;
  total_discount?: number | null;
  final_amount?: number;
  status?: InvoiceStatus;
  quotation_title?: string;  // ADDED: Quotation title field
  quotation_content?: string; // ADDED: Quotation content field
  cis_tax?: number | null;
  client_utr?: string | null;
  cis_enabled?: boolean | null;
  pdf_field_visibility?: Record<string, boolean> | null;
  company_id?: number | null;
  bank_payment?: boolean | null;
  payment_link?: boolean | null;
}

export interface UpdateInvoiceRequest {
  client_id?: number;
  company_id?: number | null;
  type_id?: number;
  pdf_type?: string;
  invoice_date?: string;
  invoice_code?: string;
  due_date?: string | null;
  items?: InvoiceItemRequest[];
  total_amount?: number;
  total_vat?: number | null;
  total_discount?: number | null;
  final_amount?: number;
  status?: InvoiceStatus;
  quotation_title?: string;  // ADDED: Quotation title field
  quotation_content?: string; // ADDED: Quotation content field
  payment_link: boolean;
  bank_payment: boolean;
  notes?: string;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  cis_enabled?: boolean | null,
  cis_tax?: number | null,
  client_utr?: string | null,
  pdf_field_visibility?: Record<string, boolean> | null;
  // Flag: true when invoice is updated from ALL-Accounts View
  all_accounts_view?: boolean;
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

export interface InvoiceResponse {
  success: boolean;
  data: Invoice[];
  message?: string;
}

export interface SingleInvoiceResponse {
  success: boolean;
  data: Invoice;
  message?: string;
}

export interface InvoiceTypesResponse {
  success: boolean;
  data: InvoiceType[];
}

export interface InvoiceData {
  host_id: number;
  invoice_code: string;
  clients: Client[];
  invoice_types: InvoiceType[];
}

export interface InvoiceDataResponse {
  success: boolean;
  message: string;
  data: InvoiceData;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// CURRENCY INTERFACES AND UTILITIES
// ============================================================================

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCY_MAP: Record<string, Currency> = {
  // ── Americas ──────────────────────────────────────────────────────────────
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  MXN: { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  ARS: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  CLP: { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso' },
  COP: { code: 'COP', symbol: 'COL$', name: 'Colombian Peso' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  UYU: { code: 'UYU', symbol: 'UYU$', name: 'Uruguayan Peso' },
  PYG: { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani' },
  BOB: { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano' },
  VEF: { code: 'VEF', symbol: 'Bs.F', name: 'Venezuelan Bolivar' },
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
  GTQ: { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal' },
  HNL: { code: 'HNL', symbol: 'L', name: 'Honduran Lempira' },
  NIO: { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Cordoba' },
  CRC: { code: 'CRC', symbol: '₡', name: 'Costa Rican Colon' },
  PAB: { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa' },
  SVC: { code: 'SVC', symbol: '₱', name: 'Salvadoran Colon' },
  JMD: { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar' },
  BBD: { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar' },
  TTD: { code: 'TTD', symbol: 'TT$', name: 'Trinidad and Tobago Dollar' },
  BSD: { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar' },
  BZD: { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar' },
  GYD: { code: 'GYD', symbol: 'G$', name: 'Guyanese Dollar' },
  SRD: { code: 'SRD', symbol: 'Sr$', name: 'Surinamese Dollar' },
  HTG: { code: 'HTG', symbol: 'G', name: 'Haitian Gourde' },
  CUP: { code: 'CUP', symbol: '$MN', name: 'Cuban Peso' },
  ANG: { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder' },
  AWG: { code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin' },
  // ── Europe ────────────────────────────────────────────────────────────────
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  ISK: { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  BGN: { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  HRK: { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  RSD: { code: 'RSD', symbol: 'din', name: 'Serbian Dinar' },
  UAH: { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  MDL: { code: 'MDL', symbol: 'L', name: 'Moldovan Leu' },
  ALL: { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
  MKD: { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
  BAM: { code: 'BAM', symbol: 'KM', name: 'Bosnia-Herzegovina Mark' },
  GEL: { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
  AMD: { code: 'AMD', symbol: '֏', name: 'Armenian Dram' },
  AZN: { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat' },
  BYN: { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble' },
  // ── Asia ───────────────────────────────────────────────────────────────────
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  LKR: { code: 'LKR', symbol: 'Rs.', name: 'Sri Lankan Rupee' },
  NPR: { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee' },
  MMK: { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  TWD: { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' },
  KZT: { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge' },
  UZS: { code: 'UZS', symbol: 'сўм', name: 'Uzbekistani Som' },
  KGS: { code: 'KGS', symbol: 'сом', name: 'Kyrgyzstani Som' },
  TJS: { code: 'TJS', symbol: 'ЅМ', name: 'Tajikistani Somoni' },
  TMT: { code: 'TMT', symbol: 'm', name: 'Turkmenistani Manat' },
  MNT: { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik' },
  KHR: { code: 'KHR', symbol: '៛', name: 'Cambodian Riel' },
  LAK: { code: 'LAK', symbol: '₭', name: 'Lao Kip' },
  BND: { code: 'BND', symbol: 'B$', name: 'Brunei Dollar' },
  MVR: { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa' },
  BTN: { code: 'BTN', symbol: 'Nu.', name: 'Bhutanese Ngultrum' },
  AFN: { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel' },
  IRR: { code: 'IRR', symbol: '﷼', name: 'Iranian Rial' },
  IQD: { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar' },
  SYP: { code: 'SYP', symbol: 'ل.س', name: 'Syrian Pound' },
  JOD: { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar' },
  LBP: { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound' },
  YER: { code: 'YER', symbol: '﷼', name: 'Yemeni Rial' },
  // ── Middle East ────────────────────────────────────────────────────────────
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  QAR: { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' },
  BHD: { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar' },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  OMR: { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial' },
  // ── Africa ─────────────────────────────────────────────────────────────────
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  MAD: { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
  TND: { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
  DZD: { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar' },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  MGA: { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary' },
  MUR: { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee' },
  SCR: { code: 'SCR', symbol: '₨', name: 'Seychellois Rupee' },
  BWP: { code: 'BWP', symbol: 'P', name: 'Botswana Pula' },
  NAD: { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar' },
  SZL: { code: 'SZL', symbol: 'E', name: 'Eswatini Lilangeni' },
  LSL: { code: 'LSL', symbol: 'M', name: 'Lesotho Loti' },
  MZN: { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical' },
  ZMW: { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },
  MWK: { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha' },
  RWF: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  BIF: { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc' },
  SLL: { code: 'SLL', symbol: 'Le', name: 'Sierra Leonean Leone' },
  GMD: { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi' },
  CVE: { code: 'CVE', symbol: '$', name: 'Cape Verdean Escudo' },
  STN: { code: 'STN', symbol: 'Db', name: 'Sao Tomean Dobra' },
  MRU: { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya' },
  LYD: { code: 'LYD', symbol: 'ل.د', name: 'Libyan Dinar' },
  SDG: { code: 'SDG', symbol: 'ج.س.', name: 'Sudanese Pound' },
  SOS: { code: 'SOS', symbol: 'Sh', name: 'Somali Shilling' },
  DJF: { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc' },
  ERN: { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa' },
  KMF: { code: 'KMF', symbol: 'CF', name: 'Comorian Franc' },
  // ── Oceania ────────────────────────────────────────────────────────────────
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  FJD: { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar' },
  PGK: { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina' },
  SBD: { code: 'SBD', symbol: 'SI$', name: 'Solomon Islands Dollar' },
  VUV: { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu' },
  WST: { code: 'WST', symbol: 'WS$', name: 'Samoan Tala' },
  TOP: { code: 'TOP', symbol: 'T$', name: 'Tongan Paanga' },
  XPF: { code: 'XPF', symbol: '₣', name: 'CFP Franc' },
  // ── Special / Regional ─────────────────────────────────────────────────────
  XCD: { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar' },
  XDR: { code: 'XDR', symbol: 'XDR', name: 'Special Drawing Rights' },
};

export const CURRENCY_OPTIONS = Object.entries(CURRENCY_MAP).map(([code, data]) => ({
  value: code,
  label: `${data.symbol} - ${data.name}`,
  symbol: data.symbol
}));

// ============================================================================
// CLIENT TYPE OPTIONS
// ============================================================================

export const CLIENT_TYPE_OPTIONS = [
  { value: "Personal", label: "Personal" },
  { value: "Business", label: "Business" }
] as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_CURRENCY = 'LKR';
export const DEFAULT_INVOICE_TYPE_NAME = 'Invoice';
export const DEFAULT_STATUS = 'Created' as InvoiceStatus;
export const DEFAULT_CLIENT_TYPE = 'Personal' as ClientType;

// ============================================================================
// INVOICE TYPE UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if invoice type is Quotation
 */
export function isQuotationType(invoiceTypes: InvoiceType[], typeId: number | string): boolean {
  // `typeId` is expected to be the invoice type id (from the dropdown value).
  // Only treat it as "Quotation" when the id matches a quotation type.
  const type = invoiceTypes.find(t => t.id === Number(typeId));
  return type?.name?.toLowerCase() === 'quotation';
}

/**
 * Check if invoice is a quotation
 */
export function isQuotation(invoice: Invoice, invoiceTypes: InvoiceType[]): boolean {
  if (invoice.invoice_type?.toLowerCase() === 'quotation') return true;
  if (invoice.type_id) {
    return isQuotationType(invoiceTypes, invoice.type_id);
  }
  return false;
}

// ============================================================================
// CLIENT TYPE UTILITY FUNCTIONS
// ============================================================================

export function isBusinessClient(client?: Client | null): boolean {
  return client?.client_type === "Business";
}

export function isPersonalClient(client?: Client | null): boolean {
  return client?.client_type === "Personal" || client?.client_type === "" || !client?.client_type;
}

export function validateBusinessClient(client: StoreClientRequest | UpdateClientRequest): string[] {
  const errors: string[] = [];

  if (client.client_type === "Business") {
    if (!client.company_registration_number?.trim()) {
      errors.push("Company registration number is required for business clients");
    }
    if (!client.vat_number?.trim()) {
      errors.push("VAT number is required for business clients");
    }
    if (!client.utr?.trim()) {
      errors.push("UTR (Unique Tax Reference) is required for business clients");
    }
  }

  return errors;
}

// ============================================================================
// CURRENCY UTILITY FUNCTIONS
// ============================================================================

export function formatCurrency(amount: number | string, currencyCode: string = DEFAULT_CURRENCY): string {
  const num = Number(amount) || 0;
  const currency = CURRENCY_MAP[currencyCode] || CURRENCY_MAP[DEFAULT_CURRENCY];

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.code
  }).format(num);
}

export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_MAP[currencyCode]?.symbol || CURRENCY_MAP[DEFAULT_CURRENCY].symbol;
}

export function getCurrencyOptions() {
  return CURRENCY_OPTIONS;
}

// ============================================================================
// INVOICE TYPE UTILITY FUNCTIONS
// ============================================================================

export function findInvoiceTypeByName(invoiceTypes: InvoiceType[], name: string): InvoiceType | undefined {
  let type = invoiceTypes.find(t => t.name === name);

  if (!type) {
    type = invoiceTypes.find(t => t.name.toLowerCase() === name.toLowerCase());
  }

  if (!type) {
    type = invoiceTypes.find(t =>
      t.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(t.name.toLowerCase())
    );
  }

  return type;
}

export function getDefaultInvoiceTypeId(invoiceTypes: InvoiceType[]): string {
  const invoiceType = findInvoiceTypeByName(invoiceTypes, DEFAULT_INVOICE_TYPE_NAME);
  if (invoiceType) return invoiceType.id.toString();

  const generalType = findInvoiceTypeByName(invoiceTypes, 'General');
  if (generalType) return generalType.id.toString();

  if (invoiceTypes.length > 0) {
    return invoiceTypes[0].id.toString();
  }

  return "";
}

// ============================================================================
// INVOICE NORMALIZATION AND MAPPING FUNCTIONS
// ============================================================================

export function normalizeInvoiceResponse(
  data: unknown,
  clients?: Client[],
  invoiceTypes?: InvoiceType[]
): Invoice {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data provided to normalizeInvoiceResponse');
  }

  const dataObj = data as Record<string, unknown>;
  const rawCompanyId = Number(dataObj.company_id);
  const normalizedCompanyId = Number.isFinite(rawCompanyId) && rawCompanyId > 0 ? rawCompanyId : null;
  const rawHostId = Number(dataObj.host_id);
  const normalizedHostId = Number.isFinite(rawHostId) && rawHostId > 0 ? rawHostId : null;

  const normalized: Invoice = {
    id: typeof dataObj.id === 'number' ? dataObj.id : 0,
    code: typeof dataObj.code === 'string' ? dataObj.code : '',
    client: typeof dataObj.client === 'string' ? dataObj.client : '',
    client_id: typeof dataObj.client_id === 'number' ? dataObj.client_id : undefined,
    client_object: dataObj.client_object && typeof dataObj.client_object === 'object' ? dataObj.client_object as Client : undefined,
    invoice_date: typeof dataObj.invoice_date === 'string' ? dataObj.invoice_date : '',
    due_date: typeof dataObj.due_date === 'string' ? dataObj.due_date : '',
    total_amount: typeof dataObj.total_amount === 'number' ? dataObj.total_amount : 0,
    total_discount: typeof dataObj.total_discount === 'number' ? dataObj.total_discount : 0,
    total_vat: typeof dataObj.total_vat === 'number' ? dataObj.total_vat : 0,
    final_amount: typeof dataObj.final_amount === 'number' ? dataObj.final_amount : 0,
    status: typeof dataObj.status === 'string' ? dataObj.status as InvoiceStatus : DEFAULT_STATUS,
    created_by: typeof dataObj.created_by === 'string' ? dataObj.created_by : '',
    items: Array.isArray(dataObj.items) ? (dataObj.items as any[]).map(mapLineItem) : [],
    type_id: typeof dataObj.type_id === 'number' ? dataObj.type_id : undefined,
    invoice_type: typeof dataObj.invoice_type === 'string' ? dataObj.invoice_type : undefined,
    services: Array.isArray(dataObj.services) ? (dataObj.services as any[]).map(mapLineItem) : [],
    cleaning_fee: Array.isArray(dataObj.cleaning_fee) ? (dataObj.cleaning_fee as any[]).map(mapLineItem) : [],
    products: Array.isArray(dataObj.products) ? (dataObj.products as any[]).map(mapLineItem) : [],
    pdf_type: typeof dataObj.pdf_type === 'string' ? dataObj.pdf_type as PdfTemplateType : null,
    pdf_file: typeof dataObj.pdf_file === 'string' ? dataObj.pdf_file : null,
    quotation_title: typeof dataObj.quotation_title === 'string' ? dataObj.quotation_title : null,  // ADDED
    quotation_content: typeof dataObj.quotation_content === 'string' ? dataObj.quotation_content : null, // ADDED
    bank_payment: typeof dataObj.bank_payment === 'boolean' ? dataObj.bank_payment as boolean : false,
    payment_link: typeof dataObj.payment_link === 'boolean' ? dataObj.payment_link as boolean : false,
    notes: typeof dataObj.notes === 'string' ? dataObj.notes : null,
    account_name: typeof dataObj.account_name === 'string' ? dataObj.account_name : null,
    account_number: typeof dataObj.account_number === 'string' ? dataObj.account_number : null,
    sort_code: typeof dataObj.sort_code === 'string' ? dataObj.sort_code : null,
    cis_enabled: typeof dataObj.cis_enabled === 'boolean' ? dataObj.cis_enabled : false,
    cis_tax: typeof dataObj.cis_tax === 'number' ? dataObj.cis_tax : 0,
    company_id: normalizedCompanyId,
    host_id: normalizedHostId,
    company_name: typeof dataObj.company_name === 'string' ? dataObj.company_name : null,
  };

  if (!normalized.client_id && normalized.client && clients && clients.length > 0) {
    const matchingClient = clients.find(c => c.name === normalized.client);
    if (matchingClient) {
      normalized.client_id = matchingClient.id;
      normalized.client_object = matchingClient;
    }
  }

  if (!normalized.type_id && normalized.invoice_type && invoiceTypes && invoiceTypes.length > 0) {
    const matchingType = invoiceTypes.find(t => t.name === normalized.invoice_type);
    if (matchingType) {
      normalized.type_id = matchingType.id;
    }
  }

  return normalized;
}

export function mapLineItem(item: unknown): InvoiceItem {
  if (!item || typeof item !== 'object') {
    throw new Error('Invalid item provided to mapLineItem');
  }

  const itemObj = item as Record<string, unknown>;

  return {
    id: typeof itemObj.id === 'number' ? itemObj.id : 0,
    invoice_id: typeof itemObj.invoice_id === 'number' ? itemObj.invoice_id : undefined,
    name: typeof itemObj.name === 'string' ? itemObj.name : '',
    type: typeof itemObj.type === 'string' ? itemObj.type : '',
    currency: typeof itemObj.currency === 'string' ? itemObj.currency : DEFAULT_CURRENCY,
    price: typeof itemObj.price === 'number' ? itemObj.price :
      typeof itemObj.price === 'string' ? itemObj.price : 0,
    quantity: typeof itemObj.quantity === 'number' ? itemObj.quantity :
      typeof itemObj.quantity === 'string' ? itemObj.quantity : null,
    discount: typeof itemObj.discount === 'number' ? itemObj.discount :
      typeof itemObj.discount === 'string' ? itemObj.discount : null,
    discount_value: typeof itemObj.discount_value === 'number' ? itemObj.discount_value :
      typeof itemObj.discount_value === 'string' ? itemObj.discount_value : null,
    vat: typeof itemObj.vat === 'number' ? itemObj.vat :
      typeof itemObj.vat === 'string' ? itemObj.vat : null,
    vat_value: typeof itemObj.vat_value === 'number' ? itemObj.vat_value :
      typeof itemObj.vat_value === 'string' ? itemObj.vat_value : null,
    total: typeof itemObj.total === 'number' ? itemObj.total :
      typeof itemObj.total === 'string' ? itemObj.total : 0,
    total_amount: typeof itemObj.total_amount === 'number' ? itemObj.total_amount : 0,
    project_reference: typeof itemObj.project_reference === 'string' ? itemObj.project_reference : null,
    custom_fields: Array.isArray(itemObj.custom_fields)
      ? (itemObj.custom_fields as any[])
        .filter((field) => field && typeof field === "object")
        .map((field) => ({
          key: typeof field.key === "string" ? field.key : "",
          value: typeof field.value === "string" ? field.value : "",
        }))
        .filter((field) => field.key.trim() || field.value.trim())
      : []
  };
}