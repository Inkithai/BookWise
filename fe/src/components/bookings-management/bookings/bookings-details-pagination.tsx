// bookings-details-pagination.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface BookingsDetailsPaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function BookingsDetailsPagination({
  currentPage,
  totalPages,
  onPageChange,
}: BookingsDetailsPaginationProps) {
  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <div className="flex items-center space-x-2">
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
          Detail {currentPage} of {totalPages}
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
      </div>
    </div>
  );
}