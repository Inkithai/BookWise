'use client';

import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { CancellationRequest } from './types';

interface EditCancellationDialogProps {
  cancellation: CancellationRequest;
  onSave: (updatedCancellation: CancellationRequest) => void;
  onOpenChange: (open: boolean) => void;
}

export function EditCancellationDialog({ cancellation, onSave, onOpenChange }: EditCancellationDialogProps) {
  const [editedCancellation, setEditedCancellation] = useState(cancellation);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Parse the date from DD/MM/YYYY format
  const parsedDate = parse(editedCancellation.requestedAt, 'dd/MM/yyyy', new Date());

  const handleFieldChange = (field: keyof CancellationRequest, value: string) => {
    setEditedCancellation({
      ...editedCancellation,
      [field]: value
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'dd/MM/yyyy');
      setEditedCancellation({
        ...editedCancellation,
        requestedAt: formattedDate
      });
      setDatePickerOpen(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Cancellation Request</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Cancellation Ref */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cancellationRef" className="text-right">
              Cancellation Ref
            </Label>
            <Input
              id="cancellationRef"
              value={editedCancellation.cancellationRef}
              onChange={(e) => handleFieldChange('cancellationRef', e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Booking Ref */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bookingRef" className="text-right">
              Booking Ref
            </Label>
            <Input
              id="bookingRef"
              value={editedCancellation.bookingRef}
              onChange={(e) => handleFieldChange('bookingRef', e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Guest */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="guest" className="text-right">
              Guest
            </Label>
            <Input
              id="guest"
              value={editedCancellation.guest}
              onChange={(e) => handleFieldChange('guest', e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Amount */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <div className="col-span-3 relative">
              <span className="absolute left-3 top-2">£</span>
              <Input
                id="amount"
                value={editedCancellation.amount.replace('£', '')}
                onChange={(e) => handleFieldChange('amount', `£${e.target.value}`)}
                className="pl-8"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Reason */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <Input
              id="reason"
              value={editedCancellation.reason}
              onChange={(e) => handleFieldChange('reason', e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={editedCancellation.status}
              onValueChange={(value) => handleFieldChange('status', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requested At */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="requestedAt" className="text-right">
              Requested At
            </Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !editedCancellation.requestedAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editedCancellation.requestedAt ? (
                    format(parsedDate, 'PPP') // Pretty formatted date
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={parsedDate}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(editedCancellation)}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}