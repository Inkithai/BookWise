/**
 * BookWise main backend URL (local: http://127.0.0.1:8000).
 * Set BOOKWISE_API_URL or NEXT_PUBLIC_BOOKWISE_API_URL (.env.local / Amplify env).
 */
export function getSyncBaseUrl(): string {
  const raw =
    process.env.BOOKWISE_API_URL ||
    process.env.NEXT_PUBLIC_BOOKWISE_API_URL ||
    "http://127.0.0.1:8000";

  return raw.replace(/\/$/, "").replace(/\/api\/?$/, "");
}

/**
 * Shared APP_API_KEY for server routes (/api/sync/*).
 * Amplify: set BOOKWISE_APP_API_KEY (preferred) or NEXT_PUBLIC_BOOKWISE_APP_API_KEY.
 */
export function getSyncApiKey(): string {
  return (
    process.env.BOOKWISE_APP_API_KEY ||
    process.env.APP_API_KEY ||
    process.env.NEXT_PUBLIC_BOOKWISE_APP_API_KEY ||
    ""
  );
}
