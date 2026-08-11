// services/service.ts - Core Services Only
import axios from "axios";
import {
  syncCreateUser,
  syncUpdateUser,
  syncDeleteUser,
  syncCreateRole,
  syncUpdateRole,
  syncDeleteRole,
  syncAssignPermissions,
} from './bookwise-sync.service';
import https from "https";
import {
  RoleResponse,
  RoleDetailResponse,
  CreateRoleResponse,
  UpdateRoleResponse,
  DeleteRoleResponse,
  CreateRolePayload,
  UpdateRolePayload,
  GetRolesParams
} from './interface/Role';
import {
  AssignPermissionsPayload,
  AssignPermissionsResponse,
  RoleWithPermissions,
  Permission
} from "./interface/Role";
import {
  AdminUser,
  AdminUserListResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  CreateAdminUserResponse,
  UpdateAdminUserResponse,
  DeleteAdminUserResponse,
} from './interface/AdminUser';

// Error Handling Types
export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export class CustomError extends Error {
  constructor(
    message: string,
    public status?: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'CustomError';
  }
}

/**
 * Parse Axios error and return user-friendly message
 * @param error - The error object (usually from Axios)
 * @param context - Optional context message (e.g., 'load users', 'create invoice')
 * @returns User-friendly error message
 */
export const parseApiError = (error: unknown, context?: string): string => {
  // Default context-aware message
  const defaultMessage = context ? `Failed to ${context}` : 'An unexpected error occurred';

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as any;
    const message = data?.message || data?.error || error.message;

    // Network errors
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return 'Network connection error. Please check your internet connection and try again.';
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || message?.includes('timeout')) {
      return 'Request timed out. The server is taking too long to respond. Please try again.';
    }

    // Status-based error messages
    switch (status) {
      case 401:
        return 'Your session has expired. Please log in again.';
      case 403:
        if (
          (data?.code === 'plan_limit_exceeded' || data?.code === 'plan_feature_restricted') &&
          data?.message
        ) {
          return data.message;
        }
        return data?.message || 'You do not have permission to perform this action.';
      case 404:
        return context ? `The requested ${context} was not found` : 'Resource not found';
      case 422:
        // Validation errors
        if (data?.errors) {
          const fieldErrors = Object.entries(data.errors)
            .map(([field, messages]) => {
              const msgs = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${msgs.join(', ')}`;
            })
            .join('; ');
          return fieldErrors || 'Validation failed. Please check your input.';
        }
        return data?.message || 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment before trying again.';
      case 500:
      case 502:
      case 503:
        return 'Server error. Our servers are experiencing issues. Please try again later.';
      default:
        return message || defaultMessage;
    }
  }

  // Generic Error object
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
};

// User Form Interface
export interface UserFormValues {
  first_name: string;
  last_name: string;
  user_name: string;
  phone_number: string;
  email?: string;
  active: number;
  profile_photo?: File | null;
  roles: number;
}

// Axios Instance Configuration
const apiBaseUrl = process.env.NEXT_PUBLIC_INVOICE_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  console.warn('WARNING: NEXT_PUBLIC_API_BASE_URL is not set!');
  console.warn('Please create a .env file with your API URL.');
  console.warn('See .env.local.example for reference.');
}

export const http = axios.create({
  baseURL: `${apiBaseUrl}/api/v1/`,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  headers: {
    Accept: 'application/json',
  },
});

// Token Management Helpers
const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
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
    return decoded.exp < currentTime + 30;
  } catch (error) {
    // If we can't decode the token, don't assume it's expired — let the backend decide.
    console.warn('Failed to decode token, letting backend validate:', error);
    return false;
  }
};

let isHandlingTokenExpiration = false;
const handleTokenExpiration = () => {
  if (isHandlingTokenExpiration) return;
  if (typeof window !== 'undefined') {
    isHandlingTokenExpiration = true;

    // Use the same storage keys the rest of the app uses
    const tokenKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken';
    const userKey = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser';
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    localStorage.removeItem('hasSeenPricing');
    localStorage.removeItem('userFirstLogin');
    localStorage.removeItem('trialActivated');
    sessionStorage.removeItem('ui:viewScope');

    window.dispatchEvent(new CustomEvent('token-expired'));

    // Only redirect if not already on an auth page to prevent infinite reload loop
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/auth/')) {
      window.location.href = '/auth/login';
    }

    // Reset flag after navigation completes
    setTimeout(() => { isHandlingTokenExpiration = false; }, 3000);
  }
};

const isLogoutUrl = (url: string | undefined): boolean =>
  Boolean(url?.includes("admin/auth/logout"));

// HTTP Interceptors
http.interceptors.request.use(
  (config) => {
    const tokenStorageKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || "authToken";
    const token = localStorage.getItem(tokenStorageKey);
    const loggingOut = isLogoutUrl(config.url);

    if (token) {
      if (isTokenExpired(token) && !loggingOut) {
        console.warn('Token expired, logging out...');
        handleTokenExpiration();
        return Promise.reject(new Error('Token expired'));
      }

      config.headers["Authorization"] = `Bearer ${token}`;
      config.headers["Accept"] = "application/json";
    }

    // Important: when sending FormData, do not keep JSON content-type.
    // Let the browser set multipart/form-data with boundary automatically.
    if (typeof FormData !== "undefined" && config.data instanceof FormData && config.headers) {
      const headers: any = config.headers;
      if (typeof headers.delete === "function") {
        headers.delete("Content-Type");
        headers.delete("content-type");
      } else {
        delete headers["Content-Type"];
        delete headers["content-type"];
      }
      if (typeof headers.setContentType === "function") {
        headers.setContentType(undefined);
      } else {
        headers["Content-Type"] = undefined;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const url = error.config?.url ?? "";
      const status = error.response?.status;
      const errorData = error.response?.data as any;

      // Invalid / missing token on logout: still finish sign-out locally without surfacing 401
      if (status === 401 && isLogoutUrl(url)) {
        return Promise.resolve({
          data: { success: true, message: "Successfully logged out" },
          status: 200,
          statusText: "OK",
          headers: error.response?.headers ?? {},
          config: error.config!,
        });
      }

      const isExpectedInvoiceNotFound =
        status === 404 &&
        typeof url === "string" &&
        url.includes("admin/invoices/show/");
      const isExpectedContextSwitchFailure =
        typeof url === "string" &&
        url.includes("admin/account/context/switch") &&
        [400, 401, 403, 404, 409, 422].includes(Number(status));
      const isExpectedPermissionScopeFailure =
        (status === 403 || status === 401) &&
        typeof url === "string" &&
        (url.includes("admin/custom-crm") || url.includes("admin/roles"));
      const isExpectedAuthMe401 =
        status === 401 &&
        typeof url === "string" &&
        url.includes("admin/auth/me");
      const isExpectedLogin401 =
        status === 401 &&
        typeof url === "string" &&
        (url.includes("admin/auth/login") || url.includes("admin/auth/register"));
      const isValidationFailure = Number(status) === 422;
      const isClientError = Number(status) >= 400 && Number(status) < 500;

      // Avoid noisy console "errors" for expected fallback and validation paths.
      if (isExpectedAuthMe401) {
        // Session expired on /auth/me — handled below by handleTokenExpiration; no console noise needed.
      } else if (isExpectedLogin401) {
        // Login/register 401 is expected for invalid credentials — UI already shows toast.
      } else if (isExpectedInvoiceNotFound) {
        console.warn("Invoice not found in current context, attempting fallback context resolution.");
      } else if (isExpectedContextSwitchFailure) {
        console.warn("Context switch failed for this candidate context; continuing with fallback resolution.");
      } else if (isExpectedPermissionScopeFailure) {
        // Known backend scoping issue — team_id not resolved from active company context.
        // Resolve with empty data so callers never see a rejected promise / AxiosError.
        console.warn("Permission-scoped endpoint returned 403 (known backend team-resolution issue).", { url });
        return Promise.resolve({
          data: { draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [] },
          status: 200,
          statusText: "OK",
          headers: error.response?.headers ?? {},
          config: error.config!,
        });
      } else if (isValidationFailure) {
        console.warn("Validation failed for API request.", {
          status,
          message: errorData?.message ?? "Validation failed",
          errors: errorData?.errors ?? null,
          url: error.config?.url ?? null,
        });
      } else if (isClientError) {
        console.warn("API client error response.", {
          status,
          statusText: error.response?.statusText ?? null,
          message: errorData?.message ?? null,
          error: errorData?.error ?? null,
          url: error.config?.url ?? null,
        });
      } else {
        console.error('📡 API Error Response:', {
          status: status ?? null,
          statusText: error.response?.statusText ?? null,
          message: errorData?.message ?? null,
          error: errorData?.error ?? null,
          errors: errorData?.errors ?? null,
          url: error.config?.url ?? null
        });
      }

      const isAuthLoginUrl = typeof url === 'string' && (url.includes('admin/auth/login') || url.includes('admin/auth/register'));

      // Any 401 from a protected (non-login, non-logout, non-permission-scope) endpoint
      // means the session is expired or the token is invalid — redirect to login.
      // We no longer rely on specific error message strings; any 401 qualifies.
      const isSessionExpiry =
        status === 401 &&
        !isLogoutUrl(url) &&
        !isAuthLoginUrl &&
        !isExpectedPermissionScopeFailure;

      if (isSessionExpiry) {
        handleTokenExpiration();
        // Return a never-settling promise so the error does NOT propagate as an
        // unhandled rejection. The page is already navigating to /auth/login;
        // any pending caller will be discarded on unload.
        return new Promise(() => { });
      }
    }
    return Promise.reject(error);
  }
);

// Enhanced Error Handling
export const handleApiError = (error: unknown, context: string): never => {
  console.error(`API Error in ${context}:`, error);

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      const tokenStorageKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || "authToken";
      localStorage.removeItem(tokenStorageKey);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
        window.location.href = '/auth/login';
      }
      throw new CustomError('Session expired. Please login again.', 401);
    }

    switch (status) {
      case 404:
        throw new CustomError(`${context} not found`, 404);
      case 422:
        throw new CustomError(
          data?.message || 'Validation failed',
          422,
          data?.errors
        );
      case 500:
        throw new CustomError('Server error. Please try again later.', 500);
      default:
        throw new CustomError(
          data?.message || `Failed to ${context.toLowerCase()}`,
          status
        );
    }
  }

  throw new CustomError(`Failed to ${context.toLowerCase()}`);
};

// ==============================================
// AUTH SERVICES
// ==============================================

// Add this interface at the top
export interface LoginResponse {
  success: boolean;
  message?: string;
  data: {
    user: any;
    token: string;
  };
}

export interface LoginError {
  error: string;
  message: string;
  errors?: Record<string, string[]>;
  code?: number;
}

// Updated login function with better error handling
export const login = async (email: string, password: string) => {
  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const response = await http.post<LoginResponse>("admin/auth/login", formData);

    return response;
  } catch (error) {
    // Enhance error with additional context
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data as LoginError | undefined;

      // Create a more detailed error for the caller
      const enhancedError = new Error(
        errorData?.message ||
        errorData?.error ||
        'Login failed. Please check your credentials and try again.'
      );

      // Attach additional error details
      (enhancedError as any).status = status;
      (enhancedError as any).errors = errorData?.errors;
      (enhancedError as any).originalError = error;

      throw enhancedError;
    }

    throw error;
  }
};

// If you want to add a helper function to format API errors
export const formatApiError = (error: unknown): {
  message: string;
  fieldErrors?: Record<string, string>;
} => {
  const result = {
    message: 'An error occurred',
    fieldErrors: {} as Record<string, string>
  };

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;

    // Get main error message
    result.message =
      data?.message ||
      data?.error ||
      error.message ||
      'An error occurred. Please try again.';

    // Extract field-specific errors
    if (data?.errors && typeof data.errors === 'object') {
      Object.entries(data.errors).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          result.fieldErrors![field] = messages[0];
        } else {
          result.fieldErrors![field] = messages as string;
        }
      });
    }
  } else if (error instanceof Error) {
    result.message = error.message;
  }

  return result;
};

// services/service.ts - Register function
export const register = (
  first_name: string,
  last_name: string,
  account_type: 'company' | 'personal',
  company: string | null,
  phone_number: string,
  email: string,
  password: string
) => {
  const formData = new FormData();
  formData.append("first_name", first_name);
  formData.append("last_name", last_name);
  formData.append("account_type", account_type);

  // Only append company if account_type is 'company' and company is provided
  if (account_type === 'company' && company && company.trim() !== '') {
    formData.append("company", company.trim());
  }

  formData.append("phone_number", phone_number);
  formData.append("email", email);
  formData.append("password", password);

  // Debug log for troubleshooting validation errors
  console.log('Registration payload:', {
    first_name,
    last_name,
    account_type,
    company: account_type === 'company' && company && company.trim() !== '' ? company.trim() : 'NOT SENT',
    phone_number,
    email
  });

  return http.post("admin/auth/register", formData);
};

/** Pre-check email/phone on Invoice API before registration. */
export const validateRegistration = (email: string, phone_number: string) => {
  const formData = new FormData();
  formData.append("email", email);
  formData.append("phone_number", phone_number);
  return http.post("admin/auth/validate-registration", formData);
};

export type RegistrationValidationResult = {
  ok: boolean;
  errors: Record<string, string[]>;
  /** Single user-facing message for toasts (no duplicate / system prefixes). */
  message?: string;
  /** Set when email/phone already exists on BookWise central auth. */
  existingAccount?: import("@/lib/bookwise-existing-account").ExistingAccountField;
};

/** Strip legacy [Invoice] / [BookWise] prefixes and dedupe identical lines. */
function normalizeRegistrationErrors(
  raw: Record<string, string | string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const globalSeen = new Set<string>();

  for (const [field, msgs] of Object.entries(raw)) {
    const list = Array.isArray(msgs) ? msgs : [String(msgs)];
    const unique: string[] = [];

    for (const msg of list) {
      const cleaned = String(msg)
        .replace(/^\[(Invoice|BookWise)\]\s*/gi, "")
        .trim();
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (!globalSeen.has(key)) {
        globalSeen.add(key);
        unique.push(cleaned);
      }
    }

    if (unique.length > 0) {
      out[field] = unique;
    }
  }

  return out;
}

function firstRegistrationMessage(errors: Record<string, string[]>): string | undefined {
  const phone = errors.phone_number?.[0];
  const email = errors.email?.[0];
  return phone || email || Object.values(errors).flat()[0];
}

/**
 * Pre-check email + phone on Invoice and BookWise before signup.
 */
export const validateRegistrationBoth = async (
  email: string,
  phone_number: string
): Promise<RegistrationValidationResult> => {
  const errors: Record<string, string[]> = {};

  // 1) Invoice validate-registration
  try {
    const response = await validateRegistration(email, phone_number);

    if (response.data?.success !== true) {
      const invoiceErrors = normalizeRegistrationErrors(
        (response.data as { errors?: Record<string, string | string[]> })?.errors ?? {
          email: (response.data as { message?: string })?.message || "Validation failed.",
        }
      );
      Object.assign(errors, invoiceErrors);
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 422) {
      const errData =
        (err.response.data as { errors?: Record<string, string | string[]> })
          ?.errors ?? {};
      const invoiceErrors = normalizeRegistrationErrors(
        Object.keys(errData).length > 0
          ? errData
          : {
              email:
                (err.response.data as { message?: string })?.message ||
                "Validation failed.",
            }
      );
      Object.assign(errors, invoiceErrors);
    } else {
      const fallback =
        axios.isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message || err.message
          : "Could not verify your details with Invoice. Please try again.";
      errors.email = [...(errors.email || []), fallback];
    }
  }

  // 2) BookWise validate-registration (only if Invoice passed)
  if (Object.keys(errors).length === 0) {
    try {
      const { validateRegistration } = await import("./bookwise-sync.service");
      const iwRes = await validateRegistration(email, phone_number);

      if ((iwRes.data as { success?: boolean })?.success === false) {
        const platformErrors = normalizeRegistrationErrors(
          (iwRes.data as { errors?: Record<string, string | string[]> })?.errors ?? {
            email:
              (iwRes.data as { message?: string })?.message ||
              "This email or phone is already registered.",
          }
        );
        Object.assign(errors, platformErrors);
      }
    } catch (iwErr: unknown) {
      const syncErr = iwErr as Error & {
        response?: { status?: number; data?: { errors?: Record<string, string | string[]>; message?: string } };
      };

      if (syncErr.response?.status === 422 && syncErr.response.data?.errors) {
        Object.assign(errors, normalizeRegistrationErrors(syncErr.response.data.errors));
      } else {
        const iwMessage =
          syncErr.response?.data?.message ||
          syncErr.message ||
          "This email or phone is already registered.";
        mergeValidationErrors(errors, { email: iwMessage });
      }
    }
  }

  const deduped = dedupeUserFieldErrors(errors);
  const { resolveExistingAccount } = await import("@/lib/bookwise-existing-account");
  const existingAccount = resolveExistingAccount(deduped) ?? undefined;

  return {
    ok: Object.keys(deduped).length === 0,
    errors: deduped,
    message: firstRegistrationMessage(deduped) || "Please check your email and phone number and try again.",
    existingAccount,
  };
};

export type UserFieldsValidationResult = {
  ok: boolean;
  errors: Record<string, string[]>;
  message?: string;
  existingAccount?: import("@/lib/bookwise-existing-account").ExistingAccountField;
};

/** One user-facing line for toasts (no generic duplicate + field detail). */
export function userValidationDisplayMessage(
  errors: Record<string, string[]>,
  fallback?: string
): string {
  const genericPatterns = [
    /^one or more fields are already in use\.?$/i,
    /^validation failed\.?$/i,
    /^validation error\.?$/i,
  ];
  const all = Object.values(errors).flat().map((m) => String(m).trim()).filter(Boolean);
  const specific = all.find((m) => !genericPatterns.some((p) => p.test(m)));
  if (specific) return specific;
  if (all[0]) return all[0];
  return fallback || "Please check the highlighted fields and try again.";
}

function mergeValidationErrors(
  target: Record<string, string[]>,
  source: Record<string, string | string[]>
): void {
  for (const [key, msgs] of Object.entries(source)) {
    const list = Array.isArray(msgs) ? msgs : [String(msgs)];
    target[key] = [...(target[key] || []), ...list];
  }
}

function dedupeUserFieldErrors(
  raw: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const seenGlobal = new Set<string>();

  for (const [field, msgs] of Object.entries(raw)) {
    const unique: string[] = [];
    for (const msg of msgs) {
      const key = msg.toLowerCase().trim();
      if (!key || seenGlobal.has(key)) continue;
      seenGlobal.add(key);
      unique.push(msg);
    }
    if (unique.length) out[field] = unique;
  }

  return out;
}

/** Pre-check email, username, phone on Invoice before sub-user create. */
export const validateUserFields = async (payload: {
  email: string;
  user_name: string;
  phone_number?: string | null;
}) => {
  const normalized = {
    ...payload,
    user_name: payload.user_name.trim().toLowerCase().replace(/\s+/g, "-"),
  };
  return http.post("admin/users/validate-fields", normalized);
};

/**
 * Validate sub-user fields on Invoice and BookWise before create.
 */
export const validateUserFieldsBoth = async (payload: {
  email: string;
  user_name: string;
  phone_number?: string | null;
}): Promise<UserFieldsValidationResult> => {
  const { validateUserFields } = await import("./bookwise-sync.service");
  const normalizedUserName = payload.user_name.trim().toLowerCase().replace(/\s+/g, "-");

  const errors: Record<string, string[]> = {};

  try {
    const localCheck = await validateUserFields({
      ...payload,
      user_name: normalizedUserName,
    });
    if (!localCheck.ok) {
      const localErrors = localCheck.errors ?? {};
      for (const [key, msgs] of Object.entries(localErrors)) {
        const targetKey = key === "username" ? "user_name" : key;
        const list = Array.isArray(msgs) ? msgs : [String(msgs)];
        errors[targetKey] = [...(errors[targetKey] || []), ...list];
      }
      if (Object.keys(localErrors).length === 0 && localCheck.message) {
        errors.email = [...(errors.email || []), localCheck.message];
      }
    }
  } catch (err: unknown) {
    const fallback =
      err instanceof Error
        ? err.message
        : "Could not validate user details.";
    errors.email = [...(errors.email || []), fallback];
  }

  // Only check BookWise if Invoice did not already reject these fields
  if (Object.keys(errors).length === 0) {
    const platformCheck = await validateUserFields({
      email: payload.email,
      user_name: normalizedUserName,
      phone_number: payload.phone_number,
    });

    if (!platformCheck.ok) {
      const platformErrors = platformCheck.errors ?? {};
      for (const [key, msgs] of Object.entries(platformErrors)) {
        const targetKey = key === "username" ? "user_name" : key;
        const list = Array.isArray(msgs) ? msgs : [String(msgs)];
        errors[targetKey] = [...(errors[targetKey] || []), ...list];
      }
      if (Object.keys(platformErrors).length === 0 && platformCheck.message) {
        errors.email = [...(errors.email || []), platformCheck.message];
      }
    }
  }

  const deduped = dedupeUserFieldErrors(errors);
  const { resolveExistingAccount } = await import("@/lib/bookwise-existing-account");
  const existingAccount = resolveExistingAccount(deduped) ?? undefined;

  return {
    ok: Object.keys(deduped).length === 0,
    errors: deduped,
    message: userValidationDisplayMessage(deduped),
    existingAccount,
  };
};

export const verifyOtp = (
  email: string,
  otp: string
) => {
  const formData = new FormData();

  formData.append("email", email);
  formData.append("otp", otp);

  return http.post("/admin/auth/verify-email-otp", formData);
};

export const resendOtp = (
  email: string
) => {
  const formData = new FormData();

  formData.append("email", email);

  return http.post("/admin/auth/resend-otp", formData);
};

export const logout = async () => {
  const tokenStorageKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || "authToken";
  const userStorageKey = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || "authUser";

  const clearLocalAuth = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(tokenStorageKey);
    localStorage.removeItem(userStorageKey);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("ui:viewScope");
  };

  try {
    await http.post("admin/auth/logout");
  } catch {
    // Network failure or unexpected error — session is cleared below
  } finally {
    clearLocalAuth();
  }

  return { data: { success: true, message: "Successfully logged out" } };
};

let currentUserInFlight: Promise<any> | null = null;
let currentUserInFlightStartedAt = 0;
let currentUserRequestSeq = 0;
let currentUserActiveSeq = 0;
const CURRENT_USER_DEDUPE_WINDOW_MS = 600;

export const getCurrentUser = async (options?: { force?: boolean }) => {
  const now = Date.now();
  const force = options?.force === true;

  if (
    !force &&
    currentUserInFlight &&
    now - currentUserInFlightStartedAt < CURRENT_USER_DEDUPE_WINDOW_MS
  ) {
    return currentUserInFlight;
  }

  currentUserInFlightStartedAt = now;
  const requestSeq = ++currentUserRequestSeq;
  currentUserActiveSeq = requestSeq;
  const request = (async () => {
    try {
      const response = await http.get("admin/auth/me", {
        params: { _t: Date.now() },
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      return response.data;
    } catch (error: unknown) {
      // 401 is expected when session is expired/invalid; the interceptor handles
      // redirect silently — no console noise needed.
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw error;
      }
      console.error("Error fetching current user:", error);
      throw error;
    } finally {
      if (currentUserActiveSeq === requestSeq) {
        currentUserInFlight = null;
      }
    }
  })();

  currentUserInFlight = request;
  return request;
};

export interface AccountCompanyContext {
  id?: number;
  company_id?: number;
  host_id?: number;
  account_type?: string;
  company_name?: string | null;
  name?: string | null;
  // Rich details (populated after backend update)
  business_email?: string | null;
  company_address?: string | null;
  company_currency?: string | null;
  company_logo?: string | null;
  vat_no?: string | null;
  phone_number?: string | null;
  is_active?: boolean;
}

export interface AccountContextData {
  current_context?: {
    type?: 'personal' | 'company';
    company_id?: number | null;
    host_id?: number | null;
    company_name?: string | null;
  };
  active_company_id?: number | null;
  available_companies?: AccountCompanyContext[];
}

export interface AccountContextResponse {
  success: boolean;
  message?: string;
  data: AccountContextData;
}

export interface CreateCompanyAccountPayload {
  company_name: string;
  business_email: string;
  company_currency: string;
  company_address?: string;
}

export const getAccountContexts = async (): Promise<AccountContextResponse> => {
  const response = await http.get<AccountContextResponse>("admin/account/contexts");
  return response.data;
};

export const switchAccountContext = async (payload: {
  type: 'personal' | 'company';
  company_id?: number;
}): Promise<AccountContextResponse> => {
  try {
    const response = await http.post<AccountContextResponse>("admin/account/context/switch", payload);
    return response.data;
  } catch (error: unknown) {
    // Some backends return 409 when switching to the already-active context.
    // Treat this as non-fatal and return the latest context snapshot instead.
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      const meResponse = await getCurrentUser();
      const me = (meResponse as any)?.data ?? meResponse;
      return {
        success: true,
        message: "Context already active",
        data: {
          current_context: {
            type: me?.current_context?.type ?? me?.active_context_type ?? "personal",
            company_id:
              me?.current_context?.company_id ??
              me?.active_company_id ??
              null,
            host_id: me?.current_context?.host_id ?? null,
            company_name: me?.current_context?.company_name ?? null,
          },
          active_company_id:
            me?.current_context?.company_id ??
            me?.active_company_id ??
            null,
          available_companies: Array.isArray(me?.available_companies) ? me.available_companies : [],
        },
      };
    }
    throw error;
  }
};

export const createCompanyAccount = async (
  payload: CreateCompanyAccountPayload
): Promise<AccountContextResponse> => {
  const response = await http.post<AccountContextResponse>("admin/account/company/create", payload);
  return response.data;
};

export const toggleCompanyStatus = async (payload: {
  company_id: number;
  is_active: boolean;
}): Promise<AccountContextResponse> => {
  const response = await http.post<AccountContextResponse>("admin/account/company/toggle-status", payload);
  return response.data;
};

export const deleteCompany = async (payload: {
  company_id: number;
}): Promise<AccountContextResponse> => {
  const response = await http.delete<AccountContextResponse>("admin/account/company/delete", { data: payload });
  return response.data;
};

export const resetPassword = async (
  email: string,
  password: string,
  password_confirmation: string,
  token?: string
) => {
  try {
    const response = await http.post("admin/auth/reset-password", {
      email,
      password,
      password_confirmation,
      ...(token && { token }),
      // Invite/create-password flow should also sync password to BookWise.
      ...(token && { sync_bookwise: true })
    });

    // Extra safety: also sync directly from the reset page flow via Next proxy.
    // Keeps both systems in sync even if backend-to-backend call is delayed/fails.
    if (token) {
      const { syncPasswordByEmail } = await import("./bookwise-sync.service");
      await syncPasswordByEmail({ email, password });
    }

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.data?.errors) {
      return Promise.reject(error.response.data.errors);
    }
    if (error instanceof Error) {
      return Promise.reject(error.message);
    }
    return Promise.reject('Failed to reset password');
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const response = await http.post("admin/auth/forgot-password", {
      email
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      if (error.response?.status === 422 && errorData?.errors) {
        throw new CustomError(
          errorData.message || 'Validation failed',
          422,
          errorData.errors
        );
      }
      throw new CustomError(
        errorData?.message || 'Failed to send reset link',
        error.response?.status
      );
    }
    throw new CustomError('Failed to send reset link');
  }
};

// ==============================================
// ROLE SERVICES
// ==============================================

export const roleService = {
  getRoles: (params: GetRolesParams) => {
    return http.get<RoleResponse>('admin/roles', { params });
  },

  createRole: async (payload: CreateRolePayload) => {
    const response = await http.post<CreateRoleResponse>('admin/roles', payload);
    // Mirror to BookWise (fire-and-forget)
    syncCreateRole({ name: payload.name, guard_name: (payload as any).guard_name });
    return response;
  },

  getRoleById: (id: number) => {
    return http.get<RoleDetailResponse>(`admin/roles/${id}`);
  },

  updateRole: async (id: number, payload: UpdateRolePayload) => {
    const response = await http.put<UpdateRoleResponse>(`admin/roles/${id}`, payload);
    // Mirror to BookWise (fire-and-forget)
    syncUpdateRole(id, { name: payload.name, guard_name: (payload as any).guard_name });
    return response;
  },

  deleteRole: async (id: number) => {
    const response = await http.delete<DeleteRoleResponse>(`admin/roles/${id}`);
    // Mirror to BookWise (fire-and-forget)
    syncDeleteRole(id);
    return response;
  }
};
// USER SERVICES
// ==============================================

interface GetUsersApiParams {
  search?: string;
  per_page?: number;
  page?: number;
  is_active?: number;
  account_type?: string;
  company_id?: number | null;
}

export const getUsers = async (params?: {
  search?: string;
  start?: number;
  length?: number;
  draw?: number;
  per_page?: number;
  page?: number;
  is_active?: number;
  company_id?: number | null;
}): Promise<AdminUserListResponse> => {
  try {
    const apiParams: GetUsersApiParams = {};

    if (params?.search) {
      apiParams.search = params.search;
    }

    if (params?.per_page) {
      apiParams.per_page = params.per_page;
    }

    if (params?.page) {
      apiParams.page = params.page;
    }

    if (params?.is_active !== undefined) {
      apiParams.is_active = params.is_active;
    }

    if (params?.company_id != null) {
      apiParams.company_id = params.company_id;
    }

    const response = await http.get<AdminUserListResponse>('admin/users', { params: apiParams });
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || 'Failed to fetch users';
      throw new Error(message);
    }
    throw new Error('Failed to fetch users');
  }
};

export const getUsersAnalytics = async (params?: {
  search?: string;
  start?: number;
  length?: number;
  per_page?: number;
  page?: number;
  is_active?: number;
  account_type?: string;
}): Promise<AdminUserListResponse> => {
  try {
    const apiParams: GetUsersApiParams = {};

    if (params?.search) {
      apiParams.search = params.search;
    }

    if (params?.per_page) {
      apiParams.per_page = params.per_page;
    }

    if (params?.page) {
      apiParams.page = params.page;
    }

    if (params?.is_active !== undefined) {
      apiParams.is_active = params.is_active;
    }

    if (params?.account_type) {
      apiParams.account_type = params.account_type;
    }

    console.log('🔍 Calling super-admin/analytics/users with params:', apiParams);
    const response = await http.get('super-admin/analytics/users', { params: apiParams });
    console.log('📦 Raw response:', response.data);

    // Handle different response formats
    // Format 1: { status: 'success', data: { users: [...], pagination: {...} } }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      const innerData = response.data.data;

      // Check if data contains users array
      if (innerData && typeof innerData === 'object' && 'users' in innerData) {
        const users = Array.isArray(innerData.users) ? innerData.users : [];
        const pagination = innerData.pagination || {};

        return {
          draw: 0,
          recordsTotal: pagination.total || users.length,
          recordsFiltered: pagination.total || users.length,
          data: users
        };
      }

      // If data is directly an array
      if (Array.isArray(innerData)) {
        return {
          draw: 0,
          recordsTotal: innerData.length,
          recordsFiltered: innerData.length,
          data: innerData
        };
      }
    }

    // Format 2: { draw, recordsTotal, recordsFiltered, data }
    if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray(response.data.data)) {
      return response.data;
    }

    // Format 3: Direct array
    if (Array.isArray(response.data)) {
      return {
        draw: 0,
        recordsTotal: response.data.length,
        recordsFiltered: response.data.length,
        data: response.data
      };
    }

    throw new Error('Unexpected response format');
  } catch (error: unknown) {
    console.error('❌ Error fetching users analytics:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      const message = error.response?.data?.message || 'Failed to fetch users analytics';
      throw new Error(message);
    }
    throw new Error('Failed to fetch users analytics');
  }
};

export const getUserById = async (id: number): Promise<AdminUser> => {
  try {
    const response = await http.get<{ success: boolean; data: AdminUser }>(`admin/users/${id}`);
    return response.data.data;
  } catch (error: unknown) {
    console.error(`Error fetching user ${id}:`, error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || `Failed to fetch user ${id}`;
      throw new Error(message);
    }
    throw new Error(`Failed to fetch user ${id}`);
  }
};


export const getAnalyticsUserById = async (id: number): Promise<AdminUser> => {
  try {
    // Fetch base user data (response may be { user, activity_logs, payments } or flat AdminUser)
    const response = await http.get<{ success: boolean; data: any }>(`admin/users/${id}`);
    const rawData = response.data.data;
    const user: AdminUser = rawData?.user
      ? { ...rawData.user, activity_logs: rawData.activity_logs ?? [] }
      : rawData;

    // If roles are numeric IDs, enrich them with role names from admin/roles
    const rolesAreNumeric =
      Array.isArray(user.roles) &&
      user.roles.length > 0 &&
      user.roles.every((r) => typeof r === 'number');

    if (rolesAreNumeric || (!user.role && Array.isArray(user.roles) && user.roles.length > 0)) {
      try {
        const rolesResp = await http.get('admin/roles');
        const allRoles: { id: number; name: string }[] = rolesResp?.data?.data ?? rolesResp?.data ?? [];
        if (Array.isArray(allRoles) && allRoles.length > 0) {
          const roleIds = (user.roles as (number | { id: number })[]).map((r) =>
            typeof r === 'number' ? r : r.id
          );
          const matchedRoles = allRoles.filter((r) => roleIds.includes(r.id));
          if (matchedRoles.length > 0) {
            user.roles = matchedRoles as any;
            user.role = matchedRoles[0].name;
          }
        }
      } catch {
        // ignore, show numeric IDs as fallback
      }
    }

    // Try to enrich with analytics data (last_login, activity_count, etc.)
    try {
      const analyticsResp = await http.get('super-admin/analytics/users', {
        params: { per_page: 100, page: 1 },
      });
      const list: AdminUser[] = analyticsResp?.data?.data?.users ?? analyticsResp?.data?.users ?? [];
      const match = list.find((u: AdminUser) => u.id === id);
      if (match) {
        // Merge analytics fields but keep enriched role data
        return {
          ...user,
          is_active_label: match.is_active_label,
          is_otp_verified: match.is_otp_verified,
          is_otp_verified_label: match.is_otp_verified_label,
          last_login: match.last_login,
          last_login_human: match.last_login_human,
          last_activity: match.last_activity,
          last_activity_human: match.last_activity_human,
          activity_count: match.activity_count,
          created_at_human: match.created_at_human,
          plan: match.plan,
          team: match.team,
          team_id: match.team_id,
          company_id: match.company_id,
          // preserve activity_logs from the detail endpoint
          activity_logs: user.activity_logs,
          // only override role if we don't already have it
          role: user.role || match.role,
          roles: user.roles?.length ? user.roles : match.roles,
        };
      }
    } catch {
      // ignore enrichment failure
    }

    return user;
  } catch (error: unknown) {
    console.error(`Error fetching analytics user ${id}:`, error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || `Failed to fetch user ${id}`);
    }
    throw new Error(`Failed to fetch user ${id}`);
  }
};

export const createUser = async (payload: CreateAdminUserPayload): Promise<CreateAdminUserResponse> => {
  try {
    const normalizedPayload = {
      ...payload,
      user_name: payload.user_name.trim().toLowerCase().replace(/\s+/g, '-'),
    };

    const validation = await validateUserFieldsBoth({
      email: normalizedPayload.email,
      user_name: normalizedPayload.user_name,
      phone_number: normalizedPayload.phone_number,
    });

    if (!validation.ok) {
      const displayMessage = userValidationDisplayMessage(validation.errors);
      const err = new Error(displayMessage) as Error & {
        fieldErrors?: Record<string, string[]>;
        existingAccount?: import("@/lib/bookwise-existing-account").ExistingAccountField;
      };
      err.fieldErrors = validation.errors;
      err.existingAccount = validation.existingAccount;
      throw err;
    }

    const response = await http.post<CreateAdminUserResponse>(
      'admin/users',
      normalizedPayload
    );

    try {
      await syncCreateUser({
        first_name: normalizedPayload.first_name,
        last_name: normalizedPayload.last_name,
        email: normalizedPayload.email,
        phone_number: normalizedPayload.phone_number ?? undefined,
        user_name: normalizedPayload.user_name,
        active: normalizedPayload.active,
        role_name: normalizedPayload.role_name,
        roles: normalizedPayload.roles,
      });
    } catch (syncErr) {
      console.error('BookWise user sync failed after Invoice create:', syncErr);
      throw new Error(
        syncErr instanceof Error
          ? `${syncErr.message} The user may exist only on Invoice — contact support if needed.`
          : 'User was created on Invoice but could not be synced to BookWise.'
      );
    }

    return response.data;
  } catch (error: unknown) {
    console.error('Error creating user:', error);

    const withFields = error as Error & { fieldErrors?: Record<string, string[]> };
    if (withFields.fieldErrors && Object.keys(withFields.fieldErrors).length > 0) {
      throw withFields;
    }

    if (error instanceof Error && error.message && !axios.isAxiosError(error)) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data as {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (status === 422 && data?.errors) {
        const err = new Error(
          userValidationDisplayMessage(data.errors, data.message)
        ) as Error & { fieldErrors?: Record<string, string[]> };
        err.fieldErrors = data.errors;
        throw err;
      }

      throw new Error(data?.message || 'Failed to create user');
    }

    throw new Error('Failed to create user');
  }
};

export const updateUser = async (
  id: number,
  payload: UpdateAdminUserPayload
): Promise<UpdateAdminUserResponse> => {
  try {
    console.log(`🔄 Updating user ${id} with payload:`, payload);

    const formData = new FormData();

    formData.append('_method', 'PUT');

    formData.append('first_name', payload.first_name);
    formData.append('last_name', payload.last_name);
    formData.append('user_name', payload.user_name);

    if (payload.active !== undefined) {
      formData.append('active', payload.active.toString());
    }

    if (payload.roles !== undefined) {
      formData.append('roles', payload.roles.toString());
    }

    formData.append('is_remove', payload.is_remove ? '1' : '0')

    if (payload.email !== undefined && payload.email !== null) {
      formData.append('email', payload.email.trim() === '' ? '' : payload.email);
    }

    if (payload.phone_number !== undefined && payload.phone_number !== null) {
      formData.append('phone_number', payload.phone_number.trim() === '' ? '' : payload.phone_number);
    }

    if (payload.company_designation !== undefined && payload.company_designation !== null) {
      formData.append('company_designation', payload.company_designation.trim() === '' ? '' : payload.company_designation);
    }

    if (payload.short_bio !== undefined) {
      formData.append('short_bio', payload.short_bio === null ? '' : (payload.short_bio || ''));
    }

    if (payload.location !== undefined) {
      formData.append('location', payload.location === null ? '' : (payload.location || ''));
    }

    if (payload.profile_img instanceof File) {
      formData.append('profile_img', payload.profile_img);
      console.log('✅ Profile image added:', payload.profile_img.name, payload.profile_img.size);
    }

    console.log('📋 FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File: ${value.name}, ${value.size} bytes]`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    const response = await http.post<UpdateAdminUserResponse>(
      `admin/users/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      }
    );

    console.log('✅ User updated successfully:', response.data);
    // Mirror to BookWise (fire-and-forget)
    syncUpdateUser(id, {
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email ?? undefined,
      phone_number: payload.phone_number ?? undefined,
      user_name: payload.user_name,
      active: payload.active,
      roles: payload.roles,
    });
    return response.data;
  } catch (error: unknown) {
    console.error(`❌ Error updating user ${id}:`, error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      console.error('Error details:', {
        status,
        statusText: error.response?.statusText,
        data,
        headers: error.response?.headers
      });

      if (status === 422 && data?.errors) {
        const errorMessages = Object.entries(data.errors)
          .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
          .join('; ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      if (status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
        throw new Error('Session expired. Please login again.');
      }

      if (status === 413) {
        throw new Error('File too large. Profile image must be less than 2MB.');
      }

      if (status === 403) {
        throw new Error('You do not have permission to update this user.');
      }

      if (status === 404) {
        throw new Error('User not found.');
      }

      if (status === 500) {
        throw new Error(data?.message || 'Server error. Please try again or contact support.');
      }

      const message = data?.message || `Failed to update user ${id}`;
      throw new Error(message);
    }

    throw new Error(`Failed to update user ${id}`);
  }
};

// services/service.ts - Updated deleteUser function
export const deactivateUser = async (id: number): Promise<DeleteAdminUserResponse> => {
  try {
    console.log(`🔄 Deactivating user ${id}`);
    const response = await http.put<DeleteAdminUserResponse>(`admin/users/${id}/deactivate`);
    console.log(`✅ User ${id} deactivated successfully`);
    return response.data;
  } catch (error: unknown) {
    console.error(`❌ Error deactivating user ${id}:`, error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/auth/login'; throw new Error('Session expired.'); }
      if (error.response?.status === 403) throw new Error('You do not have permission to perform this action.');
      if (error.response?.status === 404) throw new Error('User not found.');
      throw new Error(error.response?.data?.message || `Failed to deactivate user`);
    }
    throw new Error('Failed to deactivate user');
  }
};

export const activateUser = async (id: number): Promise<DeleteAdminUserResponse> => {
  try {
    console.log(`🔄 Activating user ${id}`);
    const response = await http.put<DeleteAdminUserResponse>(`admin/users/${id}/activate`);
    console.log(`✅ User ${id} activated successfully`);
    return response.data;
  } catch (error: unknown) {
    console.error(`❌ Error activating user ${id}:`, error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/auth/login'; throw new Error('Session expired.'); }
      if (error.response?.status === 403) throw new Error('You do not have permission to perform this action.');
      if (error.response?.status === 404) throw new Error('User not found.');
      throw new Error(error.response?.data?.message || `Failed to activate user`);
    }
    throw new Error('Failed to activate user');
  }
};

export const deleteUser = async (id: number, action: string = 'deactivate'): Promise<DeleteAdminUserResponse> => {
  try {
    console.log(`🔄 Performing action "${action}" on user ${id}`);

    let response;
    if (action === 'delete') {
      response = await http.delete<DeleteAdminUserResponse>(`admin/users/${id}`);
      // Mirror deletion to BookWise (fire-and-forget)
      syncDeleteUser(id);
    } else if (action === 'activate') {
      response = await http.put<DeleteAdminUserResponse>(`admin/users/${id}/activate`);
      // Mirror activate as an update (active=1) to BookWise
      syncUpdateUser(id, { active: 1 });
    } else {
      response = await http.put<DeleteAdminUserResponse>(`admin/users/${id}/deactivate`);
      // Mirror deactivate as an update (active=0) to BookWise
      syncUpdateUser(id, { active: 0 });
    }

    console.log(`✅ User ${id} ${action}d successfully:`, response.data.message);
    return response.data;
  } catch (error: unknown) {
    console.error(`❌ Error ${action}ing user ${id}:`, error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
        throw new Error('Session expired. Please login again.');
      }

      if (status === 403) {
        throw new Error('You do not have permission to perform this action.');
      }

      if (status === 404) {
        throw new Error('User not found.');
      }

      if (status === 500) {
        throw new Error(data?.message || 'Server error. Please try again or contact support.');
      }

      const message = data?.message || `Failed to ${action} user ${id}`;
      throw new Error(message);
    }

    throw new Error(`Failed to ${action} user ${id}`);
  }
};

export const getAllPlans = async (
) => {
  return await http.get("/admin/users/get-plans");
};

export const AssignPlan = (
  plan_id: number,
) => {
  const formData = new FormData();

  formData.append('plan_id', plan_id.toString());

  return http.post("/admin/users/update-plan", formData);
};

export const assignPlanToUser = async (userId: number, planId: number): Promise<void> => {
  const formData = new FormData();
  formData.append('user_id', userId.toString());
  formData.append('plan_id', planId.toString());
  await http.post('/admin/users/update-plan', formData);
};

// ==============================================
// COMPANY DETAILS SERVICES
// ==============================================

export interface ChangeCompanyDetailsPayload {
  company_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  company_logo?: File | null;
  profile_img?: File | null;
  business_registration_number?: string | null;
  years_in_business?: number | null;
  partnerships?: string | null;
  service_areas?: string | null;
  company_address?: string | null;
  company_address_nr?: string | null;
  company_address_street?: string | null;
  company_address_city?: string | null;
  company_address_town?: string | null;
  company_address_postcode?: string | null;
  company_address_county?: string | null;
  company_address_country?: string | null;
  business_email?: string | null;
  office_hours?: string | null;
  company_website?: string | null;
  social_media_links_facebook?: string | null;
  social_media_links_instagram?: string | null;
  social_media_links_linkedin?: string | null;
  social_media_links_twitter?: string | null;
  business_highlights?: string | null;
  mission_statement?: string | null;
  about_the_company?: string | null;
  search_properties?: string | null;
  stripe_secret_key?: string | null;
  stripe_published_key?: string | null;
  company_currency?: string | null;
  vat_no?: string | null;
  stripe_fee_percentage?: number | null;
  stripe_fixed_fee?: number | null;
}

export interface ChangeCompanyDetailsResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    user_name: string;
    phone: string;
    profile_img: string | null;
    company: {
      company_name: string;
      company_logo: string;
      business_registration_number: string;
      years_in_business: string;
      vat_no: string | null;
      partnerships: string;
      service_areas: string;
      company_address: string;
      company_address_nr: string | null;
      company_address_street: string | null;
      company_address_city: string | null;
      company_address_town: string | null;
      company_address_postcode: string | null;
      company_address_county: string | null;
      company_address_country: string | null;
      business_email: string;
      office_hours: string;
      phone_number: string | null;
      company_website: string;
      business_highlights: string;
      mission_statement: string;
      about_the_company: string;
      bio: string | null;
    };
    social_links: {
      facebook: string;
      instagram: string;
      linkedin: string;
      twitter: string;
    };
    bank: {
      account_name: string;
      account_number: string;
      sort_code: string;
    };
    stripe: {
      secret_key: string;
      publish_key: string;
    };
    roles: Array<{
      id: number;
      team_id: number;
      name: string;
      host_id: number;
      guard_name: string;
      created_at: string;
      updated_at: string;
      pivot: {
        model_id: number;
        role_id: number;
      };
    }>;
    is_active: string;
  };
}

export const changeCompanyDetails = async (
  payload: ChangeCompanyDetailsPayload
): Promise<ChangeCompanyDetailsResponse> => {
  try {
    const isFileLike = (value: unknown): value is File | Blob =>
      typeof Blob !== "undefined" && value instanceof Blob;

    // Fields that must be sent even when empty so the backend can clear stored values.
    const clearableFields = new Set([
      "account_name",
      "account_number",
      "sort_code",
      "company_address",
      "company_address_nr",
      "company_address_street",
      "company_address_city",
      "company_address_town",
      "company_address_postcode",
      "company_address_county",
      "company_address_country",
    ]);
    const urlFields = new Set([
      "company_website",
      "social_media_links_facebook",
      "social_media_links_instagram",
      "social_media_links_linkedin",
      "social_media_links_twitter",
    ]);
    const isValidUrl = (value: string) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    };

    // Check if payload contains any file uploads
    const hasFiles = isFileLike(payload.company_logo) || isFileLike(payload.profile_img);

    if (hasFiles) {
      // ── FormData path (when files are present) ──────────────────────────
      const formData = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        if (key === "company_logo" || key === "profile_img") {
          if (isFileLike(value)) {
            const fileName =
              value instanceof File && value.name
                ? value.name
                : key === "company_logo"
                  ? "company-logo.png"
                  : "profile-image.png";
            formData.append(key, value, fileName);
            console.log(`📎 Appending ${key} file: ${fileName}, size: ${value.size} bytes`);
          } else {
            console.log(`⏭️ Skipping non-file ${key} value`);
          }
          return;
        }

        if (value === null || value === undefined) {
          console.log(`⏭️ Skipping empty ${key}`);
        } else if (key === 'years_in_business') {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
          if (!isNaN(numValue as number)) {
            formData.append(key, String(numValue));
            console.log(`📊 Appending years_in_business: ${value}`);
          } else {
            console.log(`⏭️ Skipping invalid years_in_business: ${value}`);
          }
        } else {
          const raw = String(value);
          const trimmed = raw.trim();
          if (urlFields.has(key)) {
            if (trimmed.length > 0 && !isValidUrl(trimmed)) {
              throw new Error(`${key} must be a valid URL (http/https) or empty`);
            }
            // Always append URL fields — empty string clears the stored value on the backend.
            formData.append(key, trimmed);
            console.log(trimmed.length > 0 ? `📝 Appending ${key}: ${trimmed}` : `🧹 Appending empty ${key} to clear`);
            return;
          }
          const normalizedLower = trimmed.toLowerCase();
          if (trimmed.length > 0 && normalizedLower !== "null" && normalizedLower !== "undefined") {
            formData.append(key, raw);
            console.log(`📝 Appending ${key}: ${raw}`);
          } else if (clearableFields.has(key)) {
            formData.append(key, "");
            console.log(`🧹 Appending empty ${key} to clear`);
          } else {
            console.log(`⏭️ Skipping empty ${key}`);
          }
        }
      });

      console.log('🚀 Sending FormData request to API...');
      const response = await http.post<ChangeCompanyDetailsResponse>(
        'admin/users/change-company-details',
        formData,
        { timeout: 30000 }
      );
      console.log('✅ Company details updated successfully');
      console.log('[changeCompanyDetails] API response (FormData)', {
        responseDataKeys: response.data ? Object.keys(response.data) : null,
        responseDataCompanyKeys: response.data?.data?.company ? Object.keys(response.data.data.company) : null,
        responseDataCompanyAddress: response.data?.data?.company?.company_address,
        responseDataCompanyAddressNr: response.data?.data?.company?.company_address_nr,
        responseDataCompanyAddressStreet: response.data?.data?.company?.company_address_street,
        responseDataCompanyAddressCity: response.data?.data?.company?.company_address_city,
        responseDataCompanyAddressTown: response.data?.data?.company?.company_address_town,
        responseDataCompanyAddressPostcode: response.data?.data?.company?.company_address_postcode,
        responseDataCompanyAddressCounty: response.data?.data?.company?.company_address_county,
        responseDataCompanyAddressCountry: response.data?.data?.company?.company_address_country,
      });
      // Notify other parts of the app that company details changed so UI snapshots refresh
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('companyUpdated')); } catch (_) {}
      return response.data;
    }

    // ── JSON path (no files) ──────────────────────────────────────────────
    // Use JSON so Laravel's ConvertEmptyStringsToNull middleware does NOT
    // convert empty bank-field values to null before the controller sees them.
    const body: Record<string, unknown> = {};

    Object.entries(payload).forEach(([key, value]) => {
      if (key === "company_logo" || key === "profile_img") {
        // Skip image fields when no file is present
        return;
      }

      if (value === null || value === undefined) {
        // Skip null/undefined — sending null in JSON could overwrite fields
        // that the user didn't intend to change.
        return;
      }

      if (key === 'years_in_business') {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(numValue as number)) {
          body[key] = numValue;
          console.log(`📊 Appending years_in_business: ${numValue}`);
        }
        return;
      }

      const raw = String(value);
      const trimmed = raw.trim();

      if (urlFields.has(key)) {
        if (trimmed.length > 0 && !isValidUrl(trimmed)) {
          throw new Error(`${key} must be a valid URL (http/https) or empty`);
        }
        // Include URL fields even if empty — JSON path won't null-convert them
        body[key] = trimmed;
        console.log(`📝 Appending ${key}: "${trimmed}"`);
        return;
      }

      const normalizedLower = trimmed.toLowerCase();
      if (trimmed.length > 0 && normalizedLower !== "null" && normalizedLower !== "undefined") {
        body[key] = raw;
        console.log(`📝 Appending ${key}: ${raw}`);
      } else if (clearableFields.has(key)) {
        // Always include clearable fields — empty string tells backend to clear
        body[key] = "";
        console.log(`🧹 Appending empty ${key} to clear`);
      } else {
        console.log(`⏭️ Skipping empty ${key}`);
      }
    });

    console.log('🚀 Sending JSON request to API...', body);
    const response = await http.post<ChangeCompanyDetailsResponse>(
      'admin/users/change-company-details',
      body,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
    console.log('✅ Company details updated successfully');
    console.log('[changeCompanyDetails] API response', {
      responseDataKeys: response.data ? Object.keys(response.data) : null,
      responseDataCompanyKeys: response.data?.data?.company ? Object.keys(response.data.data.company) : null,
      responseDataCompanyAddress: response.data?.data?.company?.company_address,
      responseDataCompanyAddressNr: response.data?.data?.company?.company_address_nr,
      responseDataCompanyAddressStreet: response.data?.data?.company?.company_address_street,
      responseDataCompanyAddressCity: response.data?.data?.company?.company_address_city,
      responseDataCompanyAddressTown: response.data?.data?.company?.company_address_town,
      responseDataCompanyAddressPostcode: response.data?.data?.company?.company_address_postcode,
      responseDataCompanyAddressCounty: response.data?.data?.company?.company_address_county,
      responseDataCompanyAddressCountry: response.data?.data?.company?.company_address_country,
      responseDataBankKeys: response.data?.data?.bank ? Object.keys(response.data.data.bank) : null,
      responseDataAccountName: response.data?.data?.bank?.account_name,
      responseDataAccountNumber: response.data?.data?.bank?.account_number,
      responseDataSortCode: response.data?.data?.bank?.sort_code,
    });
    // Notify other parts of the app that company details changed so UI snapshots refresh
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('companyUpdated')); } catch (_) {}
    return response.data;
  } catch (error: unknown) {
    console.error('❌ Error changing company details:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 422 && data?.errors) {
        const errorMessages = Object.entries(data.errors)
          .map(([field, messages]) => {
            const msgArray = Array.isArray(messages) ? messages : [messages];
            return `${msgArray.join(', ')}`;
          })
          .join('\n');
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      if (status === 413) {
        throw new Error('Image file is too large. Please use a smaller image (max 2MB).');
      }

      const message = data?.message || 'Failed to update company details';
      throw new Error(message);
    }

    throw new Error('Failed to update company details');
  }
};


export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const maxSizeBytes = 2048 * 1024; // 2MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG and PNG images are allowed.'
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${Math.round(file.size / 1024)}KB) exceeds maximum allowed size of 2MB (2048KB).`
    };
  }

  return { valid: true };
};

interface RemoveCompanyLogoResponse {
  success?: boolean;
  message?: string;
  data?: any;
}

export const removeCompanyLogo = async (): Promise<RemoveCompanyLogoResponse> => {
  try {
    const response = await http.delete<RemoveCompanyLogoResponse>(
      'admin/users/remove-company-logo',
      {
        timeout: 15000,
      }
    );

    console.log('✅ Company logo removed successfully');
    return response.data;
  } catch (error: unknown) {
    console.error('❌ Error removing company logo:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 404) {
        throw new Error('No company logo found to remove');
      }

      const message = data?.message || 'Failed to remove company logo';
      throw new Error(message);
    }

    throw new Error('Failed to remove company logo');
  }
};

// ==============================================
// PERMISSION SERVICES
// ==============================================

export const assignPermissionsToRole = async (roleId: number, payload: AssignPermissionsPayload) => {
  try {
    console.log(`Assigning permissions to role ${roleId}:`, payload);
    const response = await http.post<AssignPermissionsResponse>(`admin/roles/${roleId}/permissions`, payload);
    // Mirror to BookWise (fire-and-forget)
    if (Array.isArray(payload.permissions)) {
      syncAssignPermissions(roleId, payload.permissions as string[]);
    }
    return response.data;
  } catch (error: unknown) {
    console.error('Error assigning permissions:', error);
    handleApiError(error, `assign permissions to role ${roleId}`);
  }
};

export const getRoleWithPermissions = async (roleId: number) => {
  try {
    console.log(`Fetching role ${roleId} with permissions`);
    const response = await http.get<{ success: boolean; data: RoleWithPermissions }>(`admin/roles/${roleId}`);
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching role with permissions:', error);
    handleApiError(error, `fetch role ${roleId} with permissions`);
  }
};

// ==============================================
// THEME SERVICES
// ==============================================

export interface ChangeThemePayload {
  theme_color?: string;           // optional
  invoice_theme_color?: string;   // optional
}

export interface ChangeThemeResponse {
  success: boolean;
  message: string;
  data: {
    theme_color: string;
    invoice_theme_color?: string;
  };
}

/**
 * Update the authenticated user's theme colors.
 * You can update one or both fields.
 */
export const changeUserTheme = async (
  payload: ChangeThemePayload
): Promise<ChangeThemeResponse> => {
  try {
    console.log('🔄 Changing user theme with payload:', payload);

    // Build body with only the fields that are defined
    const body: Record<string, string> = {};
    if (payload.theme_color !== undefined) {
      body.theme_color = payload.theme_color;
      console.log(`📤 Sending theme_color: ${payload.theme_color}`);
    }
    if (payload.invoice_theme_color !== undefined) {
      body.invoice_theme_color = payload.invoice_theme_color;
      console.log(`📤 Sending invoice_theme_color: ${payload.invoice_theme_color}`);
    }

    const response = await http.put<ChangeThemeResponse>(
      'admin/users/change-theme',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ Theme changed successfully:', response.data);
    return response.data;
  } catch (error: unknown) {
    console.error('❌ Error changing theme:', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 422 && data?.errors) {
        const errorMessages = Object.entries(data.errors)
          .map(([field, messages]) => {
            const msgs = Array.isArray(messages) ? messages : [messages];
            return `${field}: ${msgs.join(', ')}`;
          })
          .join('; ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }

      const message = data?.message || 'Failed to change theme';
      throw new Error(message);
    }

    throw new Error('Failed to change theme');
  }
};


// Available Permissions List
export const AVAILABLE_PERMISSIONS: Permission[] = [
  // User permissions
  { name: "user.create", category: "User Management", description: "Create new users" },
  { name: "user.edit", category: "User Management", description: "Edit existing users" },
  { name: "user.view", category: "User Management", description: "View user information" },
  { name: "user.delete", category: "User Management", description: "Delete users" },

  // Role permissions
  { name: "role.view", category: "Role Management", description: "View roles" },
  { name: "role.create", category: "Role Management", description: "Create new roles" },
  { name: "role.edit", category: "Role Management", description: "Edit existing roles" },
  { name: "role.delete", category: "Role Management", description: "Delete roles" },

  // Permission permissions
  { name: "permission.view", category: "Permission Management", description: "View permissions" },
  { name: "permission.create", category: "Permission Management", description: "Create new permissions" },
  { name: "permission.edit", category: "Permission Management", description: "Edit existing permissions" },
  { name: "permission.delete", category: "Permission Management", description: "Delete permissions" },

  // Dashboard
  { name: "dashboard.view", category: "Dashboard", description: "Access dashboard" },

  // Custom module
  // { name: "custom.view", category: "Custom Management", description: "View custom content" },
  // { name: "custom.create", category: "Custom Management", description: "Create custom content" },
  // { name: "custom.edit", category: "Custom Management", description: "Edit custom content" },
  // { name: "custom.delete", category: "Custom Management", description: "Delete custom content" },
  // { name: "custom.upload-csv", category: "Custom Management", description: "Upload CSV files" },

  // Invoice Client permissions
  { name: "invoice-client.view", category: "Invoice Client Management", description: "View invoice clients" },
  { name: "invoice-client.create", category: "Invoice Client Management", description: "Create invoice clients" },
  { name: "invoice-client.edit", category: "Invoice Client Management", description: "Edit invoice clients" },
  { name: "invoice-client.delete", category: "Invoice Client Management", description: "Delete invoice clients" },

  // Invoice permissions
  { name: "invoice.view", category: "Invoice Management", description: "View invoices" },
  { name: "invoice.manage", category: "Invoice Management", description: "Manage invoices" },
  { name: "invoice.mail", category: "Invoice Management", description: "Send invoice emails" },
  { name: "invoice.create", category: "Invoice Management", description: "Create invoices" },
  { name: "invoice.edit", category: "Invoice Management", description: "Edit invoices" },
  { name: "invoice.delete", category: "Invoice Management", description: "Delete invoices" },

  // Receipt permissions
  { name: "receipt.view", category: "Receipt Management", description: "View receipts" },
  { name: "receipt.create", category: "Receipt Management", description: "Create receipts" },
  { name: "receipt.edit", category: "Receipt Management", description: "Edit receipts" },
  { name: "receipt.delete", category: "Receipt Management", description: "Delete receipts" },
  { name: "receipt.mail", category: "Receipt Management", description: "Send receipt emails" },

  // Company permissions
  { name: "company.change", category: "Company Management", description: "Change company details" },
];