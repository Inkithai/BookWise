// utils/bank-details-sync.ts
// Centralized bank details sync utility - scoped per user + account context

export interface BankDetails {
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
}

export type BankDetailsSyncScope = {
  userId?: number | null;
  companyId?: number | null;
};

const BANK_DETAILS_EVENT = 'bankDetailsChanged';
const LEGACY_BANK_DETAILS_STORAGE_KEY = 'bank_details_sync';

export function getBankDetailsStorageKey(scope?: BankDetailsSyncScope): string {
  const userId = Number(scope?.userId);
  const userScope = Number.isFinite(userId) && userId > 0 ? `user:${userId}` : 'user:unknown';
  const companyId = Number(scope?.companyId);
  if (Number.isFinite(companyId) && companyId > 0) {
    return `bank_details_sync:${userScope}:company:${companyId}`;
  }
  return `bank_details_sync:${userScope}:personal`;
}

/**
 * Save bank details to localStorage and dispatch event for cross-component sync
 */
export function saveBankDetailsToSync(
  bankDetails: BankDetails,
  scope?: BankDetailsSyncScope
): void {
  try {
    const key = getBankDetailsStorageKey(scope);
    localStorage.setItem(key, JSON.stringify(bankDetails));
    // Drop legacy global key to prevent cross-account bleed
    localStorage.removeItem(LEGACY_BANK_DETAILS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(BANK_DETAILS_EVENT, { detail: bankDetails }));
  } catch (error) {
    console.error('Failed to save bank details to sync:', error);
  }
}

/**
 * Load bank details from localStorage (scoped key first, then legacy global once)
 */
export function loadBankDetailsFromSync(scope?: BankDetailsSyncScope): BankDetails | null {
  try {
    const scoped = localStorage.getItem(getBankDetailsStorageKey(scope));
    if (scoped) {
      return JSON.parse(scoped);
    }
    const legacy = localStorage.getItem(LEGACY_BANK_DETAILS_STORAGE_KEY);
    if (legacy) {
      return JSON.parse(legacy);
    }
  } catch (error) {
    console.error('Failed to load bank details from sync:', error);
  }
  return null;
}

/**
 * Clear bank details from localStorage
 */
export function clearBankDetailsFromSync(scope?: BankDetailsSyncScope): void {
  try {
    if (scope) {
      localStorage.removeItem(getBankDetailsStorageKey(scope));
    } else {
      localStorage.removeItem(LEGACY_BANK_DETAILS_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(BANK_DETAILS_EVENT, { detail: null }));
  } catch (error) {
    console.error('Failed to clear bank details from sync:', error);
  }
}

/**
 * Check if bank details are complete (all three fields present)
 */
export function areBankDetailsComplete(bankDetails: BankDetails | null | undefined): boolean {
  return !!(
    bankDetails?.account_name &&
    bankDetails?.account_number &&
    bankDetails?.sort_code
  );
}

/**
 * Add event listener for bank details changes
 */
export function onBankDetailsChanged(callback: (bankDetails: BankDetails | null) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<BankDetails | null>;
    callback(customEvent.detail);
  };

  window.addEventListener(BANK_DETAILS_EVENT, handler);

  return () => {
    window.removeEventListener(BANK_DETAILS_EVENT, handler);
  };
}

export const BANK_DETAILS_CHANGED_EVENT = BANK_DETAILS_EVENT;
