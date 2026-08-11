// src/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import usersReducer from './usersSlice';
import roleReducer from '@/slices/roleSlice';
import invoiceReducer from '@/slices/invoiceSlice';
import crmReducer from '@/slices/crmSlice'; // Add this import
import subscriptionReducer from '@/slices/subscriptionSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      users: usersReducer,
      roles: roleReducer,
      invoice: invoiceReducer,
      crm: crmReducer, // Add the CRM reducer
      subscription: subscriptionReducer,
    },

    devTools: process.env.NODE_ENV === "development",
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
