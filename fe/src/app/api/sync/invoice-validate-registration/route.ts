import { NextRequest, NextResponse } from 'next/server';
import { getSyncBaseUrl } from '@/lib/sync-config';

/**
 * Server-side proxy for the Invoice/base-API pre-registration check
 * (POST /api/v1/admin/auth/validate-registration).
 *
 * Why this exists: the register form used to call the Render-hosted API
 * directly from the browser. When that API is unavailable (service suspended,
 * hibernating on the Render free plan, deploying, crashing…), Render answers
 * with a static HTML page — HTTP 503 and NO `Access-Control-Allow-Origin`
 * header, because the request never reaches Laravel's HandleCors middleware.
 * The browser then reports a misleading CORS error instead of the real 503.
 *
 * Proxying server-side keeps the call same-origin, so upstream outages arrive
 * as readable JSON (`success: false` + message) instead of a CORS failure.
 *
 * Host resolution mirrors fe/.env.example: NEXT_PUBLIC_INVOICE_API_URL when
 * the invoice endpoints live on a different host, otherwise the main API.
 * The upstream path is fixed (never derived from user input), so this route
 * cannot be abused as an open proxy.
 */

/** Fail fast: Render free instances can take ~50 s to wake, which exceeds the
 *  function's comfort zone anyway — the user gets a clear message and can
 *  retry once the instance is up (the wake-up continues server-side). */
const UPSTREAM_TIMEOUT_MS = 8000;

const UNAVAILABLE_MESSAGE =
  'Validation service is temporarily unavailable. Please try again in a few seconds.';

function invoiceApiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_INVOICE_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    getSyncBaseUrl();

  return raw.replace(/\/+$/, '').replace(/\/api\/?$/, '');
}

export async function POST(request: NextRequest) {
  let body: { email?: string; phone_number?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  if (!body.email && !body.phone_number) {
    return NextResponse.json(
      { success: false, message: 'Email or phone number is required.' },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${invoiceApiBase()}/api/v1/admin/auth/validate-registration`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: body.email,
          phone_number: body.phone_number,
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: 'no-store',
      }
    );
  } catch {
    // Timeout (Render waking up / unreachable) — never seen by CORS because
    // this response is same-origin.
    return NextResponse.json(
      { success: false, message: UNAVAILABLE_MESSAGE },
      { status: 503 }
    );
  }

  const raw = await upstream.text().catch(() => '');
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  // Pass real API answers through untouched (200 business results, 422
  // validation errors, 4xx JSON messages).
  if (data !== null && upstream.status < 500) {
    return NextResponse.json(data, { status: upstream.status });
  }

  // Non-JSON body (Render suspension/error page) or upstream 5xx: translate
  // into a readable, same-origin JSON error.
  return NextResponse.json(
    { success: false, message: UNAVAILABLE_MESSAGE },
    { status: upstream.status >= 500 ? 503 : 502 }
  );
}
