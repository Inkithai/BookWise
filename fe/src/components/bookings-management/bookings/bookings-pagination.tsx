// bookings-pagination.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  showingFrom: number;
  showingTo: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
}

export function BookingsPagination({
  currentPage,
  totalPages,
  totalEntries,
  showingFrom,
  showingTo,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
}: BookingsPaginationProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{showingFrom}</span> to{" "}
        <span className="font-medium text-foreground">{showingTo}</span> of{" "}
        <span className="font-medium text-foreground">{totalEntries}</span> entries
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-foreground">Rows per page</p>
          <Select
            value={`${itemsPerPage}`}
            onValueChange={(value) => {
              onItemsPerPageChange(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px] bg-background text-foreground border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top" className="bg-background text-foreground border-border">
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem 
                  key={pageSize} 
                  value={`${pageSize}`}
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium text-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}