// services/oauth.service.ts - OAuth2 Authentication Service
import axios from 'axios';
import https from 'https';

export interface OAuth2LoginPayload {
  email: string;
  password: string;
}

export interface OAuth2LoginResponse {
  success: boolean;
  message: string;
  authorization: {
    access_token: string;
    token_type: 'Bearer';
  };
  data: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    permissions?: string[];
    roles?: any[];
  };
}

export interface OAuth2RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface OAuth2RegisterResponse {
  success: boolean;
  message: string;
  authorization?: {
    access_token: string;
    token_type: 'Bearer';
  };
  data?: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * OAuth2 Service - Handles authentication with bookwise backend
 * Uses Bearer Token authentication via Laravel Passport
 */
class OAuth2Service {
  private apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  constructor() {
    if (!this.apiBaseUrl) {
      // API URL should be configured in environment variables
    }
  }
  
  private http = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/`,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });

  /**
   * Decode JWT token and check expiration
   */
  private isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return true;

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);

      if (!decoded.exp) return false;

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime + 30; // Consider expired if less than 30 seconds left
    } catch (error) {
      // If we can't decode the token, don't assume it's expired — let the backend decide.
      return false;
    }
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken');
  }

  /**
   * Store access token
   */
  setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken', token);
      // Update axios header
      this.http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }

  /**
   * Clear tokens and user data
   */
  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken');
      localStorage.removeItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser');
      delete this.http.defaults.headers.common['Authorization'];
    }
  }

  /**
   * Setup request interceptor to add Bearer token
   */
  setupInterceptors(): void {
    this.http.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          if (this.isTokenExpired(token)) {
            this.clearTokens();
            window.dispatchEvent(new CustomEvent('auth:token-expired'));
            return Promise.reject(new Error('Token expired'));
          }
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const url = error.config?.url || '';
          const isAuthEndpoint = url.includes('admin/auth/login') || url.includes('admin/auth/register');
          if (status === 401) {
            if (!isAuthEndpoint) {
              console.warn('OAuth2: Unauthorized, clearing tokens');
              this.clearTokens();
              window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Login with email and password
   * Returns OAuth2 access token
   */
  async login(email: string, password: string): Promise<any> {
    try {
      console.log('🔐 OAuth2: Logging in user:', email);

      const response = await this.http.post(
        'admin/auth/login',
        {
          email,
          password,
        }
      );

      const responseData = response.data;

      // Handle OAuth2 format: { authorization: { access_token } }
      if (responseData.authorization?.access_token) {
        this.setAccessToken(responseData.authorization.access_token);
      }
      // Handle admin/auth format: { data: { token, user } }
      else if (responseData.data?.token) {
        this.setAccessToken(responseData.data.token);
      }

      return responseData;
    } catch (error) {
      // Login 401 is expected for invalid credentials — no console noise needed.
      throw this.handleError(error);
    }
  }

  /**
   * Register new user
   */
  async register(payload: OAuth2RegisterPayload): Promise<OAuth2RegisterResponse> {
    try {
      console.log('📝 OAuth2: Registering user:', payload.email);

      const response = await this.http.post<OAuth2RegisterResponse>(
        'admin/auth/register',
        payload
      );

      if (response.data.authorization?.access_token) {
        this.setAccessToken(response.data.authorization.access_token);
        console.log('✅ OAuth2: Registration successful');
      }

      return response.data;
    } catch (error) {
      console.error('❌ OAuth2: Registration failed', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      console.log('👤 OAuth2: Fetching current user');

      const response = await this.http.get('admin/auth/me');
      console.log('✅ OAuth2: User fetched successfully');

      return response.data;
    } catch (error) {
      console.error('❌ OAuth2: Failed to fetch current user', error);
      throw this.handleError(error);
    }
  }

  /**
   * Logout and revoke token
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 OAuth2: Logging out user');

      await this.http.post('admin/auth/logout');
    } catch (error) {
      console.error('⚠️ OAuth2: Logout request failed, clearing local session', error);
    } finally {
      this.clearTokens();
      console.log('✅ OAuth2: Logout complete');
    }
  }

  /**
   * Change password
   */
  async changePassword(
    old_password: string,
    password: string,
    password_confirmation: string
  ) {
    try {
      const response = await this.http.patch('admin/auth/change-password', {
        old_password,
        password,
        password_confirmation,
      });
      return response.data;
    } catch (error) {
      console.error('❌ OAuth2: Change password failed', error);
      throw this.handleError(error);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string) {
    try {
      const response = await this.http.post('admin/auth/password/forgot', { email });
      return response.data;
    } catch (error) {
      console.error('❌ OAuth2: Forgot password request failed', error);
      throw this.handleError(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    email: string,
    token: string,
    password: string,
    password_confirmation: string
  ) {
    try {
      const response = await this.http.patch('admin/auth/password/reset', {
        email,
        token,
        password,
        password_confirmation,
      });
      return response.data;
    } catch (error) {
      console.error('❌ OAuth2: Reset password failed', error);
      throw this.handleError(error);
    }
  }

  /**
   * Unified error handler
   */
  private handleError(error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data as any;

      const message =
        data?.message ||
        data?.error ||
        error.message ||
        'An error occurred';

      const customError = new Error(message);
      (customError as any).status = status;
      (customError as any).errors = data?.errors;
      (customError as any).originalError = error;

      return customError;
    }

    return error;
  }
}

// Export singleton instance
export const oauth2Service = new OAuth2Service();

// Initialize interceptors when service is imported
if (typeof window !== 'undefined') {
  oauth2Service.setupInterceptors();
}
