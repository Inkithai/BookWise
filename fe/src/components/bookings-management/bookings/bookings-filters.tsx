// bookings-filters.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";

interface BookingsFiltersProps {
  dateRange?: DateRange;
  setDateRange: (range?: DateRange) => void;
  guestFilter: string;
  setGuestFilter: (value: string) => void;
  channelFilter: string;
  setChannelFilter: (value: string) => void;
  onClearFilters: () => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
}

export function BookingsFilters({
  dateRange,
  setDateRange,
  guestFilter,
  setGuestFilter,
  channelFilter,
  setChannelFilter,
  onClearFilters,
  itemsPerPage,
  setItemsPerPage,
}: BookingsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker 
          date={dateRange}
          onSelect={setDateRange}
          className="w-[250px] bg-background text-foreground border-border"
        />

        <Select
          value={channelFilter}
          onValueChange={setChannelFilter}
        >
          <SelectTrigger className="w-[180px] bg-background text-foreground border-border">
            <SelectValue placeholder="Booking Channel" />
          </SelectTrigger>
          <SelectContent className="bg-background text-foreground border-border">
            <SelectItem value="all" className="hover:bg-accent hover:text-accent-foreground">All Channels</SelectItem>
            <SelectItem value="airbnb" className="hover:bg-accent hover:text-accent-foreground">Air BNB</SelectItem>
            <SelectItem value="bookings" className="hover:bg-accent hover:text-accent-foreground">Bookings</SelectItem>
            <SelectItem value="uplisting" className="hover:bg-accent hover:text-accent-foreground">Uplisting</SelectItem>
            <SelectItem value="google" className="hover:bg-accent hover:text-accent-foreground">Google</SelectItem>
            <SelectItem value="vrbo" className="hover:bg-accent hover:text-accent-foreground">Vrbo</SelectItem>
            <SelectItem value="booking" className="hover:bg-accent hover:text-accent-foreground">Booking.com</SelectItem>
            <SelectItem value="vrbo-homeaway" className="hover:bg-accent hover:text-accent-foreground">Vrbo (HomeAway)</SelectItem>
            <SelectItem value="bookings-bnb" className="hover:bg-accent hover:text-accent-foreground">Bookings BNB</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={guestFilter}
          onValueChange={setGuestFilter}
        >
          <SelectTrigger className="w-[180px] bg-background text-foreground border-border">
            <SelectValue placeholder="Select Guest" />
          </SelectTrigger>
          <SelectContent className="bg-background text-foreground border-border">
            <SelectItem value="all" className="hover:bg-accent hover:text-accent-foreground">All Guests</SelectItem>
            <SelectItem value="john" className="hover:bg-accent hover:text-accent-foreground">John Doe</SelectItem>
            <SelectItem value="jane" className="hover:bg-accent hover:text-accent-foreground">Jane Smith</SelectItem>
            <SelectItem value="mike" className="hover:bg-accent hover:text-accent-foreground">Mike Johnson</SelectItem>
            <SelectItem value="sarah" className="hover:bg-accent hover:text-accent-foreground">Sarah Williams</SelectItem>
            <SelectItem value="david" className="hover:bg-accent hover:text-accent-foreground">David Brown</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          onClick={onClearFilters}
          className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground border-border"
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
          <SelectTrigger className="w-[70px] bg-background text-foreground border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background text-foreground border-border">
            <SelectItem value="10" className="hover:bg-accent hover:text-accent-foreground">10</SelectItem>
            <SelectItem value="20" className="hover:bg-accent hover:text-accent-foreground">20</SelectItem>
            <SelectItem value="30" className="hover:bg-accent hover:text-accent-foreground">30</SelectItem>
            <SelectItem value="50" className="hover:bg-accent hover:text-accent-foreground">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}