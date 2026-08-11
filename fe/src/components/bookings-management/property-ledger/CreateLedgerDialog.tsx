// CreateLedgerDialog.tsx
'use client'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from './utils';

interface LedgerEntry {
  id: string;
  property: { name: string; id: string };
  date: Date;
  totalIncome: number;
  totalExpense: number;
  totalProfit: number;
  expenses: {
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
    otherExpenses: { type: string; amount: number; note?: string }[];
    customExpenses: { type: string; amount: number; note?: string }[];
  };
  status: 'created';
}

interface CreateLedgerDialogProps {
  onCreate: (entry: LedgerEntry) => void;
}

export function CreateLedgerDialog({ onCreate }: CreateLedgerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    property: { name: '', id: '' },
    date: new Date(),
    totalIncome: 0,
    totalExpense: 0,
    totalProfit: 0,
    expenses: {
      rent: 0,
      gas: 0,
      electricity: 0,
      water: 0,
      brCouncil: 0,
      internet: 0,
      binCollection: 0,
      maintenance: 0,
      netflix: 0,
      cctv: 0,
      otherExpenses: [] as { type: string; amount: number; note?: string }[],
      customExpenses: [] as { type: string; amount: number; note?: string }[]
    },
    status: 'created' as const
  });

  const calculateExpenseTotals = (expenses: typeof formData.expenses) => {
    const fixedExpenses = Object.entries(expenses)
      .filter(([key]) => !['otherExpenses', 'customExpenses'].includes(key))
      .reduce((sum: number, [, value]) => sum + (typeof value === 'number' ? value : 0), 0);

    const otherExpenses = expenses.otherExpenses.reduce((sum: number, exp) => sum + exp.amount, 0);
    const customExpenses = expenses.customExpenses.reduce((sum: number, exp) => sum + exp.amount, 0);

    return fixedExpenses + otherExpenses + customExpenses;
  };

  const handleCreate = () => {
    const totalExpense = calculateExpenseTotals(formData.expenses);
    const totalProfit = formData.totalIncome - totalExpense;
    
    const newEntry: LedgerEntry = {
      ...formData,
      totalExpense,
      totalProfit,
      id: `ledger-${Date.now()}`,
      status: 'created'
    };
    
    onCreate(newEntry);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Property Ledger
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Property Ledger</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="property-name">Property Name</Label>
              <Input
                id="property-name"
                value={formData.property.name}
                onChange={(e) => setFormData({
                  ...formData,
                  property: { ...formData.property, name: e.target.value }
                })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date.toISOString().split('T')[0]}
                onChange={(e) => setFormData({
                  ...formData,
                  date: new Date(e.target.value)
                })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income">Total Income (£)</Label>
              <Input
                id="income"
                type="number"
                value={formData.totalIncome}
                onChange={(e) => setFormData({
                  ...formData,
                  totalIncome: Number(e.target.value)
                })}
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Total Expense (£)</Label>
              <Input
                value={formatCurrency(calculateExpenseTotals(formData.expenses))}
                readOnly
                className="h-10 bg-gray-100 dark:bg-gray-800"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Profit (£)</Label>
              <Input
                value={formatCurrency(formData.totalIncome - calculateExpenseTotals(formData.expenses))}
                readOnly
                className={`h-10 font-medium ${
                  (formData.totalIncome - calculateExpenseTotals(formData.expenses)) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                } bg-gray-100 dark:bg-gray-800`}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="h-10">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="h-10">
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}