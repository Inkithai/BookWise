// components/elements/Table.tsx - FULLY RESPONSIVE SCALABLE SYSTEM
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Search,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

// Column priority system for responsive visibility
export type ColumnPriority = 1 | 2 | 3 | 4 | 5;

export interface Column<T extends object> {
  header: string;
  accessor: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  priority?: ColumnPriority; // 1=always show, 5=hide on small screens
  format?: (value: any, row: T) => React.ReactNode; // Custom formatting
}

// Generic card configuration system - no manual renderers needed
export interface CardConfig<T extends object> {
  title: keyof T | ((row: T) => string); // Primary identifier
  subtitle?: keyof T | ((row: T) => string); // Secondary info
  primaryMetric?: {
    field: keyof T;
    label: string;
    format?: (value: any) => string;
  };
  secondaryMetrics?: Array<{
    field: keyof T;
    label: string;
    format?: (value: any) => string;
    icon?: React.ReactNode;
  }>;
  statusField?: keyof T;
  statusColors?: Record<string, string>; // Map status values to Tailwind classes
  actions?: (row: T) => React.ReactNode; // Custom action buttons
}

interface TableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  showingFrom: number;
  showingTo: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  loading?: boolean;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  tableName?: string; // For localStorage key persistence
  cardConfig?: CardConfig<T>; // Generic card configuration
  mobileCardRenderer?: (row: T) => React.ReactNode; // Fallback for complex cases
  className?: string; // Custom CSS class for styling
}

export function Table<T extends object>({
  data,
  columns,
  currentPage,
  totalPages,
  totalEntries,
  showingFrom,
  showingTo,
  onPageChange,
  loading = false,
  onSort,
  sortField,
  sortDirection = 'asc',
  tableName = 'default',
  cardConfig,
  mobileCardRenderer,
  className,
}: TableProps<T>) {
  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card'); // Default to card for safety
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Load saved view preference and detect screen size on mount
  useEffect(() => {
    const savedView = localStorage.getItem(`tableView:${tableName}`);
    
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
        // Default to card on mobile unless user explicitly chose table
        if (!savedView) setViewMode('card');
      } else if (width < 1024) {
        setScreenSize('tablet');
        setViewMode('table'); // Force table on tablet
      } else {
        setScreenSize('desktop');
        setViewMode('table'); // Force table on desktop
      }
    };
    
    // Apply saved preference only on mobile
    if (savedView && (savedView === 'table' || savedView === 'card')) {
      const width = window.innerWidth;
      if (width < 768) {
        setViewMode(savedView);
      }
    }
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [tableName]);

  // Persist view preference (mobile only)
  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode);
    if (screenSize === 'mobile') {
      localStorage.setItem(`tableView:${tableName}`, mode);
    }
  };

  // Get visible columns based on screen size and priority
  const visibleColumns = useMemo(() => {
    if (screenSize === 'desktop') return columns;
    if (screenSize === 'tablet') {
      // Show priority 1-3 on tablet
      return columns.filter(col => !col.priority || col.priority <= 3);
    }
    // Mobile: show only priority 1-2 (or all if no priority set)
    return columns.filter(col => !col.priority || col.priority <= 2);
  }, [columns, screenSize]);

  const handleSort = (accessor: string) => {
    if (!onSort) return;

    let newSortDirection: 'asc' | 'desc' = 'asc';
    
    if (sortField === accessor) {
      // Toggle direction if same field
      newSortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Default to ascending for new field
      newSortDirection = 'asc';
    }

    onSort(accessor, newSortDirection);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* View Toggle - Segmented control for mobile only */}
      {screenSize === 'mobile' && (cardConfig || mobileCardRenderer) && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{showingFrom}</span> to{" "}
            <span className="font-medium">{showingTo}</span> of{" "}
            <span className="font-medium">{totalEntries}</span> entries
          </div>
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              onClick={() => handleViewModeChange('card')}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                viewMode === 'card'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              Card
            </button>
            <button
              onClick={() => handleViewModeChange('table')}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600',
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              Table
            </button>
          </div>
        </div>
      )}

      {/* Table View - Desktop, Tablet, or Mobile when toggled */}
      {(screenSize !== 'mobile' || viewMode === 'table') && (
        <div className="rounded-md border overflow-x-auto">
          <ShadcnTable>
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column, index) => (
                  <TableHead 
                    key={`${String(column.accessor)}-${index}`}
                    className="whitespace-nowrap"
                  >
                    {column.sortable !== false && onSort ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort(String(column.accessor))}
                        className="h-auto p-0 font-medium hover:bg-transparent hover:underline whitespace-nowrap"
                      >
                        {column.header}
                      </Button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Skeleton Loading State
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {visibleColumns.map((_, colIndex) => (
                      <TableCell key={`skeleton-col-${colIndex}`}>
                        <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${Math.random() * 40 + 60}%` }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length > 0 ? (
                data.map((row, rowIndex) => (
                  <TableRow key={`row-${rowIndex}`}>
                    {visibleColumns.map((column, colIndex) => (
                      <TableCell 
                        key={`col-${rowIndex}-${colIndex}`}
                        className="whitespace-nowrap"
                      >
                        {column.cell
                          ? column.cell(row)
                          : column.format
                          ? column.format(row[column.accessor as keyof T], row)
                          : typeof column.accessor === 'string' && column.accessor in row
                          ? (row[column.accessor as keyof T] as React.ReactNode)
                          : null}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                // Empty State
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="h-48 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">No results found</p>
                        <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </ShadcnTable>
        </div>
      )}

      {/* Card View - Auto-generated from cardConfig or fallback to mobileCardRenderer */}
      {screenSize === 'mobile' && viewMode === 'card' && (cardConfig || mobileCardRenderer) && (
        <div className="space-y-4">
          {loading ? (
            // Skeleton Loading for Card View
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`card-skeleton-${index}`} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded animate-pulse w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
                  <div className="h-8 bg-muted rounded animate-pulse w-1/3 mb-4" />
                  <div className="flex gap-3">
                    <div className="h-14 bg-muted rounded-xl animate-pulse flex-1" />
                    <div className="h-14 bg-muted rounded-xl animate-pulse flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : data.length > 0 ? (
            data.map((row, index) => {
              // Use mobileCardRenderer if provided (backward compatibility)
              if (mobileCardRenderer) {
                return (
                  <div key={`card-${index}`} className="card-view-item">
                    {mobileCardRenderer(row)}
                  </div>
                );
              }

              // Auto-generate card from cardConfig
              if (cardConfig) {
                return (
                  <div key={`card-${index}`} className="card-view-item">
                    <GenericCard row={row} config={cardConfig} />
                  </div>
                );
              }

              return null;
            })
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Desktop & Tablet Pagination */}
      {(screenSize !== 'mobile' || viewMode === 'table') && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Showing <span className="font-medium">{showingFrom}</span> to{" "}
            <span className="font-medium">{showingTo}</span> of{" "}
            <span className="font-medium">{totalEntries}</span> entries
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-10 w-10 p-0"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1 || loading}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              className="h-10 w-10 p-0"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              className="h-10 w-10 p-0"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              className="h-10 w-10 p-0"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Pagination - Only for card view */}
      {screenSize === 'mobile' && viewMode === 'card' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 min-h-[48px] text-base font-medium"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>
            <div className="text-base font-semibold px-4 py-2 bg-muted rounded-lg">
              {currentPage}/{totalPages}
            </div>
            <Button
              variant="outline"
              className="flex-1 h-12 min-h-[48px] text-base font-medium"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0 || loading}
            >
              Next
              <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Generic Card Component - Auto-generates cards from configuration
function GenericCard<T extends object>({ 
  row, 
  config 
}: { 
  row: T; 
  config: CardConfig<T>;
}) {
  const getValue = (field: keyof T | ((row: T) => string)): string => {
    if (typeof field === 'function') {
      return field(row);
    }
    return String(row[field] || '');
  };

  const formatValue = (value: any, format?: (value: any) => string): string => {
    if (format) return format(value);
    return String(value || '');
  };

  // Default status colors
  const defaultStatusColors: Record<string, string> = {
    'active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'completed': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'paid': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'unpaid': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  const statusColors = config.statusColors || defaultStatusColors;
  const statusValue = config.statusField ? String(row[config.statusField] || '') : '';
  const statusColorClass = statusColors[statusValue.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-200">
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-base font-bold text-gray-900 dark:text-white truncate">
            {getValue(config.title)}
          </p>
          {config.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {getValue(config.subtitle)}
            </p>
          )}
        </div>
        {config.statusField && statusValue && (
          <div className="flex-shrink-0">
            <span className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold',
              statusColorClass
            )}>
              {statusValue}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

      {/* Primary Metric */}
      {config.primaryMetric && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {config.primaryMetric.label}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatValue(row[config.primaryMetric.field], config.primaryMetric.format)}
          </p>
        </div>
      )}

      {/* Secondary Metrics Grid */}
      {config.secondaryMetrics && config.secondaryMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {config.secondaryMetrics.map((metric, idx) => (
            <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{metric.label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {formatValue(row[metric.field], metric.format)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Custom Actions */}
      {config.actions && (
        <div className="flex gap-3">
          {config.actions(row)}
        </div>
      )}
    </div>
  );
}