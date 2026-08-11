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
import { GeneralExpense, expenseTypes } from './general-expenses-data';

interface EditExpenseDialogProps {
  expense: GeneralExpense;
  onSave: (expense: GeneralExpense) => void;
  onCancel: () => void;
}

export function EditExpenseDialog({ expense, onSave, onCancel }: EditExpenseDialogProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [editedExpense, setEditedExpense] = useState<GeneralExpense>(expense);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setDateRange({
      from: new Date(expense.dateRange.from),
      to: new Date(expense.dateRange.to)
    });
  }, [expense]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedExpense(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from) return;
    
    const newRange = {
      from: range.from,
      to: range.to || range.from
    };
    
    setDateRange(newRange);
    setEditedExpense(prev => ({
      ...prev,
      dateRange: {
        from: newRange.from.toISOString(),
        to: (newRange.to || newRange.from).toISOString()
      }
    }));
  };

  if (!isMounted) return null;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="w-[95vw] max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>Modify the expense details</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={editedExpense.name}
              onChange={handleChange}
              className="col-span-3"
              placeholder="Expense name"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select
              value={editedExpense.type}
              onValueChange={(value) => setEditedExpense(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="col-span-3">
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
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              value={editedExpense.amount}
              onChange={handleChange}
              className="col-span-3"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="property" className="text-right">
              Property
            </Label>
            <Input
              id="property"
              name="property"
              value={editedExpense.property}
              onChange={handleChange}
              className="col-span-3"
              placeholder="Property name or ID"
            />
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
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(editedExpense)}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}