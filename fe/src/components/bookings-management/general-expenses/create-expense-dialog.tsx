'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { expenseTypes,GeneralExpense } from './general-expenses-data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface CreateExpenseDialogProps {
  open: boolean;
  onSave: (expense: Omit<GeneralExpense, 'id'>) => void;
  onCancel: () => void;
}

const initialExpenseState = {
  name: '',
  type: '',
  amount: 0,
  property: '',
  createdBy: 'Admin User',
  dateRange: {
    from: new Date().toISOString(),
    to: new Date().toISOString()
  }
};

const initialDateRangeState = {
  from: new Date(),
  to: new Date()
};

export function CreateExpenseDialog({ open, onSave, onCancel }: CreateExpenseDialogProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [newExpense, setNewExpense] = useState<Omit<GeneralExpense, 'id'>>(initialExpenseState);
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRangeState);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setNewExpense(initialExpenseState);
    setDateRange(initialDateRangeState);
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewExpense(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from) return;
    
    const newRange = {
      from: range.from,
      to: range.to || range.from
    };
    
    setDateRange(newRange);
    setNewExpense(prev => ({
      ...prev,
      dateRange: {
        from: newRange.from.toISOString(),
        to: (newRange.to || newRange.from).toISOString()
      }
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newExpense.name.trim()) {
      newErrors.name = 'Expense name is required';
    }
    
    if (!newExpense.type) {
      newErrors.type = 'Expense type is required';
    }
    
    if (newExpense.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!newExpense.property.trim()) {
      newErrors.property = 'Property is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    
    onSave(newExpense);
    resetForm();
  };

  if (!isMounted) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onCancel();
      }
    }}>
      <DialogContent className="w-[95vw] max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create New Expense</DialogTitle>
          <DialogDescription>Add a new expense record</DialogDescription>
        </DialogHeader>
        
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              Please fix the errors in the form before submitting.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <div className="col-span-3 flex flex-col gap-1">
              <Input
                id="name"
                name="name"
                value={newExpense.name}
                onChange={handleChange}
                className={errors.name ? 'border-destructive' : ''}
                placeholder="Expense name"
              />
              {errors.name && (
                <span className="text-sm text-destructive">{errors.name}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <div className="col-span-3 flex flex-col gap-1">
              <Select
                value={newExpense.type}
                onValueChange={(value) => {
                  setNewExpense(prev => ({ ...prev, type: value }));
                  if (errors.type) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.type;
                      return newErrors;
                    });
                  }
                }}
              >
                <SelectTrigger className={errors.type ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <span className="text-sm text-destructive">{errors.type}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <div className="col-span-3 flex flex-col gap-1">
              <Input
                id="amount"
                name="amount"
                type="number"
                value={newExpense.amount}
                onChange={handleChange}
                className={errors.amount ? 'border-destructive' : ''}
                placeholder="0.00"
              />
              {errors.amount && (
                <span className="text-sm text-destructive">{errors.amount}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="property" className="text-right">
              Property
            </Label>
            <div className="col-span-3 flex flex-col gap-1">
              <Input
                id="property"
                name="property"
                value={newExpense.property}
                onChange={handleChange}
                className={errors.property ? 'border-destructive' : ''}
                placeholder="Property name or ID"
              />
              {errors.property && (
                <span className="text-sm text-destructive">{errors.property}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dateRange" className="text-right">
              Date Range
            </Label>
            <div className="col-span-3">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'MMM dd, yyyy')} -{' '}
                          {format(dateRange.to, 'MMM dd, yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'MMM dd, yyyy')
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={handleDateRangeChange}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

      
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              onCancel();
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Create Expense</Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}