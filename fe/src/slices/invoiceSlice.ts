// slices/invoiceSlice.ts - CORRECTED to match API schema
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Invoice, InvoiceType, Client } from "@/services/interface/invoice";

interface InvoiceState {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  invoiceTypes: InvoiceType[];
  clients: Client[];
  loading: boolean;
  error: string | null;
  pdfThemeColor: string;
  selectedPdfTemplate: string; // ✅ Changed to string to match API
}

const initialState: InvoiceState = {
  invoices: [],
  currentInvoice: null,
  invoiceTypes: [],
  clients: [],
  loading: false,
  error: null,
  pdfThemeColor: "#0F766E",
  selectedPdfTemplate: 'classic', // ✅ Default template
};

const invoiceSlice = createSlice({
  name: "invoices",
  initialState,
  reducers: {
    // Invoices
    setInvoices(state, action: PayloadAction<Invoice[]>) {
      state.invoices = action.payload;
    },
    setCurrentInvoice(state, action: PayloadAction<Invoice | null>) {
      state.currentInvoice = action.payload;
    },
    addInvoice(state, action: PayloadAction<Invoice>) {
      state.invoices.unshift(action.payload);
    },
    updateInvoice(state, action: PayloadAction<Invoice>) {
      const index = state.invoices.findIndex(i => i.id === action.payload.id);
      if (index !== -1) {
        state.invoices[index] = action.payload;
      }
      if (state.currentInvoice && state.currentInvoice.id === action.payload.id) {
        state.currentInvoice = action.payload;
      }
    },
    deleteInvoice(state, action: PayloadAction<number>) {
      state.invoices = state.invoices.filter(i => i.id !== action.payload);
      if (state.currentInvoice && state.currentInvoice.id === action.payload) {
        state.currentInvoice = null;
      }
    },

    // Invoice Types
    setInvoiceTypes(state, action: PayloadAction<InvoiceType[]>) {
      state.invoiceTypes = action.payload;
    },

    // Clients
    setClients(state, action: PayloadAction<Client[]>) {
      state.clients = action.payload;
    },
    addClient(state, action: PayloadAction<Client>) {
      state.clients.push(action.payload);
    },
    updateClient(state, action: PayloadAction<Client>) {
      const index = state.clients.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.clients[index] = action.payload;
      }
    },
    deleteClient(state, action: PayloadAction<number>) {
      state.clients = state.clients.filter(c => c.id !== action.payload);
    },

    // PDF Theme Color
    setPdfThemeColor(state, action: PayloadAction<string>) {
      state.pdfThemeColor = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('pdfThemeColor', action.payload);
      }
    },

    // ✅ CORRECTED: PDF Template Selection - accepts string
    setSelectedPdfTemplate(state, action: PayloadAction<string>) {
      state.selectedPdfTemplate = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedPdfTemplate', action.payload);
      }
    },

    // Loading and Error
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },

    // Clear state
    clearInvoiceState(state) {
      state.currentInvoice = null;
      state.error = null;
    },
    clearAll(state) {
      state.invoices = [];
      state.currentInvoice = null;
      state.invoiceTypes = [];
      state.clients = [];
      state.loading = false;
      state.error = null;
    },

    // Initialize from localStorage
    initializePdfSettings(state) {
      if (typeof window !== 'undefined') {
        const savedColor = localStorage.getItem('pdfThemeColor');
        if (savedColor) {
          state.pdfThemeColor = savedColor;
        }

        const savedTemplate = localStorage.getItem('selectedPdfTemplate');
        if (savedTemplate) {
          // ✅ Accept any string value
          state.selectedPdfTemplate = savedTemplate;
        }
      }
    },
  },
});

export const {
  setInvoices,
  setCurrentInvoice,
  setInvoiceTypes,
  setClients,
  setLoading,
  setError,
  clearError,
  addInvoice,
  updateInvoice,
  deleteInvoice,
  addClient,
  updateClient,
  deleteClient,
  clearInvoiceState,
  clearAll,
  setPdfThemeColor,
  setSelectedPdfTemplate,
  initializePdfSettings,
} = invoiceSlice.actions;

export default invoiceSlice.reducer;