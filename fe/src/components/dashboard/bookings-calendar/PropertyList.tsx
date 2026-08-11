//PropertyList.tsx
import { Home } from 'lucide-react';
import { Property } from './types';

interface PropertyListProps {
  properties: Property[];
}

export default function PropertyList({ properties }: PropertyListProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-20 h-full">
      <div className="h-14 border-b border-gray-200 flex items-center px-6 font-medium text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Properties
      </div>
      {properties.map((property, index) => (
        <div 
          key={index} 
          className="h-20 border-b border-gray-200 last:border-0 flex flex-col justify-center px-6 py-2 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800"
        >
          <div className="font-medium text-sm flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Home className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            {property.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
            <span>{property.location}</span>
            <span className="inline-block h-1 w-1 rounded-full bg-gray-400 mx-1 dark:bg-gray-600"></span>
            <span>{property.type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}