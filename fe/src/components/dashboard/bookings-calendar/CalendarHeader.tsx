//CalendarHeader.tsx
import { DayInfo } from './types';

interface CalendarHeaderProps {
  days: DayInfo[];
}

export default function CalendarHeader({ days }: CalendarHeaderProps) {
  return (
    <div className="grid grid-cols-17 border-b border-gray-200 dark:border-gray-800">
      {days.map((day) => (
        <div 
          key={day.day} 
          className={`h-14 flex flex-col items-center justify-center text-xs border-r border-gray-200 last:border-0 ${
            day.isWeekend ? 'bg-gray-50 dark:bg-gray-900' : ''
          } ${
            day.isToday ? 'bg-teal-50 dark:bg-teal-900/30' : ''
          } dark:border-gray-800`}
        >
          <span className="text-gray-500 dark:text-gray-400">{day.weekday}</span>
          <span className={`font-medium mt-1 ${
            day.isToday 
              ? 'bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center dark:bg-teal-700' 
              : 'text-gray-900 dark:text-gray-100'
          }`}>
            {day.day}
          </span>
        </div>
      ))}
    </div>
  );
}