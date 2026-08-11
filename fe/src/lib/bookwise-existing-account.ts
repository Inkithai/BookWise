export const BOOKWISE_PORTAL_URL = 'https://bookwise.io/';

export type ExistingAccountField = 'email' | 'phone' | 'both';

const IW_DUPLICATE_PATTERNS = [
  /already registered/i,
  /already been taken/i,
  /already in use/i,
  /already used on bookwise/i,
];

export function isDuplicateMessage(message: string): boolean {
  return IW_DUPLICATE_PATTERNS.some((pattern) => pattern.test(message));
}

/** Detect duplicate email/phone from validation error maps. */
export function detectExistingAccountField(
  errors: Record<string, string[]>
): ExistingAccountField | null {
  const emailDup = errors.email?.some(isDuplicateMessage) ?? false;
  const phoneDup = errors.phone_number?.some(isDuplicateMessage) ?? false;

  if (emailDup && phoneDup) return 'both';
  if (emailDup) return 'email';
  if (phoneDup) return 'phone';
  return null;
}

export function resolveExistingAccount(
  errors: Record<string, string[]>,
  explicit?: ExistingAccountField | null
): ExistingAccountField | null {
  return explicit ?? detectExistingAccountField(errors);
}

export function getExistingAccountTitle(field: ExistingAccountField): string {
  if (field === 'email') {
    return 'This email is already registered on BookWise';
  }
  if (field === 'phone') {
    return 'This phone number is already registered on BookWise';
  }
  return 'This email or phone is already registered on BookWise';
}

export function getExistingAccountDescription(
  featureName: 'Invoice' | 'DocuSign'
): string {
  return `You already have an BookWise account. Log in at BookWise, add the ${featureName} feature to your plan, and continue — no need to register again here.`;
}

export const IW_EXISTING_FIELD_HINT = 'Already registered on BookWise';

export type ExistingAccountError = Error & {
  existingAccount?: ExistingAccountField;
  fieldErrors?: Record<string, string[] | string>;
};

export function getExistingAccountFromError(
  error: unknown
): ExistingAccountField | null {
  const err = error as ExistingAccountError;
  if (err?.existingAccount) return err.existingAccount;
  if (err?.fieldErrors && typeof err.fieldErrors === 'object') {
    const normalized: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(err.fieldErrors)) {
      normalized[key] = Array.isArray(value) ? value.map(String) : [String(value)];
    }
    return detectExistingAccountField(normalized);
  }
  if (err instanceof Error && isDuplicateMessage(err.message)) {
    return 'both';
  }
  return null;
}
