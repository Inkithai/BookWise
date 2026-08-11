'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays, startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { GeneralExpensesTable } from './general-expenses-table';
import { generalExpensesData, GeneralExpense, expenseTypes } from './general-expenses-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CreateExpenseDialog } from './create-expense-dialog';

type DateRangePreset = 'last-month' | 'last-30-days' | 'this-month' | 'custom';

export function GeneralExpensesSection() {
  const [expenses, setExpenses] = useState<GeneralExpense[]>(generalExpensesData);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('this-month');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.property.toLowerCase().includes(searchQuery.toLowerCase());

    const expenseFromDate = new Date(expense.dateRange.from);
    const expenseToDate = new Date(expense.dateRange.to);
    const matchesDate = !dateRange?.from || !dateRange?.to || 
      (expenseFromDate >= dateRange.from && expenseToDate <= dateRange.to);

    const matchesType = typeFilter === 'all' || expense.type === typeFilter;

    return matchesSearch && matchesDate && matchesType;
  });

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

  const handleDelete = (id: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id));
    toast.success('Expense deleted successfully');
  };

  const handleUpdate = (updatedExpense: GeneralExpense) => {
    setExpenses(prev => 
      prev.map(expense => 
        expense.id === updatedExpense.id ? updatedExpense : expense
      )
    );
    toast.success('Expense updated successfully');
  };

  const handleCreate = (newExpense: Omit<GeneralExpense, 'id'>) => {
    const expenseWithId = {
      ...newExpense,
      id: Date.now().toString(),
    };
    setExpenses(prev => [...prev, expenseWithId]);
    toast.success('Expense created successfully');
    setCreateDialogOpen(false);
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
        break;
    }
  };

  // Function to clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setDateRange({
      from: startOfMonth(new Date()),
      to: new Date(),
    });
    setRangePreset('this-month');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || 
                         typeFilter !== 'all' || 
                         rangePreset !== 'this-month' || 
                         (dateRange?.from && dateRange.from.getTime() !== startOfMonth(new Date()).getTime());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">General Expenses</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Expense
        </Button>
      </div>
      
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[240px] justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} -{' '}
                        {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex items-center gap-2 p-2">
                  <Select
                    value={rangePreset}
                    onValueChange={(value) => handlePresetChange(value as DateRangePreset)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Date Range" />
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
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) {
                      setRangePreset('custom');
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {expenseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
<Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className="px-2"
            >
              Clear All
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">Rows per page</span>
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

        <div className="mt-4">
          <GeneralExpensesTable
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
        open={createDialogOpen}
        onSave={handleCreate}
        onCancel={() => setCreateDialogOpen(false)}
      />
    </div>
  );
}