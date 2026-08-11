import { getSyncApiKey, getSyncBaseUrl } from "@/lib/sync-config";

export function syncUpstreamHeaders(): Record<string, string> {
  const apiKey = getSyncApiKey();
  if (!apiKey) {
    throw new Error(
      "BookWise API key is not configured (BOOKWISE_APP_API_KEY)."
    );
  }

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "api-key": apiKey,
  };
}

export async function syncUpstreamFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getSyncBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  return fetch(url, {
    ...init,
    headers: {
      ...syncUpstreamHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}
