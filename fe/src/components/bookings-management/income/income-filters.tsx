"use client";

import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IncomeFiltersProps {
  dateRange?: DateRange;
  setDateRange: (range?: DateRange) => void;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  onClearFilters: () => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
}

export function IncomeFilters({
  dateRange,
  setDateRange,
  searchFilter,
  setSearchFilter,
  onClearFilters,
  itemsPerPage,
  setItemsPerPage,
}: IncomeFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker 
          date={dateRange}
          onSelect={setDateRange}
          className="w-[250px]"
        />
        <Input
          placeholder="Search descriptions..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-[250px]"
        />
        <Button 
          variant="outline" 
          onClick={onClearFilters}
        >
          Clear Filters
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">Rows per page</p>
        <Select
          value={`${itemsPerPage}`}
          onValueChange={(value) => setItemsPerPage(Number(value))}
        >
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="30">30</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}