// LedgerFilters.tsx
'use client'
import { CalendarIcon, Search, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from './types';
import { getDateRangePreset } from './utils';

interface LedgerFiltersProps {
  entriesToShow: string;
  setEntriesToShow: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

export function LedgerFilters({
  entriesToShow,
  setEntriesToShow,
  searchTerm,
  setSearchTerm,
  dateRange,
  setDateRange,
  statusFilter,
  setStatusFilter,
}: LedgerFiltersProps) {
  const applyDatePreset = (preset: string) => {
    setDateRange(getDateRangePreset(preset));
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
      {/* Right side - Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder="Search properties..."
            className="pl-10 dark:bg-gray-800 dark:border-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 dark:bg-gray-800 dark:border-gray-700">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            <SelectItem value="all" className="dark:hover:bg-gray-700">All Status</SelectItem>
            <SelectItem value="created" className="dark:hover:bg-gray-700">Created</SelectItem>
            <SelectItem value="updated" className="dark:hover:bg-gray-700">Updated</SelectItem>
            <SelectItem value="mailed" className="dark:hover:bg-gray-700">Mailed</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto dark:bg-gray-800 dark:border-gray-700">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange?.to ? (
                  <>
                    {format(dateRange.from, 'MMM dd')} -{' '}
                    {format(dateRange.to, 'MMM dd')}
                  </>
                ) : (
                  format(dateRange.from, 'MMM dd, yyyy')
                )
              ) : (
                <span>Date Range</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col">
              <div className="p-2 border-b">
                <h4 className="font-medium text-sm">Quick Select</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => applyDatePreset('thisMonth')}
                    className="justify-start"
                  >
                    This Month
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => applyDatePreset('lastMonth')}
                    className="justify-start"
                  >
                    Last Month
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => applyDatePreset('past6Months')}
                    className="justify-start"
                  >
                    Past 6 Months
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => applyDatePreset('past12Months')}
                    className="justify-start"
                  >
                    Past 12 Months
                  </Button>
                </div>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={{
                  from: dateRange?.from,
                  to: dateRange?.to
                }}
                onSelect={setDateRange}
                numberOfMonths={2}
                className="dark:bg-gray-800"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {/* Left side - Entries per page */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 dark:text-gray-300">Show</span>
        <Select value={entriesToShow} onValueChange={setEntriesToShow}>
          <SelectTrigger className="w-20 dark:bg-gray-800 dark:border-gray-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
            <SelectItem value="10" className="dark:hover:bg-gray-700">10</SelectItem>
            <SelectItem value="25" className="dark:hover:bg-gray-700">25</SelectItem>
            <SelectItem value="50" className="dark:hover:bg-gray-700">50</SelectItem>
            <SelectItem value="100" className="dark:hover:bg-gray-700">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}