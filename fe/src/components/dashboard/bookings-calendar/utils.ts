//utils.ts
import { DayInfo } from './types';

export const getDateRange = (startDate: Date): DayInfo[] => {
  return Array.from({ length: 17 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return {
      date,
      day: date.getDate(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      isWeekend: [0, 6].includes(date.getDay()),
      isToday: new Date().toDateString() === date.toDateString()
    };
  });
};

export const formatDateRange = (days: DayInfo[]) => {
  const startDate = days[0].date;
  const endDate = days[days.length - 1].date;
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const year = startDate.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${year}`;
  }
  
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`;
};

export const getStatusColor = (status: string) => {
  switch(status) {
    case 'confirmed': 
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50';
    case 'pending': 
      return 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/50';
    case 'cancelled': 
      return 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/50';
    default: 
      return 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700';
  }
};

export const getStatusIcon = (status: string) => {
  switch(status) {
    case 'confirmed': return 'text-emerald-500 dark:text-emerald-400';
    case 'pending': return 'text-amber-500 dark:text-amber-400';
    case 'cancelled': return 'text-red-500 dark:text-red-400';
    default: return 'text-gray-500 dark:text-gray-400';
  }
};