import { loadStripe, type Stripe } from '@stripe/stripe-js';

/** Env names used across the app (prefer NEXT_PUBLIC_STRIPE_KEY). */
export function getStripePublishableKey(): string {
  const raw =
    process.env.NEXT_PUBLIC_STRIPE_KEY ??
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
    '';
  const key = typeof raw === 'string' ? raw.trim() : '';

  if (!key) return '';

  // Common Amplify/.env mistake: pasting "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..."
  const normalized = key.includes('=') ? (key.split('=').pop()?.trim() ?? '') : key;

  if (!normalized.startsWith('pk_')) {
    if (normalized.includes('NEXT_PUBLIC') || normalized.includes('STRIPE')) {
      console.error(
        '[Stripe] Invalid publishable key: env var name was used instead of pk_test_/pk_live_ value. ' +
          'Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to the key only (starts with pk_), then rebuild.',
      );
    }
    return '';
  }

  return normalized;
}

export function getStripePromise(): Promise<Stripe | null> | null {
  const key = getStripePublishableKey();
  return key ? loadStripe(key) : null;
}

export const STRIPE_KEY_ENV_HINT =
  'NEXT_PUBLIC_STRIPE_KEY (or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)';
