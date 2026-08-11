/** Routes hidden from navigation and blocked via middleware (direct URL → dashboard). */
export const HIDDEN_ROUTE_PREFIXES = [
  '/recurring-statements',
  '/crm',
  '/bookings-management',
  '/properties',
  '/guests',
  '/blogs',
  '/whatsapp',
  '/destinations',
  '/deals',
  '/google-analytics',
  '/features',
] as const;

/** Sidebar nav item names that map to hidden routes. */
export const HIDDEN_NAV_ITEM_NAMES = new Set([
  'Recurring',
  'CRM',
  'Bookings',
  'Properties',
  'Guests',
  'Blogs',
  'WhatsApp',
  'Destinations',
  'Deals',
  'Google Analytics',
  'Features',
]);

export function isRouteHidden(pathname: string): boolean {
  return HIDDEN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
