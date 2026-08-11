'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExpenseItem, properties, categories } from './data';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EditExpenseDialogProps {
  expense: ExpenseItem;
  onSave: (expense: ExpenseItem) => void;
  onCancel: () => void;
}

export function EditExpenseDialog({ expense, onSave, onCancel }: EditExpenseDialogProps) {
  const [editedExpense, setEditedExpense] = useState<ExpenseItem>({ ...expense });
  const [recordedAt, setRecordedAt] = useState<Date | undefined>(new Date(expense.recordedAt));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedExpense(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleCategoryChange = (value: string) => {
    setEditedExpense(prev => ({
      ...prev,
      category: value
    }));
  };

  const handlePropertyChange = (value: string) => {
    setEditedExpense(prev => ({
      ...prev,
      property: value
    }));
  };

  const handleSave = () => {
    if (!editedExpense.description || !editedExpense.property || editedExpense.amount <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    onSave({
      ...editedExpense,
      recordedAt: recordedAt?.toISOString() || editedExpense.recordedAt
    });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Select value={editedExpense.category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'products' && 'Products'}
                    {category === 'shopping-maintenance' && 'Shopping/Maintenance'}
                    {category === 'call-out-fees' && 'Call Out Fees'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              name="description"
              value={editedExpense.description}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="property" className="text-right">
              Property
            </Label>
            <Select value={editedExpense.property} onValueChange={handlePropertyChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map(property => (
                  <SelectItem key={property} value={property}>
                    {property}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount (£)
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              value={editedExpense.amount}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Recorded At
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !recordedAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {recordedAt ? format(recordedAt, 'dd/MM/yy') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={recordedAt}
                  onSelect={setRecordedAt}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}