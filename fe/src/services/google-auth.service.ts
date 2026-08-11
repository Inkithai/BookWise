// services/google-auth.service.ts
import axios from 'axios';
import https from 'https';

export interface GoogleAuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    token_type: string;
    expires_in: number;
    is_new_user: boolean;
    user: any;
  };
}

/**
 * A clean axios instance with NO auth interceptors.
 * Used only for unauthenticated requests like Google OAuth callback.
 */
const publicHttp = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/`,
  ...(typeof window === 'undefined' && {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  }),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Step 1 – ask the backend for the Google OAuth redirect URL.
 * Uses publicHttp because user is not yet authenticated.
 */
export const getGoogleRedirectUrl = async (): Promise<string> => {
  try {
    const response = await publicHttp.get<{ url: string }>(
      'admin/auth/google/redirect'
    );
    return response.data.url;
  } catch (error) {
    console.error('Failed to get Google redirect URL:', error);
    throw new Error('Failed to initiate Google login. Please try again.');
  }
};

/**
 * Step 2 – exchange the ?code= from Google with the backend for a token.
 * Uses publicHttp so the auth interceptor never fires on an unauthenticated request.
 */
export const handleGoogleCallback = async (
  code: string
): Promise<GoogleAuthResponse> => {
  try {
    console.log('🔁 Sending Google callback code to backend…');

    const response = await publicHttp.get<GoogleAuthResponse>(
      `admin/auth/google/callback?code=${encodeURIComponent(code)}`
    );

    console.log('✅ Google callback response:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Google callback API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Google authentication failed. Please try again.';
      throw new Error(message);
    }

    console.error('❌ Google callback unexpected error:', error);
    throw new Error('Google authentication failed. Please try again.');
  }
};