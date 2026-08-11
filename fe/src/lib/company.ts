/**
 * Central company / issuer details used on generated documents
 * (invoices, receipts, ledgers and booking reports).
 *
 * Override per deployment with NEXT_PUBLIC_COMPANY_* environment variables
 * so no tenant name is hardcoded into the UI.
 */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME ?? 'Acme Ltd',
  registration: process.env.NEXT_PUBLIC_COMPANY_REGISTRATION ?? '13177825',
  vat: process.env.NEXT_PUBLIC_COMPANY_VAT ?? '428368079',
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ??
    'Unit 1, Kensworth Gate, 200-204 High Street South, Dunstable, United Kingdom, LU6 3HS',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'accounts@acmecorp.com',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE ?? '+44 158 275 3283',
} as const;

/** "Acme Ltd | Registered in England and Wales | CRN: … | VAT: …" */
export const companyLegalLine = () =>
  `${COMPANY.name} | Registered in England and Wales | CRN: ${COMPANY.registration} | VAT: ${COMPANY.vat}`;

/** "accounts@acmecorp.com | +44 …" */
export const companyContactLine = () => `${COMPANY.email} | ${COMPANY.phone}`;

export const companyThanksLine = () =>
  `- THANK YOU FOR YOUR BUSINESS WITH ${COMPANY.name.toUpperCase()} -`;
