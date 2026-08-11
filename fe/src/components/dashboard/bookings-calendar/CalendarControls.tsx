//CalendarControls.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateRange } from './utils';
import { DayInfo } from './types';

interface CalendarControlsProps {
  currentDate: Date;
  days: DayInfo[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function CalendarControls({
  days,
  onPrevious,
  onNext,
  onToday
}: CalendarControlsProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onPrevious}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
          {formatDateRange(days)}
        </h3>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onNext}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onToday}
          className="text-xs ml-2"
        >
          Today
        </Button>
      </div>
    </div>
  );
}