import { NextRequest, NextResponse } from 'next/server';
import { getSyncApiKey, getSyncBaseUrl } from '@/lib/sync-config';

/**
 * Server-side proxy: deletes BookWise user by email for rollback during registration.
 * Keeps the shared secret off the browser bundle.
 */
export async function POST(request: NextRequest) {
  const apiKey = getSyncApiKey();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const { email } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { success: false, message: 'Email is required.' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Sync Delete User proxy - Email:', email);
    const upstream = await fetch(`${getSyncBaseUrl()}/api/v1/admin/auth/delete-user-by-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({ email }),
    });

    const data = await upstream.json().catch(() => ({}));
    console.log('🔄 Sync Delete User proxy - Response status:', upstream.status);
    console.log('🔄 Sync Delete User proxy - Response data:', data);

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'Could not reach BookWise delete service.',
      },
      { status: 502 }
    );
  }
}
