//BookingCard.tsx
//BookingCard.tsx
import { User, Mail, CalendarCheck, CalendarX, Clock,Phone } from 'lucide-react';
import { useState } from 'react';
import { Booking, DayInfo } from './types';
import { getStatusColor, getStatusIcon } from './utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface BookingCardProps {
  booking: Booking;
  days: DayInfo[];
  currentDate: Date;
}

export default function BookingCard({ booking, days, currentDate }: BookingCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const statusIconClass = getStatusIcon(booking.status);
  
  // Calculate position and width to start/end at center of dates
  const startPosition = (booking.startDay - currentDate.getDate());
  const length = booking.endDay - booking.startDay + 1; // Total days including both start and end
  
  // Start at center of first day, end at center of last day
  const left = `calc(${startPosition / days.length * 100}% + 0.5 * (100% / ${days.length}) - 2px)`;
  const width = `calc(${(length - 1) / days.length * 100}% + 4px)`;

  return (
    <>
      <div
        className={`absolute top-3 h-14 rounded-md px-3 py-2 text-xs font-medium border shadow-xs cursor-pointer transition-all duration-150 hover:shadow-sm ${
          getStatusColor(booking.status)
        } dark:shadow-none`}
        style={{
          left,
          width,
          maxWidth: width,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(true);
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden h-full">
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white/50 border border-white/20 dark:bg-gray-800/50 dark:border-gray-700">
            <User className="h-3 w-3 text-current" />
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="truncate font-medium">{booking.guest}</span>
            <div className="flex items-center gap-2 mt-1">
              {booking.status === 'confirmed' && <CalendarCheck className={`h-3 w-3 ${statusIconClass}`} />}
              {booking.status === 'pending' && <Clock className={`h-3 w-3 ${statusIconClass}`} />}
              {booking.status === 'cancelled' && <CalendarX className={`h-3 w-3 ${statusIconClass}`} />}
              <span className="text-xs opacity-80 truncate">{booking.price}</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl p-6">
          <div className="relative">
            <BookingDetailsContent booking={booking} statusIconClass={statusIconClass} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BookingDetailsContent({ booking, statusIconClass }: { booking: Booking, statusIconClass: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800">
          <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <div className="font-medium text-lg text-gray-900 dark:text-gray-100">{booking.guest}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{booking.address}</div>
          <div className="flex items-center gap-2 mt-1">
            {booking.status === 'confirmed' && <CalendarCheck className={`h-4 w-4 ${statusIconClass}`} />}
            {booking.status === 'pending' && <Clock className={`h-4 w-4 ${statusIconClass}`} />}
            {booking.status === 'cancelled' && <CalendarX className={`h-4 w-4 ${statusIconClass}`} />}
            <span className="text-sm capitalize">{booking.status}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm">{booking.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm">{booking.email}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Check-in</div>
          <div className="text-sm font-medium">May {booking.startDay}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Check-out</div>
          <div className="text-sm font-medium">May {booking.endDay}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Guests</div>
          <div className="text-sm font-medium">{booking.guests}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          <div className="text-sm font-medium">{booking.price}</div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="font-medium mb-2">Price breakdown (GBP)</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Accommodation total</span>
            <span>{booking.accommodationTotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Cleaning fee</span>
            <span>{booking.cleaningFee}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>Subtotal</span>
            <span>{booking.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT</span>
            <span>{booking.vat}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment charge</span>
            <span>{booking.paymentCharge}</span>
          </div>
          <div className="flex justify-between">
            <span>Commission</span>
            <span>{booking.commission}</span>
          </div>
          <div className="flex justify-between font-medium pt-2 border-t">
            <span>Total payout</span>
            <span>{booking.totalPayout}</span>
          </div>
        </div>
      </div>

      {booking.notes && (
        <div className="mt-4">
          <h4 className="font-medium mb-1">Notes</h4>
          <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-gray-50 rounded dark:bg-gray-800">
            {booking.notes}
          </div>
        </div>
      )}
    </div>
  );
}