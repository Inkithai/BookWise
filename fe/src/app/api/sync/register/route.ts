import { NextRequest, NextResponse } from 'next/server';
import { getSyncApiKey, getSyncBaseUrl } from '@/lib/sync-config';

/**
 * Server-side proxy: registers the user on BookWise with APP_API_KEY.
 * Keeps the shared secret off the browser bundle.
 */
export async function POST(request: NextRequest) {
  const apiKey = getSyncApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          'BookWise API key is not configured (BOOKWISE_APP_API_KEY).',
      },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(`${getSyncBaseUrl()}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey,
        'X-Registration-Source': 'invoice',
      },
      body: JSON.stringify({
        ...body,
        registration_source: 'invoice',
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Could not reach BookWise registration service.',
      },
      { status: 502 }
    );
  }
}
