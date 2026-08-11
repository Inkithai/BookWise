import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRouteHidden } from '@/lib/hidden-routes';

export function proxy(request: NextRequest) {
  if (isRouteHidden(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/recurring-statements',
    '/recurring-statements/:path*',
    '/crm',
    '/crm/:path*',
  ],
};
