//BookingsCalendar.tsx
'use client';

import { useState, useMemo } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Property, Booking} from './types';
import { getDateRange } from './utils';
import CalendarControls from './CalendarControls';
import PropertyList from './PropertyList';
import CalendarGrid from './CalendarGrid';
import BookingForm from './BookingForm';
import FilterModal from './FilterModal';

const properties: Property[] = [
  { name: 'Lakeview Villa', location: 'Lake Tahoe, CA', type: 'Villa' },
  { name: 'Sunset Cottage', location: 'Napa Valley, CA', type: 'Cottage' },
  { name: 'Mountain Retreat', location: 'Aspen, CO', type: 'Cabin' },
  { name: 'Urban Loft', location: 'San Francisco, CA', type: 'Apartment' },
  { name: 'Seaside Cabana', location: 'Malibu, CA', type: 'Beach House' },
  { name: 'Forest Lodge', location: 'Portland, OR', type: 'Lodge' }
];

const initialBookings: Booking[] = [
  {
    id: 1,
    propertyIndex: 0,
    startDay: 8,
    endDay: 15,
    length: 8,
    guest: 'Mark Burton',
    email: 'mark@example.com',
    phone: '+1 234 567 8900',
    address: '123 Main St, Anytown, USA',
    guests: '2',
    status: 'confirmed',
    price: '$1,240',
    accommodationTotal: '$1,000',
    cleaningFee: '$80',
    subtotal: '$1,080',
    vat: '+ $160',
    paymentCharge: '($9.20)',
    commission: '($143.71)',
    totalPayout: '$1,240',
    notes: 'Late check-in requested'
  },
  {
    id: 2,
    propertyIndex: 1,
    startDay: 10,
    endDay: 19,
    length: 10,
    guest: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '+1 234 567 8901',
    address: '456 Oak Ave, Somewhere, USA',
    guests: '4',
    status: 'cancelled',
    price: '$450',
    accommodationTotal: '$350',
    cleaningFee: '$100',
    subtotal: '$450',
    vat: '+ $75',
    paymentCharge: '($5.20)',
    commission: '($69.80)',
    totalPayout: '$450',
    notes: 'Anniversary trip'
  },
  {
    id: 3,
    propertyIndex: 2,
    startDay: 9,
    endDay: 16,
    length: 8,
    guest: 'David Wilson',
    email: 'david@example.com',
    phone: '+1 234 567 8902',
    address: '789 Pine Rd, Nowhere, USA',
    guests: '3',
    status: 'pending',
    price: '$1,050',
    accommodationTotal: '$900',
    cleaningFee: '$150',
    subtotal: '$1,050',
    vat: '+ $175',
    paymentCharge: '($8.20)',
    commission: '($122.80)',
    totalPayout: '$1,050',
    notes: 'Business retreat'
  },
  {
    id: 4,
    propertyIndex: 3,
    startDay: 14,
    endDay: 22,
    length: 9,
    guest: 'Emily Chen',
    email: 'emily@example.com',
    phone: '+1 234 567 8903',
    address: '321 Elm St, Anywhere, USA',
    guests: '2',
    status: 'confirmed',
    price: '$600',
    accommodationTotal: '$500',
    cleaningFee: '$100',
    subtotal: '$600',
    vat: '+ $100',
    paymentCharge: '($6.20)',
    commission: '($93.80)',
    totalPayout: '$600',
    notes: 'Weekend getaway'
  },
  {
    id: 5,
    propertyIndex: 4,
    startDay: 12,
    endDay: 19,
    length: 8,
    guest: 'Michael Brown',
    email: 'michael@example.com',
    phone: '+1 234 567 8904',
    address: '654 Maple Dr, Everywhere, USA',
    guests: '5',
    status: 'pending',
    price: '$1,600',
    accommodationTotal: '$1,300',
    cleaningFee: '$300',
    subtotal: '$1,600',
    vat: '+ $260',
    paymentCharge: '($10.20)',
    commission: '($149.80)',
    totalPayout: '$1,600',
    notes: 'Family vacation'
  },
  {
    id: 6,
    propertyIndex: 5,
    startDay: 18,
    endDay: 20,
    length: 3,
    guest: 'Jessica Lee',
    email: 'jessica@example.com',
    phone: '+1 234 567 8905',
    address: '987 Cedar Ln, Somewhere, USA',
    guests: '2',
    status: 'cancelled',
    price: '$400',
    accommodationTotal: '$300',
    cleaningFee: '$100',
    subtotal: '$400',
    vat: '+ $60',
    paymentCharge: '($4.20)',
    commission: '($55.80)',
    totalPayout: '$400',
    notes: 'Changed plans'
  }
];

export default function BookingsCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 4, 8));
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  const days = useMemo(() => getDateRange(currentDate), [currentDate]);

  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.status === filterStatus);

  const navigateToPrevious = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
  };

  const navigateToNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentDate(new Date(2025, 4, 8));
  };

  const handleAddBooking = (newBooking: Omit<Booking, 'id' | 'length'>) => {
    const newId = Math.max(...bookings.map(b => b.id), 0) + 1;
    const length = newBooking.endDay - newBooking.startDay + 1;
    
    setBookings([...bookings, {
      ...newBooking,
      id: newId,
      length
    }]);
    
    setShowAddBookingModal(false);
  };

  return (
    <Card className="shadow-sm border border-gray-200 rounded-lg overflow-hidden dark:border-gray-800">
      <CardHeader className="px-6 py-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Bookings Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs gap-1"
              onClick={() => setShowFilterModal(true)}
            >
              <Filter className="h-3 w-3" />
              Filter
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              className="text-xs gap-1"
              onClick={() => setShowAddBookingModal(true)}
            >
              <Calendar className="h-3 w-3" />
              Add Booking
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CalendarControls
        currentDate={currentDate}
        days={days}
        onPrevious={navigateToPrevious}
        onNext={navigateToNext}
        onToday={navigateToToday}
      />
      
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[240px_1fr] divide-x divide-gray-200 dark:divide-gray-800">
              <PropertyList properties={properties} />
              <CalendarGrid 
                days={days}
                properties={properties}
                bookings={filteredBookings}
                currentDate={currentDate}
              />
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </CardContent>

      <BookingForm
        open={showAddBookingModal}
        onOpenChange={setShowAddBookingModal}
        properties={properties}
        onSubmit={handleAddBooking}
      />

      <FilterModal
        open={showFilterModal}
        onOpenChange={setShowFilterModal}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
      />
    </Card>
  );
}