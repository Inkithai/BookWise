"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  className?: string;
  date?: DateRange;
  onSelect?: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onSelect,
}: DateRangePickerProps) {
  const handlePresetSelect = (months: number) => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth() - months, 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    onSelect?.({ from, to });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM dd, yyyy")} -{" "}
                  {format(date.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(date.from, "MMM dd, yyyy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <div className="p-2 border-b">
              <h3 className="text-sm font-medium mb-2">Quick Select</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePresetSelect(1)}
                >
                  Last Month
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePresetSelect(3)}
                >
                  Last 3 Months
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handlePresetSelect(4)}
                >
                  Last 4 Months
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onSelect?.(undefined)}
                >
                  Clear
                </Button>
              </div>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onSelect}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}