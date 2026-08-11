// components/common/SidebarAlertBanner.tsx
'use client';

import { AlertCircle,  ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SidebarAlertBannerProps {
  isVisible: boolean;
  isSidebarCollapsed: boolean;
  missingFields: string[];
}

/**
 * SidebarAlertBanner Component
 * 
 * Displays an alert banner for company accounts with incomplete details.
 * Personal accounts will never see this banner.
 * 
 * Props:
 * - isVisible: Controls visibility of the banner (already filtered by account_type in Sidebar)
 * - isSidebarCollapsed: Adjusts layout for collapsed sidebar
 * - missingFields: Array of missing company detail fields
 */
export function SidebarAlertBanner({
  isVisible,
  isSidebarCollapsed,
  missingFields,
}: SidebarAlertBannerProps) {
  const router = useRouter();
  const [isClosed, setIsClosed] = useState(false);

  // Don't render if not visible or closed by user
  if (!isVisible || isClosed) {
    return null;
  }

  const handleNavigate = () => {
    console.log('🔗 Navigating to company details page');
    router.push('/company?mode=company');
    setIsClosed(false); // Reset state for next visit
  };

  const handleClose = () => {
    console.log('Γ¥î Alert closed by user');
    setIsClosed(true);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
        isSidebarCollapsed && 'justify-center'
      )}
      role="alert"
      aria-label="Company details incomplete warning"
    >
      {/* Alert Icon */}
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />

      {/* Content - Only show when sidebar is expanded */}
      {!isSidebarCollapsed && (
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
            Complete Your Company Details
          </p>

          {/* Missing Fields List */}
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
            Missing: {missingFields.join(', ')}
          </p>

          {/* Navigation Button */}
          <button
            onClick={handleNavigate}
            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
            aria-label="Navigate to company settings"
          >
            Go to Company Settings
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      
    </div>
  );
}
