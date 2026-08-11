// app/dashboard/page.tsx
'use client'

import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import InvoiceSummaryDashboard  from '@/components/dashboard/Dashboard'
import DashboardErrorBoundary from '@/components/dashboard/DashboardErrorBoundary'
import AccessDenied from '@/components/common/AccessDenied'
import { usePermissions } from '@/utils/permissions'

export default function DashboardPage() {
  const { can, isSubUser, isHydrating } = usePermissions();
  const canViewDashboard = !isSubUser || can('dashboard.view');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden flex flex-col w-full pt-16 lg:pt-0">
          <div className="p-4 flex-1">
            {isHydrating ? null : canViewDashboard ? (
              <DashboardErrorBoundary>
                <InvoiceSummaryDashboard />
              </DashboardErrorBoundary>
            ) : (
              <AccessDenied />
            )}
            {/* <div className="space-y-4">
              <StatsCardList />
              <div className="grid gap-3 md:grid-cols-2">
                <RevenueChart />
                <LineDotsChart />
              </div>
              <BookingsCalendar />
            </div> */}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}