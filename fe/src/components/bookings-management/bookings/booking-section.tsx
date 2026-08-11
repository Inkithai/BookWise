"use client";
import { BookingsTable } from "../../../components/bookings-management/bookings/bookings-table";
import { BookingsToolbar } from "@/components/bookings-management/bookings/bookings-toolbar";
import { BookingsPagination } from "@/components/bookings-management/bookings/bookings-pagination";
import { BookingsFilters } from "@/components/bookings-management/bookings/bookings-filters";
import { BookingEditDialog } from "@/components/bookings-management/bookings/booking-edit-dialog";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Booking } from "../../../components/bookings-management/bookings/types";

export default function BookingsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [guestFilter, setGuestFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const showingFrom = (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries);

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setIsEditDialogOpen(true);
  };

  const handleUpdateBooking = (updatedData: Booking) => {
    console.log("Updated booking:", updatedData);
    setIsEditDialogOpen(false);
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setGuestFilter("all");
    setChannelFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <main className="flex-1 p-6 space-y-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
          <BookingsToolbar />
        </div>

        <BookingsFilters
          dateRange={dateRange}
          setDateRange={setDateRange}
          guestFilter={guestFilter}
          setGuestFilter={setGuestFilter}
          channelFilter={channelFilter}
          setChannelFilter={setChannelFilter}
          onClearFilters={clearFilters}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
        />

        <div className="rounded-md border border-border">
          <BookingsTable
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onEditBooking={handleEditBooking}
            dateRange={dateRange}
            guestFilter={guestFilter}
            channelFilter={channelFilter}
            setTotalEntries={setTotalEntries}
            setTotalPages={setTotalPages}
          />
        </div>

        {editingBooking && (
          <BookingEditDialog
            booking={editingBooking}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSave={handleUpdateBooking}
          />
        )}

        <BookingsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalEntries}
          showingFrom={showingFrom}
          showingTo={showingTo}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </main>
    </div>
  );
}