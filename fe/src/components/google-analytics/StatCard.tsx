// components/StatCard.tsx
import React from 'react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
}) => {
  return (
    <div className="group relative bg-white dark:bg-black rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-transparent dark:from-gray-800/30 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 rounded-xl bg-gray-200 dark:bg-gray-300">
            <div className="w-4 h-4 sm:w-5 sm:h-5 text-black dark:text-gray-900">
              {icon}
            </div>
          </div>
        </div>
        <p className="text-black dark:text-gray-300 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 truncate">
          {title}
        </p>
        <p className="text-base sm:text-lg text-black font-medium dark:text-white break-words">
          {value}
        </p>
        <p className="text-xs text-black dark:text-gray-500 mt-1 sm:mt-2 line-clamp-2 sm:line-clamp-1">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
