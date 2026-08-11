import { NextRequest, NextResponse } from 'next/server';
import { getSyncBaseUrl } from '@/lib/sync-config';

/** Proxy: validate referral code on BookWise before Invoice registration. */
export async function POST(request: NextRequest) {
  let body: { referral_code?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const code = (body.referral_code || body.code || '').trim();
  if (!code) {
    return NextResponse.json(
      {
        success: false,
        message: 'Referral code is required.',
        errors: { referral_code: ['Referral code is required.'] },
      },
      { status: 422 }
    );
  }

  try {
    const upstream = await fetch(`${getSyncBaseUrl()}/api/v1/auth/validate-referral-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ referral_code: code.toUpperCase() }),
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Could not verify referral code. Please try again.',
      },
      { status: 502 }
    );
  }
}
