'use client';

import { CalendarIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';

type DateRangePreset =
  | 'past-month'
  | 'past-6-months'
  | 'past-12-months'
  | 'custom';

interface PropertyPLControlsProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  rangePreset: DateRangePreset;
  setRangePreset: (preset: DateRangePreset) => void;
  isGeneratingPDF: boolean;
  generatePDF: () => void;
}

export function PropertyPLControls({
  dateRange,
  setDateRange,
  rangePreset,
  setRangePreset,
  isGeneratingPDF,
  generatePDF,
}: PropertyPLControlsProps) {
  const handlePresetChange = (preset: DateRangePreset) => {
    setRangePreset(preset);
    const today = new Date();

    switch (preset) {
      case 'past-month':
        setDateRange({
          from: startOfMonth(subMonths(today, 1)),
          to: endOfMonth(subMonths(today, 1)),
        });
        break;
      case 'past-6-months':
        setDateRange({
          from: startOfMonth(subMonths(today, 5)),
          to: endOfMonth(today),
        });
        break;
      case 'past-12-months':
        setDateRange({
          from: startOfMonth(subMonths(today, 11)),
          to: endOfMonth(today),
        });
        break;
      case 'custom':
        break;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">
          Date Range
        </span>
        <div className="flex gap-2">
          <Select
            value={rangePreset}
            onValueChange={(value) =>
              handlePresetChange(value as DateRangePreset)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="past-month">Past Month</SelectItem>
              <SelectItem value="past-6-months">Past 6 Months</SelectItem>
              <SelectItem value="past-12-months">Past 12 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {rangePreset === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={'outline'}
                  className={cn(
                    'w-[260px] justify-start text-left font-normal',
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
              <PopoverContent className="w-auto p-0" align="end">
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
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-muted-foreground">
          Export
        </span>
        <Button
          variant="outline"
          className="w-[260px] justify-start text-left font-normal gap-2"
          onClick={generatePDF}
          disabled={isGeneratingPDF}
        >
          <FileText className="h-4 w-4" />
          <span>{isGeneratingPDF ? 'Generating...' : 'GENERATE PDF'}</span>
        </Button>
      </div>
    </div>
  );
}