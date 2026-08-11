// services/accounting.service.ts
// Thin API client for the multi-tenant Accounting & Bookkeeping backend.
// Mirrors the existing module service pattern (relative paths via `http`).
import { http } from './service'

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'
export type NormalBalance = 'debit' | 'credit'

export interface Account {
  id: number
  code: string
  name: string
  type: AccountType
  normal_balance: NormalBalance
  is_system: boolean
  is_active: boolean
  opening_balance: number
  current_balance: number
}

export interface JournalEntryLine {
  id: number
  account_id: number
  description: string | null
  debit: number
  credit: number
  partner_type?: string | null
}

export interface JournalEntry {
  id: number
  entry_number: string
  entry_date: string
  status: string
  total_amount: number
  description?: string | null
  lines: JournalEntryLine[]
}

export interface TrialBalanceRow {
  id: number
  code: string
  name: string
  type: AccountType
  balance: number
  trial_debit: number
  trial_credit: number
}

export interface TrialBalance {
  as_of: string
  accounts: TrialBalanceRow[]
  totals: { debit: number; credit: number }
  balanced: boolean
}

const ACCT = 'v1/admin/accounting'
const BANK = 'v1/admin/banking'
const PURCH = 'v1/admin/purchases'
const EXP = 'v1/admin/expenses'

export const accountingService = {
  // Chart of Accounts
  chartOfAccounts: () =>
    http.get<{ data: Account[] }>(`${ACCT}/chart-of-accounts`).then((r) => r.data.data),
  createAccount: (payload: Partial<Account>) =>
    http.post(`${ACCT}/chart-of-accounts`, payload).then((r) => r.data),
  seedSystemAccounts: () =>
    http.post(`${ACCT}/chart-of-accounts/seed-system`).then((r) => r.data),

  // Journal / General Ledger
  journalEntries: () =>
    http.get<{ data: JournalEntry[] }>(`${ACCT}/journal-entries`).then((r) => r.data.data),
  createJournalEntry: (payload: { entry_date: string; description?: string; lines: any[] }) =>
    http.post(`${ACCT}/journal-entries`, payload).then((r) => r.data),
  postJournalEntry: (id: number) =>
    http.post(`${ACCT}/journal-entries/${id}/post`).then((r) => r.data),
  reverseJournalEntry: (id: number) =>
    http.post(`${ACCT}/journal-entries/${id}/reverse`).then((r) => r.data),

  // Financial statements
  trialBalance: (asOf?: string) =>
    http
      .get<{ data: TrialBalance }>(`${ACCT}/reports/trial-balance`, { params: { as_of: asOf } })
      .then((r) => r.data.data),
  profitLoss: (from: string, to: string) =>
    http
      .get(`${ACCT}/reports/profit-loss`, { params: { from, to } })
      .then((r) => r.data.data),
  balanceSheet: (asOf?: string) =>
    http
      .get(`${ACCT}/reports/balance-sheet`, { params: { as_of: asOf } })
      .then((r) => r.data.data),

  // Banking
  bankAccounts: () => http.get(`${BANK}/accounts`).then((r) => r.data.data),
  recordDeposit: (payload: any) => http.post(`${BANK}/transactions/deposit`, payload).then((r) => r.data),
  recordWithdrawal: (payload: any) => http.post(`${BANK}/transactions/withdraw`, payload).then((r) => r.data),

  // Purchases (Accounts Payable)
  vendors: () => http.get(`${PURCH}/vendors`).then((r) => r.data.data),
  bills: () => http.get(`${PURCH}/bills`).then((r) => r.data.data),
  createBill: (payload: any) => http.post(`${PURCH}/bills`, payload).then((r) => r.data),

  // Expenses
  expenses: () => http.get(`${EXP}/`).then((r) => r.data.data),
  createExpense: (payload: any) => http.post(`${EXP}/`, payload).then((r) => r.data),
}

export default accountingService
