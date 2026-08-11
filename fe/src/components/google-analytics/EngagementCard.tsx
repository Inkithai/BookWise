// components/EngagementCard.tsx
import React from 'react';

interface EngagementCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

const EngagementCard: React.FC<EngagementCardProps> = ({
  title,
  value,
  icon,
}) => {
  return (
    <div className="bg-white dark:bg-black rounded-lg sm:rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="w-4 h-4 sm:w-5 sm:h-5 text-black dark:text-gray-300 flex-shrink-0">
          {icon}
        </div>
        <p className="text-xs sm:text-sm font-semibold text-black dark:text-gray-300 truncate">
          {title}
        </p>
      </div>

      <p className="text-base sm:text-lg font-medium text-black dark:text-white">
        {value.toLocaleString()}
      </p>

      <div className="mt-2 sm:mt-3 h-1.5 sm:h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-black dark:bg-gray-600 transition-all duration-500"
          style={{ width: `${Math.min((value / 500) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default EngagementCard;
