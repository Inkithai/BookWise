/**
 * Device detection utility
 * Detects device type based on User-Agent header
 */

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type OSType = 'ios' | 'android' | 'unknown';

export interface DeviceInfo {
  type: DeviceType;
  os: OSType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  userAgent: string;
}

/**
 * Detects device type from User-Agent string
 */
export function detectDevice(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  // Check for mobile devices
  const mobileRegex = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i;
  const isMobile = mobileRegex.test(ua);

  // Check for tablets
  const tabletRegex = /ipad|android(?!.*mobile)|tablet|playbook|silk/i;
  const isTablet = tabletRegex.test(ua) && !isMobile;

  // Desktop is anything that's not mobile or tablet
  const isDesktop = !isMobile && !isTablet;

  // Determine device type
  let deviceType: DeviceType = 'desktop';
  if (isMobile) {
    deviceType = 'mobile';
  } else if (isTablet) {
    deviceType = 'tablet';
  }

  // Detect OS type
  let osType: OSType = 'unknown';
  let isIOS = false;
  let isAndroid = false;

  if (/iphone|ipad|ipod|mac os x/i.test(ua)) {
    osType = 'ios';
    isIOS = true;
  } else if (/android/i.test(ua)) {
    osType = 'android';
    isAndroid = true;
  }

  return {
    type: deviceType,
    os: osType,
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    userAgent,
  };
}

/**
 * Get redirect URL based on device type
 * Redirects mobile users to app stores, others to landing page
 */
export function getRedirectUrl(
  deviceInfo: DeviceInfo,
  baseUrl: string = '/'
): string {
  // App Store links
  const APP_STORE_LINKS = {
    ios: '#',
    android: '#',
  };

  // For mobile devices, redirect to appropriate app store
  if (deviceInfo.isMobile) {
    if (deviceInfo.isIOS) {
      return APP_STORE_LINKS.ios;
    } else if (deviceInfo.isAndroid) {
      return APP_STORE_LINKS.android;
    }
    // Fallback for other mobile devices
    return `${baseUrl}/download?device=mobile`;
  }

  // For tablets and desktop
  const redirectUrls: Record<Exclude<DeviceType, 'mobile'>, string> = {
    tablet: `${baseUrl}/auth/register?device=tablet`,
    desktop: `${baseUrl}/auth/register?device=desktop`,
  };

  return redirectUrls[deviceInfo.type as Exclude<DeviceType, 'mobile'>];
}
