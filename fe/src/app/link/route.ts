import { NextRequest, NextResponse } from 'next/server';
import { detectDevice, getRedirectUrl } from '@/lib/deviceDetection';

/**
 * GET /link
 * Detects device type and redirects to appropriate URL
 * - Mobile iOS → Apple App Store
 * - Mobile Android → Google Play Store
 * - Tablets & Desktop → Landing page
 */
export async function GET(request: NextRequest) {
  try {
    // Get User-Agent header
    const userAgent = request.headers.get('user-agent') || '';

    // Detect device
    const deviceInfo = detectDevice(userAgent);

    // Get base URL from query params or environment, default to invoicing.bookwise.io
    const baseUrl =
      new URL(request.url).searchParams.get('baseUrl') ||
      process.env.NEXT_PUBLIC_REDIRECT_BASE_URL ||
      'https://invoicing.bookwise.io';

    // Get redirect URL based on device
    const redirectUrl = getRedirectUrl(deviceInfo, baseUrl);

    // Return redirect response
    return NextResponse.redirect(redirectUrl, {
      status: 302, // Temporary redirect
    });
  } catch (error) {
    console.error('Error in /link route:', error);

    // Fallback redirect to registration page
    return NextResponse.redirect('https://invoicing.bookwise.io/auth/register', {
      status: 302,
    });
  }
}
