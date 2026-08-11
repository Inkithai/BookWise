// src/slices/crmSlice.ts
// src/slices/crmSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CRMTable, TableRecord } from '@/services/interface/crm';

interface CRMState {
  tables: CRMTable[];
  currentTable: CRMTable | null;
  tableRecords: TableRecord[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: CRMState = {
  tables: [],
  currentTable: null,
  tableRecords: [],
  pagination: {
    page: 1,
    perPage: 10,
    total: 0
  },
  loading: false,
  error: null
};

const crmSlice = createSlice({
  name: 'crm',
  initialState,
  reducers: {
    setTables(state, action: PayloadAction<CRMTable[]>) {
      state.tables = action.payload;
    },
    setCurrentTable(state, action: PayloadAction<CRMTable | null>) {
      state.currentTable = action.payload;
    },
    setTableRecords(state, action: PayloadAction<{ records: TableRecord[]; total: number }>) {
      state.tableRecords = action.payload.records;
      state.pagination.total = action.payload.total;
    },
    setPagination(state, action: PayloadAction<{ page?: number; perPage?: number }>) {
      state.pagination = {
        ...state.pagination,
        ...action.payload
      };
    },
    addTable(state, action: PayloadAction<CRMTable>) {
      state.tables.push(action.payload);
    },
    updateTable(state, action: PayloadAction<CRMTable>) {
      const index = state.tables.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.tables[index] = action.payload;
      }
    },
    removeTable(state, action: PayloadAction<string>) {
      state.tables = state.tables.filter(t => t.id !== action.payload);
    },
    addRecord(state, action: PayloadAction<TableRecord>) {
      state.tableRecords.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateRecord(state, action: PayloadAction<TableRecord>) {
      const index = state.tableRecords.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.tableRecords[index] = action.payload;
      }
    },
    removeRecord(state, action: PayloadAction<string | number>) {
      state.tableRecords = state.tableRecords.filter(r => r.id !== action.payload);
      state.pagination.total -= 1;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    resetCrmState(state) {
      Object.assign(state, initialState);
    }
  }
});

export const {
  setTables,
  setCurrentTable,
  setTableRecords,
  setPagination,
  addTable,
  updateTable,
  removeTable,
  addRecord,
  updateRecord,
  removeRecord,
  setLoading,
  setError,
  resetCrmState
} = crmSlice.actions;

export default crmSlice.reducer;