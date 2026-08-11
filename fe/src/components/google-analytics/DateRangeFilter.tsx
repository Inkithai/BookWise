// components/DateRangeFilter.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  onApply: () => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onChange,
  onApply,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState<Date | null>(null);
  const [localEndDate, setLocalEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startDate) setLocalStartDate(new Date(startDate));
    if (endDate) setLocalEndDate(new Date(endDate));
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Prevent body scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleApply = () => {
    if (localStartDate && localEndDate) {
      onChange(
        localStartDate.toISOString().split('T')[0],
        localEndDate.toISOString().split('T')[0]
      );
      onApply();
      setIsOpen(false);
    }
  };

  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate >= today;
  };

  const handleDateClick = (date: Date) => {
    // Prevent selecting today or future dates
    if (isFutureDate(date)) {
      return;
    }

    if (selectingStart) {
      setLocalStartDate(date);
      setLocalEndDate(null);
      setSelectingStart(false);
    } else {
      if (date < (localStartDate || new Date())) {
        setLocalStartDate(date);
        setLocalEndDate(null);
        setSelectingStart(false);
      } else {
        setLocalEndDate(date);
        setSelectingStart(true);
      }
    }
  };

  const handlePresetClick = (days: number) => {
    const end = new Date();
    end.setDate(end.getDate() - 1); // Set to yesterday (not today)
    const start = new Date();
    start.setDate(start.getDate() - days);
    setLocalStartDate(start);
    setLocalEndDate(end);
  };

  const handleThisYearClick = () => {
    const end = new Date();
    end.setDate(end.getDate() - 1); // Yesterday
    const start = new Date(end.getFullYear(), 0, 1); // Jan 1st of current year
    setLocalStartDate(start);
    setLocalEndDate(end);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateInRange = (date: Date): boolean => {
    if (!localStartDate || !localEndDate) return false;
    return date >= localStartDate && date <= localEndDate;
  };

 const isDateSelected = (date: Date): boolean => {
  if (!localStartDate && !localEndDate) return false;
  const dateStr = date.toDateString();

  // Check if date matches start date (if start date exists)
  if (localStartDate && dateStr === localStartDate.toDateString()) {
    return true;
  }

  // Check if date matches end date (if end date exists)
  if (localEndDate && dateStr === localEndDate.toDateString()) {
    return true;
  }

  return false;
};

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    const today = new Date();
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    // Only allow navigation up to current month
    if (nextMonthDate <= new Date(today.getFullYear(), today.getMonth(), 1)) {
      setCurrentMonth(nextMonthDate);
    }
  };

  const formatDisplayDate = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return 'Select Date Range';
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
      >
        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium truncate">{formatDisplayDate()}</span>
      </button>

      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className={`
            fixed md:absolute 
            left-0 right-0 bottom-0 md:left-auto md:right-0 md:bottom-auto
            mt-0 md:mt-2
            w-full md:w-[480px] 
            bg-white dark:bg-gray-800 
            rounded-t-2xl md:rounded-2xl 
            border border-gray-200 dark:border-gray-700 
            shadow-2xl z-50 
            overflow-hidden
            max-h-[90vh] md:max-h-[80vh]
            flex flex-col
          `}>
            {/* Mobile header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 md:hidden">
              <h3 className="text-lg font-bold text-primary dark:text-white">Select Date Range</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto">
              {/* Desktop title - hidden on mobile */}
              <h3 className="text-lg font-bold text-primary dark:text-white mb-4 hidden md:block">Select Date Range</h3>

              {/* Preset Ranges */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Quick Select</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handlePresetClick(7)}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors text-center font-medium"
                  >
                    7 days
                  </button>
                  <button
                    onClick={() => handlePresetClick(30)}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors text-center font-medium"
                  >
                    30 days
                  </button>
                  <button
                    onClick={() => handlePresetClick(90)}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors text-center font-medium"
                  >
                    90 days
                  </button>
                  <button
                    onClick={handleThisYearClick}
                    className="px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors text-center font-medium"
                  >
                    This Year
                  </button>
              </div>
            </div>

              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={previousMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h4 className="text-sm sm:text-base font-bold text-primary dark:text-white">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h4>
                <button
                  onClick={nextMonth}
                  disabled={
                    currentMonth.getMonth() === new Date().getMonth() &&
                    currentMonth.getFullYear() === new Date().getFullYear()
                  }
                  className={`p-2 rounded-lg transition-colors ${
                    currentMonth.getMonth() === new Date().getMonth() &&
                    currentMonth.getFullYear() === new Date().getFullYear()
                      ? 'cursor-not-allowed opacity-40'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((date, index) => {
                if (!date) {
                  return <div key={index} className="aspect-square" />;
                }

                const isInRange = isDateInRange(date);
                const isSelected = isDateSelected(date);
                const isToday = date.toDateString() === new Date().toDateString();
                const isFuture = isFutureDate(date);

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      disabled={isFuture}
                      className={`
                        aspect-square rounded-lg text-xs sm:text-sm font-medium transition-all
                        ${isFuture
                          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
                          : isSelected
                          ? 'bg-primary dark:bg-teal-600 text-white shadow-md scale-105'
                          : isInRange
                          ? 'bg-teal-100 dark:bg-teal-900/30 text-primary dark:text-teal-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                        ${isToday && !isSelected && !isFuture ? 'ring-2 ring-primary/50 dark:ring-teal-500/50' : ''}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Selected Range Display */}
              {localStartDate && (
                <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    {selectingStart ? 'Select end date' : 'Selected Range'}
                  </p>
                  <p className="text-sm font-bold text-primary dark:text-white">
                    {localStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {localEndDate && ` - ${localEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    {!localEndDate && ' (select end date)'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setLocalStartDate(startDate ? new Date(startDate) : null);
                    setLocalEndDate(endDate ? new Date(endDate) : null);
                    setIsOpen(false);
                  }}
                  className="flex-1 px-4 py-2.5 sm:py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!localStartDate || !localEndDate}
                  className="flex-1 px-4 py-2.5 sm:py-2 rounded-lg bg-primary dark:bg-teal-600 text-white hover:bg-primary/90 dark:hover:bg-teal-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Check className="w-4 h-4" />
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Helper to get day of year
declare global {
  interface Date {
    getDayOfYear(): number;
  }
}

Date.prototype.getDayOfYear = function() {
  const start = new Date(this.getFullYear(), 0, 0);
  const diff = (this.getTime() - start.getTime()) + ((start.getTimezoneOffset() - this.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

export default DateRangeFilter;