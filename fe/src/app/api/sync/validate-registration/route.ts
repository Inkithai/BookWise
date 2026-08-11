import { NextRequest, NextResponse } from 'next/server';
import { getSyncBaseUrl } from '@/lib/sync-config';

/** Server-side proxy for BookWise pre-registration validation. */
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

  try {
    const upstream = await fetch(`${getSyncBaseUrl()}/api/v1/auth/validate-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        phone_number: body.phone_number,
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Could not reach BookWise validation service.',
      },
      { status: 502 }
    );
  }
}
