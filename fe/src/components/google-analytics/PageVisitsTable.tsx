// components/PageVisitsTable.tsx
import React, { useState } from 'react';
import { ExternalLink, TrendingUp, ArrowUpDown } from 'lucide-react';

interface PageVisit {
  url: string;
  visits: number;
  avgTime?: number;
  bounceRate?: number;
}

interface PageVisitsTableProps {
  data: PageVisit[];
}

type SortField = 'url' | 'visits';
type SortOrder = 'asc' | 'desc';

const PageVisitsTable: React.FC<PageVisitsTableProps> = ({ data }) => {
  const [sortField, setSortField] = useState<SortField>('visits');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'url':
        comparison = a.url.localeCompare(b.url);
        break;
      case 'visits':
        comparison = a.visits - b.visits;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const SortButton: React.FC<{ field: SortField; label: string; align?: 'left' | 'right' | 'center' }> = ({ field, label, align = 'left' }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 sm:gap-2 hover:text-primary dark:hover:text-white transition-colors group text-xs sm:text-sm ${
        align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
      }`}
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-all flex-shrink-0 ${
        sortField === field 
          ? 'text-primary dark:text-white scale-110' 
          : 'text-gray-400 dark:text-gray-600 group-hover:text-primary dark:group-hover:text-white'
      }`} />
    </button>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow duration-300">
      <h2 className="text-lg sm:text-xl font-bold text-primary dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-teal-500" />
        Page Visits
      </h2>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
          <table className="min-w-full table-auto sm:table-fixed">
            <colgroup className="hidden sm:table-column-group">
              <col style={{ width: '60%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                  <SortButton field="url" label="Page URL" align="left" />
                </th>
                <th className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                  <div className="flex justify-center">
                    <SortButton field="visits" label="Visits" align="right" />
                  </div>
                </th>
                <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((page, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 sm:py-4 px-2 sm:px-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span
                        className="text-xs sm:text-sm font-medium text-primary dark:text-white break-all line-clamp-2"
                        title={page.url}
                      >
                        {page.url.length > 30 ? `${page.url.substring(0, 30)}...` : page.url}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4">
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-teal-600 dark:text-teal-400" />
                        <span className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400">
                          {page.visits.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                    <button
                      onClick={() => window.open(page.url, '_blank')}
                      className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden xs:inline">Visit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedData.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No page visit data available</p>
        </div>
      )}
    </div>
  );
};

export default PageVisitsTable;