//calendarGrid.tsx
import { DayInfo, Property, Booking } from './types';
import CalendarHeader from './CalendarHeader';
import BookingCard from './BookingCard';

interface CalendarGridProps {
  days: DayInfo[];
  properties: Property[];
  bookings: Booking[];
  currentDate: Date;
}

export default function CalendarGrid({ 
  days, 
  properties, 
  bookings, 
  currentDate 
}: CalendarGridProps) {
  return (
    <div>
      <CalendarHeader days={days} />
      
      <div className="relative">
        {/* Grid lines */}
        <div className="grid grid-cols-17 absolute inset-0 z-0">
          {days.map((day, i) => (
            <div 
              key={i} 
              className={`border-r border-gray-100 last:border-0 ${
                day.isWeekend ? 'bg-gray-50 dark:bg-gray-900' : ''
              } ${
                day.isToday ? 'bg-teal-50 dark:bg-teal-900/30' : ''
              } dark:border-gray-800`}
            ></div>
          ))}
        </div>
        
        {/* Property rows */}
        <div className="relative">
          {properties.map((_, propertyIndex) => (
            <div 
              key={propertyIndex} 
              className="h-20 border-b border-gray-200 last:border-0 relative hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800"
            >
              {bookings
                .filter((booking) => booking.propertyIndex === propertyIndex)
                .map((booking) => (
                  <div key={booking.id} className="relative h-full">
                    <BookingCard 
                      booking={booking}
                      days={days}
                      currentDate={currentDate}
                    />
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}