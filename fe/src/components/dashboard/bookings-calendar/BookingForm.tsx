//BookingForm.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Property, BookingStatus, Booking } from './types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  onSubmit: (booking: Omit<Booking, 'id' | 'length'>) => void;
}

export default function BookingForm({ open, onOpenChange, properties, onSubmit }: BookingFormProps) {
  const [booking, setBooking] = useState<Omit<Booking, 'id' | 'length'>>({
    propertyIndex: 0,
    startDay: new Date(2025, 4, 8).getDate(),
    endDay: new Date(2025, 4, 11).getDate(),
    guest: '',
    email: '',
    phone: '',
    address: '',
    guests: '',
    status: 'confirmed',
    price: '',
    accommodationTotal: '',
    cleaningFee: '',
    subtotal: '',
    vat: '',
    paymentCharge: '',
    commission: '',
    totalPayout: '',
    notes: ''
  });

  const [startDate, setStartDate] = useState<Date | undefined>(new Date(2025, 4, 8));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date(2025, 4, 11));

  const handleDateChange = (dates: { start?: Date, end?: Date }) => {
    if (dates.start) {
      setStartDate(dates.start);
      setBooking(prev => ({
        ...prev,
        startDay: dates.start!.getDate()
      }));
    }
    if (dates.end) {
      setEndDate(dates.end);
      setBooking(prev => ({
        ...prev,
        endDay: dates.end!.getDate()
      }));
    }
  };

  const handleSubmit = () => {
    onSubmit(booking);
    setBooking({
      propertyIndex: 0,
      startDay: new Date().getDate(),
      endDay: new Date().getDate() + 3,
      guest: '',
      email: '',
      phone: '',
      address: '',
      guests: '',
      status: 'confirmed',
      price: '',
      accommodationTotal: '',
      cleaningFee: '',
      subtotal: '',
      vat: '',
      paymentCharge: '',
      commission: '',
      totalPayout: '',
      notes: ''
    });
    setStartDate(new Date(2025, 4, 8));
    setEndDate(new Date(2025, 4, 11));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Booking</DialogTitle>
          <DialogDescription>
            Fill in the details for the new booking.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="property" className="text-right">
              Property
            </Label>
            <Select 
              value={booking.propertyIndex.toString()} 
              onValueChange={(value) => setBooking({...booking, propertyIndex: parseInt(value)})}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dates" className="text-right">
              Dates
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate && endDate ? (
                      `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={{ from: startDate, to: endDate }}
                    onSelect={(range) => handleDateChange({
                      start: range?.from,
                      end: range?.to
                    })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="guest" className="text-right">
              Guest Name
            </Label>
            <Input
              id="guest"
              value={booking.guest}
              onChange={(e) => setBooking({...booking, guest: e.target.value})}
              className="col-span-3"
              placeholder="John Doe"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={booking.email}
              onChange={(e) => setBooking({...booking, email: e.target.value})}
              className="col-span-3"
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              value={booking.phone}
              onChange={(e) => setBooking({...booking, phone: e.target.value})}
              className="col-span-3"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              value={booking.address}
              onChange={(e) => setBooking({...booking, address: e.target.value})}
              className="col-span-3"
              placeholder="123 Main St, City, Country"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="guests" className="text-right">
              Guests
            </Label>
            <Input
              id="guests"
              value={booking.guests}
              onChange={(e) => setBooking({...booking, guests: e.target.value})}
              className="col-span-3"
              placeholder="2"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select 
              value={booking.status} 
              onValueChange={(value) => setBooking({...booking, status: value as BookingStatus})}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Total Price
            </Label>
            <Input
              id="price"
              value={booking.price}
              onChange={(e) => setBooking({...booking, price: e.target.value})}
              className="col-span-3"
              placeholder="$0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accommodationTotal" className="text-right">
              Accommodation Total
            </Label>
            <Input
              id="accommodationTotal"
              value={booking.accommodationTotal}
              onChange={(e) => setBooking({...booking, accommodationTotal: e.target.value})}
              className="col-span-3"
              placeholder="$0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cleaningFee" className="text-right">
              Cleaning Fee
            </Label>
            <Input
              id="cleaningFee"
              value={booking.cleaningFee}
              onChange={(e) => setBooking({...booking, cleaningFee: e.target.value})}
              className="col-span-3"
              placeholder="$0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subtotal" className="text-right">
              Subtotal
            </Label>
            <Input
              id="subtotal"
              value={booking.subtotal}
              onChange={(e) => setBooking({...booking, subtotal: e.target.value})}
              className="col-span-3"
              placeholder="$0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vat" className="text-right">
              VAT
            </Label>
            <Input
              id="vat"
              value={booking.vat}
              onChange={(e) => setBooking({...booking, vat: e.target.value})}
              className="col-span-3"
              placeholder="$0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentCharge" className="text-right">
              Payment Charge
            </Label>
            <Input
              id="paymentCharge"
              value={booking.paymentCharge}
              onChange={(e) => setBooking({...booking, paymentCharge: e.target.value})}
              className="col-span-3"
              placeholder="$0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="commission" className="text-right">
              Commission
            </Label>
            <Input
              id="commission"
              value={booking.commission}
              onChange={(e) => setBooking({...booking, commission: e.target.value})}
              className="col-span-3"
              placeholder="$0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="totalPayout" className="text-right">
              Total Payout
            </Label>
            <Input
              id="totalPayout"
              value={booking.totalPayout}
              onChange={(e) => setBooking({...booking, totalPayout: e.target.value})}
              className="col-span-3"
              placeholder="$0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Input
              id="notes"
              value={booking.notes || ''}
              onChange={(e) => setBooking({...booking, notes: e.target.value})}
              className="col-span-3"
              placeholder="Special requests or notes"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add Booking</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}