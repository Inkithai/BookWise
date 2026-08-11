import { NextRequest, NextResponse } from 'next/server';
import { detectDevice, getRedirectUrl } from '@/lib/deviceDetection';

/**
 * GET /link/debug
 * Shows device detection information without redirecting
 * Useful for testing device detection
 */
export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const deviceInfo = detectDevice(userAgent);

  const baseUrl = process.env.NEXT_PUBLIC_REDIRECT_BASE_URL || 'https://invoicing.bookwise.io';
  const redirectUrl = getRedirectUrl(deviceInfo, baseUrl);

  return NextResponse.json(
    {
      message: 'Device Detection Info',
      device: deviceInfo.type,
      os: deviceInfo.os,
      redirectUrl,
      details: deviceInfo,
      timestamp: new Date().toISOString(),
      note: 'Remove /debug from URL to perform actual redirect',
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
