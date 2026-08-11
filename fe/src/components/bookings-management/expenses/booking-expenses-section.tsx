'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { BookingExpensesTable } from './booking-expenses-table';
import { expensesData, ExpenseItem, deleteExpense, updateExpense, createExpense, categories } from './data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreateExpenseDialog } from './create-expense-dialog';

type DateRangePreset = 'last-month' | 'last-30-days' | 'this-month' | 'custom';

export function BookingExpensesSection() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('this-month');
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    // Load data after component mounts to avoid hydration mismatch
    setExpenses(expensesData);
  }, []);

  const handleClearAllFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setRangePreset('custom');
    setCategory('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = 
    (dateRange?.from || dateRange?.to) || 
    category !== 'all' || 
    searchQuery !== '';

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = searchQuery === '' || 
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.property.toLowerCase().includes(searchQuery.toLowerCase());

    const expenseDate = new Date(expense.recordedAt);
    const matchesDate = !dateRange?.from || !dateRange?.to || 
      (expenseDate >= dateRange.from && expenseDate <= dateRange.to);

    const matchesCategory = category === 'all' || expense.category === category;

    return matchesSearch && matchesDate && matchesCategory;
  });

  // Pagination
  const totalItems = filteredExpenses.length;
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await deleteExpense(id);
      if (success) {
        setExpenses(prev => prev.filter(expense => expense.id !== id));
        toast.success('Expense deleted successfully');
        setCurrentPage(1); // Reset to first page after deletion
      }
    } catch (error) {
      toast.error('Failed to delete expense');
      console.error('Delete error:', error);
    }
  };

  const handleUpdate = async (updatedExpense: ExpenseItem) => {
    try {
      const result = await updateExpense(updatedExpense);
      setExpenses(prev => 
        prev.map(expense => 
          expense.id === updatedExpense.id ? result : expense
        )
      );
      toast.success('Expense updated successfully');
    } catch (error) {
      toast.error('Failed to update expense');
      console.error('Update error:', error);
    }
  };

  const handleCreate = async (newExpenseData: Omit<ExpenseItem, 'id'>) => {
  try {
    const createdExpense = await createExpense(newExpenseData);
    setExpenses(prev => [createdExpense, ...prev]);
    setCurrentPage(1);
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};
  
  const handlePresetChange = (preset: DateRangePreset) => {
    setRangePreset(preset);
    const today = new Date();

    switch (preset) {
      case 'last-month':
        setDateRange({
          from: startOfMonth(subMonths(today, 1)),
          to: endOfMonth(subMonths(today, 1)),
        });
        break;
      case 'last-30-days':
        setDateRange({
          from: subDays(today, 30),
          to: today,
        });
        break;
      case 'this-month':
        setDateRange({
          from: startOfMonth(today),
          to: today,
        });
        break;
      case 'custom':
        // Don't change date range when switching to custom
        break;
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-foreground">
        Booking Expenses
      </h2>
      <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create Expense
            </Button>
      </div>      
      
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2 items-center">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
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
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-2 border-b">
                    <Select
                      value={rangePreset}
                      onValueChange={(value) => handlePresetChange(value as DateRangePreset)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Quick Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range);
                      if (range?.from && range?.to) {
                        setRangePreset('custom');
                        setIsCalendarOpen(false);
                        setCurrentPage(1);
                      }
                    }}
                    numberOfMonths={2}
                    defaultMonth={dateRange?.from || new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'products' && 'Products'}
                    {cat === 'shopping-maintenance' && 'Shopping/Maintenance'}
                    {cat === 'call-out-fees' && 'Call Out Fees'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllFilters}
              disabled={!hasActiveFilters}
              className="px-2"
            >
              Clear All
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Show</span>
              <Select
                value={`${itemsPerPage}`}
                onValueChange={(value) => handleItemsPerPageChange(Number(value))}
              >
                <SelectTrigger className="w-[80px] h-9">
                  <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <BookingExpensesTable
            expenses={paginatedExpenses}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        </div>
      </div>

      <CreateExpenseDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreate={handleCreate}
      />
    </div>
  );
}