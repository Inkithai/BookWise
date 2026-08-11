//subscriptionSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

interface SubscriptionState {
  status: 'trial' | 'paid' | 'expired';
  plan: string;
  trialEndDate: string | null;
  daysRemaining: number;
  nextBillingDate: string | null;
  renewalType: string;
  loading: boolean;
  error: string | null;
  trialActivated: boolean; // NEW: Track if trial was activated
}

const initialState: SubscriptionState = {
  status: 'trial',
  plan: 'Demo',
  trialEndDate: null,
  daysRemaining: 14,
  nextBillingDate: null,
  renewalType: 'Monthly',
  loading: false,
  error: null,
  trialActivated: false, // NEW
};

// Mock async thunks - replace with actual API calls
export const fetchSubscriptionData = createAsyncThunk(
  'subscription/fetchData',
  async () => {
    // Replace with actual API call
    const response = await new Promise<SubscriptionState>((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'trial',
          plan: 'Demo',
          trialEndDate: '2024-02-15',
          daysRemaining: 14,
          nextBillingDate: null,
          renewalType: 'Monthly',
          loading: false,
          error: null,
          trialActivated: localStorage.getItem('trialActivated') === 'true', // NEW
        });
      }, 1000);
    });
    return response;
  }
);

export const activateSubscription = createAsyncThunk(
  'subscription/activate',
  async (plan: string) => {
    // Replace with actual API call
    const response = await new Promise<{ success: boolean; plan: string }>((resolve) => {
      setTimeout(() => {
        resolve({ success: true, plan });
      }, 2000);
    });
    return response;
  }
);

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    setSubscriptionStatus: (state, action: PayloadAction<SubscriptionState['status']>) => {
      state.status = action.payload;
    },
    updateTrialDays: (state, action: PayloadAction<number>) => {
      state.daysRemaining = action.payload;
    },
    setSubscriptionPlan: (state, action: PayloadAction<string>) => {
      state.plan = action.payload;
      state.status = 'paid';
    },
    // NEW: Mark trial as activated
    setTrialActivated: (state) => {
      state.trialActivated = true;
      state.status = 'trial';
      state.plan = 'Demo';
      if (typeof window !== 'undefined') {
        localStorage.setItem('trialActivated', 'true');
      }
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSubscriptionData.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
      })
      .addCase(fetchSubscriptionData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch subscription data';
      })
      .addCase(activateSubscription.fulfilled, (state, action) => {
        state.status = 'paid';
        state.plan = action.payload.plan;
        state.trialEndDate = null;
        state.daysRemaining = 0;
        state.trialActivated = false; // Trial is no longer active when paid
      });
  }
});

export const { 
  setSubscriptionStatus, 
  updateTrialDays, 
  setSubscriptionPlan, 
  setTrialActivated, // NEW
  clearError 
} = subscriptionSlice.actions;
export default subscriptionSlice.reducer;