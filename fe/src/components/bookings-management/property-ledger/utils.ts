// utils.ts
import { PropertyLedgerEntry, ExpenseRecord, DateRange } from './types';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const calculateExpenseTotals = (expenses: ExpenseRecord) => {
  const fixedExpenses = Object.entries(expenses)
    .filter(([key]) => !['otherExpenses', 'customExpenses'].includes(key))
    .reduce((sum, [, value]) => sum + (typeof value === 'number' ? value : 0), 0);

  const otherExpenses = expenses.otherExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const customExpenses = expenses.customExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return fixedExpenses + otherExpenses + customExpenses;
};

export const calculateProfit = (entry: PropertyLedgerEntry) => {
  const totalExpense = calculateExpenseTotals(entry.expenses);
  return entry.totalIncome - totalExpense;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'LKR',
  }).format(value);
};

export const filterEntries = (
  entries: PropertyLedgerEntry[],
  searchTerm: string,
  dateRange: DateRange,
  statusFilter: string
) => {
  return entries.filter(entry => {
    const matchesSearch = entry.property.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateRange) {
      const entryDate = new Date(entry.date);
      if (dateRange.from) matchesDate = matchesDate && entryDate >= dateRange.from;
      if (dateRange.to) matchesDate = matchesDate && entryDate <= dateRange.to;
    }
    
    let matchesStatus = true;
    if (statusFilter !== 'all') matchesStatus = entry.status === statusFilter;
    
    return matchesSearch && matchesDate && matchesStatus;
  });
};

export const generateInvoice = (entry: PropertyLedgerEntry) => {
  const items = [
    ...Object.entries(entry.expenses)
      .filter(([key]) => !['otherExpenses', 'customExpenses'].includes(key))
      .map(([name, amount]) => ({ 
        name: name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), 
        amount: amount as number 
      })),
    ...entry.expenses.otherExpenses,
    ...entry.expenses.customExpenses
  ];

  const totalExpense = calculateExpenseTotals(entry.expenses);
  const profit = calculateProfit(entry);

  return {
    id: `LEDGER-${entry.id.slice(0, 8)}`,
    date: entry.date,
    propertyName: entry.property.name,
    items,
    totalIncome: entry.totalIncome,
    totalExpense,
    profit
  };
};

export const getDateRangePreset = (preset: string): DateRange => {
  const today = new Date();
  switch (preset) {
    case 'thisMonth':
      return {
        from: startOfMonth(today),
        to: endOfMonth(today)
      };
    case 'lastMonth':
      const lastMonth = subMonths(today, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      };
    case 'past6Months':
      return {
        from: subMonths(today, 6),
        to: today
      };
    case 'past12Months':
      return {
        from: subMonths(today, 12),
        to: today
      };
    default:
      return undefined;
  }
};