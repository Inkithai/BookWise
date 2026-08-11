// components/users/users-toolbar.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UsersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onClearFilters: () => void;
}

export function UsersToolbar({
  search,
  onSearchChange,
  itemsPerPage,
  onItemsPerPageChange,
  onClearFilters,
}: UsersToolbarProps) {
  const handleClearFilters = () => {
    console.log('Clearing all filters');
    onClearFilters();
  };

  const handleItemsPerPageChange = (value: string) => {
    const numValue = Number(value);
    console.log('Items per page changed to:', numValue);
    onItemsPerPageChange(numValue);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Search changed to:', value);
    onSearchChange(value);
  };

  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Left controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-1">
        {/* Search with icon */}
        <div className="relative w-full md:flex-1 md:max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={handleSearchChange}
            inputMode="search"
            className="w-full pl-10 pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleClearFilters}
          className="w-full md:w-auto whitespace-nowrap min-h-[44px]"
        >
          Clear Filters
        </Button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 md:ml-auto">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Rows per page
        </span>

        <Select
          value={itemsPerPage.toString()}
          onValueChange={handleItemsPerPageChange}
        >
          <SelectTrigger className="w-[100px] md:w-[100px]">
            <SelectValue placeholder="Rows" />
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