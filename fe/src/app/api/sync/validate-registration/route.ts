import { NextRequest, NextResponse } from 'next/server';
import { getSyncBaseUrl } from '@/lib/sync-config';

/** Server-side proxy for BookWise pre-registration validation. */
const UPSTREAM_TIMEOUT_MS = 8000;

const UNAVAILABLE_MESSAGE =
  'Validation service is temporarily unavailable. Please try again in a few seconds.';

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

  let upstream: Response;
  try {
    upstream = await fetch(`${getSyncBaseUrl()}/api/v1/auth/validate-registration`, {
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
    });
  } catch {
    // Timeout / unreachable (Render hibernation, cold start, network).
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

  // Pass real API answers through (200 business results, 422 validation
  // errors, JSON 4xx messages).
  if (data !== null && upstream.status < 500) {
    return NextResponse.json(data, { status: upstream.status });
  }

  // Non-JSON body (Render suspension/error page) or upstream 5xx: translate
  // into a readable, same-origin JSON error instead of `{}` + bare status.
  return NextResponse.json(
    { success: false, message: UNAVAILABLE_MESSAGE },
    { status: upstream.status >= 500 ? 503 : 502 }
  );
}
