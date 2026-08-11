// app/google-analytics/page.tsx
'use client'
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import GoogleAnalyticsDashboard from '@/components/google-analytics/GoogleAnalyticsDashboard';
import { PageHeaderTabs, analyticsTabs } from '@/components/common/PageNavTabs'

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 overflow-x-hidden flex flex-col bg-gradient-to-br from-slate-50 to-teal-50/30">
          <PageHeaderTabs title="" tabs={analyticsTabs} />
          <main className="flex-1 p-6">
            <GoogleAnalyticsDashboard />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

