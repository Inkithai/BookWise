'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ExpenseItem, properties, categories } from './data';
import { toast } from 'sonner';

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (expense: ExpenseItem) => Promise<void>;
}

export function CreateExpenseDialog({ open, onOpenChange, onCreate }: CreateExpenseDialogProps) {
  const [newExpense, setNewExpense] = useState<Omit<ExpenseItem, 'id' | 'recordedBy'>>({
    description: '',
    property: properties[0],
    amount: 0,
    recordedAt: new Date().toISOString(), // Initialize with current date
    category: categories[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    description: '',
    property: '',
    amount: '',
    category: ''
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      description: '',
      property: '',
      amount: '',
      category: ''
    };

    if (!newExpense.description.trim()) {
      newErrors.description = 'Description is required';
      isValid = false;
    }

    if (!newExpense.property) {
      newErrors.property = 'Property is required';
      isValid = false;
    }

    if (newExpense.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
      isValid = false;
    }

    if (!newExpense.category) {
      newErrors.category = 'Category is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewExpense(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryChange = (value: string) => {
    setNewExpense(prev => ({
      ...prev,
      category: value
    }));
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  const handlePropertyChange = (value: string) => {
    setNewExpense(prev => ({
      ...prev,
      property: value
    }));
    if (errors.property) {
      setErrors(prev => ({ ...prev, property: '' }));
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setNewExpense(prev => ({
      ...prev,
      recordedAt: (date || new Date()).toISOString() // Fallback to today if undefined
    }));
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onCreate({
        ...newExpense,
        id: '', // Will be generated
        recordedBy: 'Current User'
      });
      
      // Reset form
      setNewExpense({
        description: '',
        property: properties[0],
        amount: 0,
        recordedAt: new Date().toISOString(),
        category: categories[0]
      });
      onOpenChange(false);
      toast.success('Expense created successfully');
    } catch (error) {
      toast.error('Failed to create expense');
      console.error('Create error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        // Reset form when closing
        setNewExpense({
          description: '',
          property: properties[0],
          amount: 0,
          recordedAt: new Date().toISOString(),
          category: categories[0]
        });
        setErrors({
          description: '',
          property: '',
          amount: '',
          category: ''
        });
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Expense</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category*
            </Label>
            <div className="col-span-3">
              <Select 
                value={newExpense.category} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
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
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description*
            </Label>
            <div className="col-span-3">
              <Input
                id="description"
                name="description"
                value={newExpense.description}
                onChange={handleChange}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">{errors.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="property" className="text-right">
              Property*
            </Label>
            <div className="col-span-3">
              <Select 
                value={newExpense.property} 
                onValueChange={handlePropertyChange}
              >
                <SelectTrigger className={errors.property ? 'border-red-500' : ''}>
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
              {errors.property && (
                <p className="text-red-500 text-xs mt-1">{errors.property}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount (£)*
            </Label>
            <div className="col-span-3">
              <Input
                id="amount"
                name="amount"
                type="number"
                value={newExpense.amount}
                onChange={handleChange}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Recorded At
            </Label>
            <div className="col-span-3">
              <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(new Date(newExpense.recordedAt), 'dd/MM/yy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={new Date(newExpense.recordedAt)}
                  onSelect={handleDateChange}
                  initialFocus
                  defaultMonth={new Date()}
                />
              </PopoverContent>
            </Popover>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="attachment" className="text-right">
              Attachment
            </Label>
            <div className="col-span-3">
              <Input
                id="attachment"
                type="file"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}