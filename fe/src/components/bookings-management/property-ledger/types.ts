export interface Property {
  id: string;
  name: string;
  
}

export interface ExpenseItem {
  type: string;
  amount: number;
  note?: string;
}

export interface ExpenseRecord {
  rent: number;
  gas: number;
  electricity: number;
  water: number;
  brCouncil: number;
  internet: number;
  binCollection: number;
  maintenance: number;
  netflix: number;
  cctv: number;
  otherExpenses: ExpenseItem[];
  customExpenses: ExpenseItem[];
}

export type LedgerStatus = 'mailed' | 'updated' | 'created';

export interface PropertyLedgerEntry {
  id: string;
  date: Date;
  property: Property;
  totalIncome: number;
  expenses: ExpenseRecord;
  status: LedgerStatus;
}

export type DialogAction = 'view' | 'edit' | 'delete' | 'pdf' | 'mail' | 'update';

export interface InvoiceItem {
  name?: string;
  type?: string;
  amount: number;
}

export interface Invoice {
  id: string;
  date: Date;
  propertyName: string;
  items: InvoiceItem[];
  totalIncome: number;
  totalExpense: number;
  profit: number;
}

export type DateRange = {
  from?: Date;
  to?: Date;
} | undefined;

export interface Invoice {
  id: string;
  date: Date;
  propertyName: string;
  items: InvoiceItem[];
  totalIncome: number;
  totalExpense: number;
  profit: number;
}

export interface InvoiceItem {
  name?: string;
  type?: string;
  amount: number;
}