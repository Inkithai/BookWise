"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Booking } from "./types";

interface BookingViewDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingViewDialog({
  booking,
  open,
  onOpenChange,
}: BookingViewDialogProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background text-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">View Booking</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Booking details for {booking.client}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-foreground">Client</Label>
            <div className="text-foreground">{booking.client}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Property</Label>
            <div className="text-foreground">{booking.property}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Category</Label>
            <div className="text-foreground">{booking.category}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Date</Label>
            <div className="text-foreground">{formatDate(booking.date)}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Revenue</Label>
            <div className="text-foreground">£{booking.revenue.toLocaleString('en-GB')}</div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Payout</Label>
            <div className="text-foreground">£{booking.payout.toLocaleString('en-GB')}</div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-lg font-medium text-foreground mb-4">Booking Details</h3>
            {booking.details.map((detail, index) => (
              <div key={detail.id} className="mb-4 last:mb-0">
                <div className="space-y-2">
                  <Label className="text-foreground">Guest #{index + 1}</Label>
                  <div className="text-foreground">{detail.guest}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <div className="text-foreground">{detail.email}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Channel</Label>
                  <div className="text-foreground">{detail.channel}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Check In</Label>
                  <div className="text-foreground">{formatDate(detail.checkIn)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Check Out</Label>
                  <div className="text-foreground">{formatDate(detail.checkOut)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Amount</Label>
                  <div className="text-foreground">£{detail.amount}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Status</Label>
                  <div className="text-foreground">{detail.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}