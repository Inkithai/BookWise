// slices/authSlice.ts - COMPLETELY FIXED VERSION
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User, RawUserData, mapUser } from "@/services/interface/User";
import { getCurrentUser } from "@/services/service";
import axios from "axios";

interface InitialState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isFirstLogin: boolean;
  authUser: User | null;
  isFetchingUser: boolean;
  userFetchFailed: boolean;
}

const initialState: InitialState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isFirstLogin: false,
  authUser: null,
  isFetchingUser: false,
  userFetchFailed: false,
};

// Helper to check token expiry
const checkTokenExpiry = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return false; // Don't assume expired if malformed

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
    return decoded.exp < currentTime;
  } catch (error) {
    // If we can't decode the token, don't assume it's expired — let the backend decide.
    console.warn('Failed to decode token, letting backend validate:', error);
    return false;
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitialized = true;

      if (typeof window !== 'undefined') {
        localStorage.setItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser', JSON.stringify(action.payload));
      }
    },
    setAuthUserFromRawData(state, action: PayloadAction<RawUserData>) {
      state.user = mapUser(action.payload);
      state.isAuthenticated = true;
      state.isInitialized = true;

      if (typeof window !== 'undefined') {
        localStorage.setItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser', JSON.stringify(state.user));
      }
    },
    clearAuthUser(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.isFirstLogin = false;

      if (typeof window !== 'undefined') {
        localStorage.removeItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser');
        localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken');
        localStorage.removeItem('hasSeenPricing');
        localStorage.removeItem('userFirstLogin');
        localStorage.removeItem('trialActivated');
      }
    },
    restoreAuth(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    setInitialized(state) {
      state.isInitialized = true;
    },
    handleTokenExpired(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.isFirstLogin = false;

      if (typeof window !== 'undefined') {
        localStorage.removeItem(process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser');
        localStorage.removeItem(process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken');
        localStorage.removeItem('hasSeenPricing');
        localStorage.removeItem('userFirstLogin');
        localStorage.removeItem('trialActivated');
      }
    },
    setFirstLogin(state, action: PayloadAction<boolean>) {
      state.isFirstLogin = action.payload;
    },
    markPricingAsSeen(state) {
      state.isFirstLogin = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasSeenPricing', 'true');
      }
    },
    // CRITICAL FIX: Enhanced markTrialActivated
    markTrialActivated(state) {
      state.isFirstLogin = false; // CRITICAL: Set to false immediately

      if (typeof window !== 'undefined') {
        // Set all flags to ensure trial is activated
        localStorage.setItem('trialActivated', 'true');
        localStorage.setItem('hasSeenPricing', 'true');

        // CRITICAL: Remove userFirstLogin flag
        localStorage.removeItem('userFirstLogin');
      }
    },
    resetFirstLogin(state) {
      state.isFirstLogin = true;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('hasSeenPricing');
        localStorage.removeItem('trialActivated');
        localStorage.setItem('userFirstLogin', 'true');
      }
    },
    // set auth user
    setFullUser(state, action: PayloadAction<User>) {
      state.authUser = action.payload;
      state.isFetchingUser = false;
      state.userFetchFailed = false;
    },
    setFetchingUser(state, action: PayloadAction<boolean>) {
      state.isFetchingUser = action.payload;
    },
    setUserFetchFailed(state, action: PayloadAction<boolean>) {
      state.userFetchFailed = action.payload;
      state.isFetchingUser = false;
    }
  },
});

export const {
  setAuthUser,
  setAuthUserFromRawData,
  clearAuthUser,
  restoreAuth,
  setInitialized,
  handleTokenExpired,
  setFirstLogin,
  markPricingAsSeen,
  markTrialActivated,
  resetFirstLogin,
  setFullUser,
  setFetchingUser,
  setUserFetchFailed
} = authSlice.actions;

export default authSlice.reducer;

// FIXED: Initialize auth with proper trial check and OAuth2
export const initializeAuth = () => {
  return (dispatch: any) => {
    try {
      const tokenKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken';
      const userKey = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser';

      const token = localStorage.getItem(tokenKey);
      const userStr = localStorage.getItem(userKey);
      const trialActivated = localStorage.getItem('trialActivated');

      if (token && userStr) {
        // Check if token is expired
        const isExpired = checkTokenExpiry(token);

        if (isExpired) {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem(userKey);
          localStorage.removeItem('hasSeenPricing');
          localStorage.removeItem('userFirstLogin');
          localStorage.removeItem('trialActivated');
          dispatch(setInitialized());
          return;
        }

        // Token is valid, restore user
        const user = JSON.parse(userStr) as User;
        dispatch(restoreAuth(user));

        // CRITICAL FIX: If trial is activated, ALWAYS set isFirstLogin to false
        if (trialActivated === 'true') {
          dispatch(setFirstLogin(false));
          return;
        }

        // If trial is NOT activated, check normal first login logic
        const hasSeenPricing = localStorage.getItem('hasSeenPricing');
        const userFirstLogin = localStorage.getItem('userFirstLogin');

        const isFirstLogin = userFirstLogin === 'true' && hasSeenPricing !== 'true';

        dispatch(setFirstLogin(isFirstLogin));
      } else {
        dispatch(setInitialized());
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        const tokenKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || 'authToken';
        const userKey = process.env.NEXT_PUBLIC_USER_STORAGE_KEY || 'authUser';
        localStorage.removeItem(tokenKey);
        localStorage.removeItem(userKey);
        localStorage.removeItem('hasSeenPricing');
        localStorage.removeItem('userFirstLogin');
        localStorage.removeItem('trialActivated');
      }
      dispatch(setInitialized());
    }
  };
};

export const getTokenExpiryTime = (token: string): number | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);

    return decoded.exp || null;
  } catch (error) {
    console.error('Failed to get token expiry:', error);
    return null;
  }
};

export const getTimeUntilExpiry = (token: string): number | null => {
  const expiryTime = getTokenExpiryTime(token);
  if (!expiryTime) return null;

  const currentTime = Math.floor(Date.now() / 1000);
  return expiryTime - currentTime;
};




// get full user — always merges /auth/me into state.user + authUser (sidebar reads state.user)
export const getFullUser = () => {
  return async (dispatch: any, getState: any) => {
    const { isFetchingUser } = getState().auth;

    if (isFetchingUser) return;

    const applyMe = (raw: any) => {
      const userData = raw?.data ?? raw;
      if (userData && typeof userData === 'object' && 'id' in userData) {
        dispatch(setAuthUser(userData));
        dispatch(setFullUser(userData));
      }
    };

    try {
      dispatch(setFetchingUser(true));
      const response = await getCurrentUser();
      applyMe(response);
    } catch (e) {
      // 401 is already handled by the interceptor (clears token + redirects to login).
      // Retrying on 401 causes a redirect loop, so only retry for non-auth errors.
      const status = axios.isAxiosError(e) ? (e.response?.status ?? 0) : 0;
      const isSessionExpired = status === 401;
      // 403 on /auth/me means the sub-user lacks admin access to that endpoint,
      // NOT that their session is expired. Keep existing user data and don't block the app.
      const isPermissionDenied = status === 403;

      if (isPermissionDenied) {
        // Sub-user may not have access to /auth/me but is still authenticated.
        // Don't mark as fetch-failed — existing Redux user data (from login) is still valid.
        console.warn("Permission denied fetching current user (sub-user). Using cached user data.");
      } else if (!isSessionExpired) {
        console.error("Error fetching current user:", e);
        dispatch(setUserFetchFailed(true));

        setTimeout(async () => {
          try {
            const response = await getCurrentUser();
            applyMe(response);
          } catch (retryError) {
            console.error("Retry failed for fetching current user:", retryError);
          } finally {
            dispatch(setFetchingUser(false));
          }
        }, 2000);
      } else {
        // 401 handled silently by interceptor — no console noise needed.
        dispatch(setUserFetchFailed(true));
      }
    } finally {
      dispatch(setFetchingUser(false));
    }
  };
};


