export interface GeneralExpense {
  id: string;
  name: string;
  type: string;
  amount: number;
  property: string;
  createdBy: string;
  dateRange: {
    from: string;
    to: string;
  };
}

export const expenseTypes = [
  'Rent',
  'Gas',
  'Electricity',
  'Water',
  'BR/Council',
  'Internet',
  'Bin Collection',
  'Maintenance',
  'Netflix',
  'CCTV'
];

const properties = ['123 Main St', '456 Oak Ave', '789 Pine Rd', '101 Elm Blvd', '202 Maple Dr'];
const users = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'David Brown'];

export const generateRandomExpenses = (count: number): GeneralExpense[] => {
  return Array.from({ length: count }, (_, i) => {
    const fromDate = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
    const toDate = new Date(fromDate.getTime() + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));
    
    return {
      id: (i + 1).toString(),
      name: `${expenseTypes[Math.floor(Math.random() * expenseTypes.length)]} ${Math.floor(Math.random() * 12) + 1}/${Math.floor(Math.random() * 30) + 1}`,
      type: expenseTypes[Math.floor(Math.random() * expenseTypes.length)],
      amount: Math.floor(Math.random() * 1000) + 50,
      property: properties[Math.floor(Math.random() * properties.length)],
      createdBy: users[Math.floor(Math.random() * users.length)],
      dateRange: {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      }
    };
  });
};

export const generalExpensesData = generateRandomExpenses(50);