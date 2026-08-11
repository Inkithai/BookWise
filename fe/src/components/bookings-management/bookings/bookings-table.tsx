"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Eye, Edit } from "lucide-react";
import { useState, useMemo } from "react";
import { BookingsDetailsPagination } from "./bookings-details-pagination";
import { DateRange } from "react-day-picker";
import { Booking, BookingDetail } from "./types";
import { Dispatch, SetStateAction } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

const generateBookings = (): Booking[] => {
  const bookings: Booking[] = [];
  const properties = ["Beach Villa", "Mountain Cabin", "City Apartment", "Lake House"];
  const clients = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams"];
  const categories = ["Standard", "Deluxe", "Suite", "Premium"];
  const statuses = ["Confirmed", "Pending", "Cancelled"];
  const channels = ["Airbnb", "Booking.com", "Vrbo", "Direct"];

  for (let i = 1; i <= 50; i++) {
    const detailsCount = (i % 4) + 1;
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() - (i % 30));
    
    const details: BookingDetail[] = Array.from({ length: detailsCount }, (_, j) => ({
      id: `DET-${i}-${j+1}`,
      guest: `Guest ${j+1}`,
      email: `guest${j+1}@example.com`,
      phone: `+44${7000000000 + i + j}`,
      channel: channels[(i + j) % channels.length],
      checkIn: new Date(bookingDate).toISOString(),
      checkOut: new Date(new Date(bookingDate).setDate(bookingDate.getDate() + ((i + j) % 7) + 1)).toISOString(),
      amount: 100 + ((i * 17 + j * 23) % 900),
      status: statuses[(i + j) % statuses.length],
      createdAt: new Date(new Date(bookingDate).setDate(bookingDate.getDate() - 1)).toISOString(),
    }));

    bookings.push({
      id: `BK-${i.toString().padStart(3, '0')}`,
      category: categories[i % categories.length],
      client: clients[i % clients.length],
      property: properties[i % properties.length],
      checkIns: detailsCount,
      revenue: details.reduce((sum, detail) => sum + detail.amount, 0),
      payout: Math.floor(details.reduce((sum, detail) => sum + detail.amount, 0) * 0.8),
      details,
      date: bookingDate.toISOString(), // Add the missing date property
    });
  }

  return bookings;
};

const filterBookings = (
  bookings: Booking[],
  dateRange?: DateRange,
  guestFilter: string = "all",
  channelFilter: string = "all"
): { filteredBookings: Booking[], filteredDetails: BookingDetail[] } => {
  const filteredBookings: Booking[] = [];
  const allFilteredDetails: BookingDetail[] = [];

  bookings.forEach(booking => {
    const filteredDetails = booking.details.filter(detail => {
      if (dateRange?.from && dateRange?.to) {
        const checkInDate = new Date(detail.checkIn);
        if (!(checkInDate >= dateRange.from && checkInDate <= dateRange.to)) {
          return false;
        }
      }

      if (guestFilter !== "all" && 
          !detail.guest.toLowerCase().includes(guestFilter.toLowerCase())) {
        return false;
      }

      if (channelFilter !== "all" && 
          !detail.channel.toLowerCase().includes(channelFilter.toLowerCase())) {
        return false;
      }

      return true;
    });

    if (filteredDetails.length > 0) {
      const filteredBooking = {
        ...booking,
        details: filteredDetails,
        checkIns: filteredDetails.length,
        revenue: filteredDetails.reduce((sum, detail) => sum + detail.amount, 0),
        payout: Math.floor(filteredDetails.reduce((sum, detail) => sum + detail.amount, 0) * 0.8)
      };
      filteredBookings.push(filteredBooking);
      allFilteredDetails.push(...filteredDetails);
    }
  });

  return { filteredBookings, filteredDetails: allFilteredDetails };
};

interface BookingsTableProps {
  itemsPerPage: number;
  currentPage: number;
  onEditBooking: (booking: Booking) => void;
  dateRange?: DateRange;
  guestFilter: string;
  channelFilter: string;
  setTotalEntries: Dispatch<SetStateAction<number>>;
  setTotalPages: Dispatch<SetStateAction<number>>;
}

export function BookingsTable({
  itemsPerPage,
  currentPage,
  onEditBooking,
  dateRange,
  guestFilter,
  channelFilter,
  setTotalEntries,
  setTotalPages,
}: BookingsTableProps) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [detailPages, setDetailPages] = useState<Record<string, number>>({});
  const [allBookings] = useState<Booking[]>(generateBookings);

  const { filteredBookings } = useMemo(() => 
    filterBookings(allBookings, dateRange, guestFilter, channelFilter),
    [allBookings, dateRange, guestFilter, channelFilter]
  );

  const totalEntries = filteredBookings.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  
  React.useEffect(() => {
    setTotalEntries(totalEntries);
    setTotalPages(totalPages);
  }, [totalEntries, totalPages, setTotalEntries, setTotalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    setDetailPages(prev => ({
      ...prev,
      [id]: 1
    }));
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "Confirmed":
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>{status}</span>;
      case "Pending":
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>{status}</span>;
      case "Cancelled":
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>{status}</span>;
      default:
        return <span className={`${baseClasses} bg-teal-100 text-teal-800`}>{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const handleViewBooking = (booking: Booking) => {
    router.push(`/bookings-management/report?id=${booking.id}`);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border hover:bg-accent">
          <TableHead className="text-foreground"></TableHead>
          <TableHead className="text-foreground">Category</TableHead>
          <TableHead className="text-foreground">Client</TableHead>
          <TableHead className="text-foreground">Property</TableHead>
          <TableHead className="text-left text-foreground">Checkins</TableHead>
          <TableHead className="text-left text-foreground">Revenue</TableHead>
          <TableHead className="text-left text-foreground">Payout</TableHead>
          <TableHead className="text-foreground">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedBookings.map((booking) => {
          const currentDetailPage = detailPages[booking.id] || 1;
          const detailsPerPage = itemsPerPage; // Use the same rows-per-page setting
          const detailStartIndex = (currentDetailPage - 1) * detailsPerPage;
          const paginatedDetails = booking.details.slice(detailStartIndex, detailStartIndex + detailsPerPage);
          const detailTotalPages = Math.ceil(booking.details.length / detailsPerPage);

          return (
            <React.Fragment key={booking.id}>
              <TableRow className="border-b border-border hover:bg-accent">
                <TableCell>
                  {booking.details.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-foreground hover:bg-primary hover:text-primary-foreground"
                      onClick={() => toggleExpand(booking.id)}
                    >
                      {expandedRows[booking.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-foreground">{booking.category}</TableCell>
                <TableCell className="text-foreground">{booking.client}</TableCell>
                <TableCell className="text-foreground">{booking.property}</TableCell>
                <TableCell className="text-left text-foreground">{booking.checkIns}</TableCell>
                <TableCell className="text-left text-foreground">£{booking.revenue.toLocaleString('en-GB')}</TableCell>
                <TableCell className="text-left text-foreground">£{booking.payout.toLocaleString('en-GB')}</TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-foreground hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleViewBooking(booking)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
              
              {expandedRows[booking.id] && paginatedDetails.length > 0 && (
                <TableRow className="bg-accent">
                  <TableCell colSpan={8} className="p-0 border-b border-border">
                    <div className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border hover:bg-primary/10">
                            <TableHead className="text-foreground">Guest</TableHead>
                            <TableHead className="text-foreground">Email</TableHead>
                            <TableHead className="text-foreground">Phone</TableHead>
                            <TableHead className="text-foreground">Channel</TableHead>
                            <TableHead className="text-foreground">Check In</TableHead>
                            <TableHead className="text-foreground">Check Out</TableHead>
                            <TableHead className="text-foreground">Amount</TableHead>
                            <TableHead className="text-foreground">Status</TableHead>
                            <TableHead className="text-foreground">Created At</TableHead>
                            <TableHead className="text-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedDetails.map((detail) => (
                            <TableRow key={`${booking.id}-${detail.id}`} className="border-b border-border hover:bg-primary/10">
                              <TableCell className="text-foreground">{detail.guest}</TableCell>
                              <TableCell className="text-foreground">{detail.email}</TableCell>
                              <TableCell className="text-foreground">{detail.phone}</TableCell>
                              <TableCell className="text-foreground">{detail.channel}</TableCell>
                              <TableCell className="text-foreground">{formatDate(detail.checkIn)}</TableCell>
                              <TableCell className="text-foreground">{formatDate(detail.checkOut)}</TableCell>
                              <TableCell className="text-foreground">£{detail.amount}</TableCell>
                              <TableCell className="text-foreground">
                                {getStatusBadge(detail.status)}
                              </TableCell>
                              <TableCell className="text-foreground">{formatDate(detail.createdAt)}</TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-foreground hover:bg-primary hover:text-primary-foreground"
                                        onClick={() => onEditBooking(booking)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {booking.details.length > itemsPerPage && (
                        <BookingsDetailsPagination
                          currentPage={currentDetailPage}
                          totalPages={detailTotalPages}
                          itemsPerPage={itemsPerPage}
                          onPageChange={(page) => setDetailPages(prev => ({
                            ...prev,
                            [booking.id]: page
                          }))}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}