import { NextRequest, NextResponse } from 'next/server';
import { getSyncApiKey, getSyncBaseUrl } from '@/lib/sync-config';

/** Activate BookWise account after Invoice OTP verification. */
export async function POST(request: NextRequest) {
  const apiKey = getSyncApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          'BookWise API key is not configured. Set BOOKWISE_APP_API_KEY or NEXT_PUBLIC_BOOKWISE_APP_API_KEY in the deployment environment.',
      },
      { status: 500 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  if (!body.email) {
    return NextResponse.json(
      { success: false, message: 'Email is required.' },
      { status: 422 }
    );
  }

  try {
    const upstream = await fetch(
      `${getSyncBaseUrl()}/api/v1/auth/activate-invoice-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({ email: body.email }),
      }
    );

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Could not reach BookWise activation service.',
      },
      { status: 502 }
    );
  }
}
