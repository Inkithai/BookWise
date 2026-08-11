"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Booking } from "./types";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface BookingEditDialogProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedData: Booking) => void;
}

export function BookingEditDialog({
  booking,
  open,
  onOpenChange,
  onSave,
}: BookingEditDialogProps) {
  const [editedBooking, setEditedBooking] = useState<Booking>({...booking});
  const [comment, setComment] = useState("");

  const handleSave = () => {
    const updatedBooking = {
      ...editedBooking,
      details: editedBooking.details.map(detail => ({
        ...detail,
        guest: editedBooking.details[0]?.guest || "",
        property: editedBooking.property,
        status: editedBooking.details[0]?.status || "Confirmed",
        amount: editedBooking.details[0]?.amount || 0,
      }))
    };
    onSave(updatedBooking);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Update the booking details. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="guest" className="text-right">
              Guest
            </Label>
            <Input
              id="guest"
              value={editedBooking.details[0]?.guest || ""}
              onChange={(e) => {
                const details = [...editedBooking.details];
                if (details.length > 0) {
                  details[0].guest = e.target.value;
                }
                setEditedBooking({...editedBooking, details});
              }}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="property" className="text-right">
              Property
            </Label>
            <Input
              id="property"
              value={editedBooking.property}
              onChange={(e) => 
                setEditedBooking({...editedBooking, property: e.target.value})
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={editedBooking.details[0]?.status || "Confirmed"}
              onValueChange={(value) => {
                const details = [...editedBooking.details];
                if (details.length > 0) {
                  details[0].status = value;
                }
                setEditedBooking({...editedBooking, details});
              }}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              value={editedBooking.details[0]?.amount || 0}
              onChange={(e) => {
                const details = [...editedBooking.details];
                if (details.length > 0) {
                  details[0].amount = Number(e.target.value);
                }
                setEditedBooking({...editedBooking, details});
              }}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="comment" className="text-right">
              Comment
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="col-span-3"
              placeholder="Add any additional comments..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}