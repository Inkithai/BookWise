// data.ts
export interface ExpenseItem {
  id: string;
  description: string;
  property: string;
  amount: number;
  recordedAt: string;
  recordedBy: string;
  category: string;
}

export const properties = [
  '123 Main St',
  '456 Oak Ave',
  '789 Pine Rd',
  '101 Maple Dr',
  '202 Elm Blvd'
];

export const categories = [
  'products',
  'shopping-maintenance',
  'call-out-fees'
];

export const expensesData: ExpenseItem[] = [
  {
    id: '1',
    description: 'Plumbing repair',
    property: '123 Main St',
    amount: 120.5,
    recordedAt: '2023-06-15T10:30:00Z',
    recordedBy: 'John Doe',
    category: 'shopping-maintenance',
  },
  {
    id: '2',
    description: 'Cleaning supplies',
    property: '456 Oak Ave',
    amount: 45.2,
    recordedAt: '2023-06-18T14:15:00Z',
    recordedBy: 'Jane Smith',
    category: 'products',
  },
  {
    id: '3',
    description: 'Emergency call out',
    property: '789 Pine Rd',
    amount: 200.0,
    recordedAt: '2023-06-20T22:45:00Z',
    recordedBy: 'Mike Johnson',
    category: 'call-out-fees',
  },
  ...Array.from({ length: 25 }, (_, i) => ({
    id: (i + 4).toString(),
    description: `Expense ${i + 4}`,
    property: properties[Math.floor(Math.random() * properties.length)],
    amount: Math.floor(Math.random() * 500) + 50,
    recordedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    recordedBy: ['John Doe', 'Jane Smith', 'Mike Johnson'][Math.floor(Math.random() * 3)],
    category: categories[Math.floor(Math.random() * categories.length)],
  })),
];

export const deleteExpense = async (id: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Deleted expense with ID: ${id}`);
      resolve(true);
    }, 300);
  });
};

export const updateExpense = async (expense: ExpenseItem): Promise<ExpenseItem> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Updated expense:', expense);
      resolve({ ...expense });
    }, 300);
  });
};

export const createExpense = async (expense: Omit<ExpenseItem, 'id'>): Promise<ExpenseItem> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newExpense = {
        ...expense,
        id: Math.random().toString(36).substring(2, 9)
      };
      console.log('Created expense:', newExpense);
      resolve(newExpense);
    }, 300);
  });
};