// utils/auth.ts - Authentication Utilities
import { oauth2Service } from '@/services/oauth.service';

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken');
  return !!token;
};

/**
 * Get stored user data
 */
export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Store user data
 */
export const storeUser = (userData: any): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser', JSON.stringify(userData));
  }
};

/**
 * Clear authentication data
 */
export const clearAuthentication = (): void => {
  oauth2Service.clearTokens();
};

/**
 * Set up authentication event listeners
 */
export const setupAuthEventListeners = (callbacks: {
  onTokenExpired?: () => void;
  onUnauthorized?: () => void;
}) => {
  if (typeof window === 'undefined') return;

  if (callbacks.onTokenExpired) {
    window.addEventListener('auth:token-expired', callbacks.onTokenExpired);
  }

  if (callbacks.onUnauthorized) {
    window.addEventListener('auth:unauthorized', callbacks.onUnauthorized);
  }

  return () => {
    if (callbacks.onTokenExpired) {
      window.removeEventListener('auth:token-expired', callbacks.onTokenExpired);
    }
    if (callbacks.onUnauthorized) {
      window.removeEventListener('auth:unauthorized', callbacks.onUnauthorized);
    }
  };
};

/**
 * Format error for display
 */
export const formatAuthError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An error occurred. Please try again.';
};

/**
 * Check user permissions
 */
export const hasPermission = (permission: string): boolean => {
  const user = getStoredUser();
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission);
};

/**
 * Check user role
 */
export const hasRole = (role: string): boolean => {
  const user = getStoredUser();
  if (!user || !user.roles) return false;
  return user.roles.some((r: any) => r.name === role || r.id === role);
};

/**
 * Get authorization header
 */
export const getAuthHeader = () => {
  const token = oauth2Service.getAccessToken();
  if (!token) return {};
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };
};
