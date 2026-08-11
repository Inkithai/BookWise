// app/analytics/page.tsx
"use client"

import { useState, useCallback } from 'react'
import SuperAdminGuard from '@/components/common/SuperAdminGuard'
import dynamic from 'next/dynamic'
import { PageHeaderTabs, PageNavTab } from '@/components/common/PageNavTabs'
import Sidebar from '@/components/common/sidebar/Sidebar'
import { Footer } from '@/components/common/Footer'
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Activity,
  FileText,
  Menu,
  BarChart,
} from 'lucide-react'
import GoogleAnalyticsDashboard from '@/components/google-analytics/GoogleAnalyticsDashboard';

function AnalyticsTabFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500"
      aria-busy="true"
      aria-label="Loading section"
    >
      <div className="h-10 w-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}

const AnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard'),
  { loading: () => <AnalyticsTabFallback /> }
)

const AnalyticsUsers = dynamic(
  () =>
    import('@/components/analytics/AnalyticsUsers').then((m) => ({
      default: m.AnalyticsUsers,
    })),
  { loading: () => <AnalyticsTabFallback /> }
)

const AnalyticsInvoices = dynamic(
  () => import('@/components/analytics/AnalyticsInvoices'),
  { loading: () => <AnalyticsTabFallback /> }
)

const AnalyticsClients = dynamic(
  () => import('@/components/analytics/AnalyticsClients'),
  { loading: () => <AnalyticsTabFallback /> }
)

const AnalyticsActivityLog = dynamic(
  () => import('@/components/analytics/AnalyticsActivityLog'),
  { loading: () => <AnalyticsTabFallback /> }
)

const PlanSubscriptionFinance = dynamic(
  () => import('@/components/analytics/PlanSubscriptionFinance'),
  { loading: () => <AnalyticsTabFallback /> }
)

const tabPrefetchers: Record<string, () => void> = {
  dashboard: () => {
    void import('@/components/analytics/AnalyticsDashboard')
  },
  users: () => {
    void import('@/components/analytics/AnalyticsUsers')
  },
  invoices: () => {
    void import('@/components/analytics/AnalyticsInvoices')
  },
  clients: () => {
    void import('@/components/analytics/AnalyticsClients')
  },
  activity: () => {
    void import('@/components/analytics/AnalyticsActivityLog')
  },
  'subscription-finance': () => {
    void import('@/components/analytics/PlanSubscriptionFinance')
  },
  'google-analytics': () => {
    void import('@/components/google-analytics/GoogleAnalyticsDashboard')
  },
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const prefetchTab = useCallback((tabId: string) => {
    tabPrefetchers[tabId]?.()
  }, [])

  const navTabs: PageNavTab[] = [
    { id: 'dashboard', name: 'Dashboard Overview', icon: 'LayoutDashboard', onClick: () => { setActiveTab('dashboard'); prefetchTab('dashboard'); } },
    { id: 'subscription-finance', name: 'Subscriptions & Finance', icon: 'PoundSterling', onClick: () => { setActiveTab('subscription-finance'); prefetchTab('subscription-finance'); } },
    { id: 'users', name: 'Users', icon: 'UserCircle', onClick: () => { setActiveTab('users'); prefetchTab('users'); } },
    { id: 'invoices', name: 'Invoices', icon: 'FileText', onClick: () => { setActiveTab('invoices'); prefetchTab('invoices'); } },
    { id: 'clients', name: 'Clients', icon: 'Users', onClick: () => { setActiveTab('clients'); prefetchTab('clients'); } },
    { id: 'activity', name: 'Activity Log', icon: 'Activity', onClick: () => { setActiveTab('activity'); prefetchTab('activity'); } },
    { id: 'google-analytics', name: 'Google Analytics', icon: 'BarChart', onClick: () => { setActiveTab('google-analytics'); prefetchTab('google-analytics'); } },
  ]

  const tabCopy: Record<string, { heading: string; subheading: string }> = {
    dashboard: { heading: 'Admin Insights', subheading: 'Complete overview of invoices and clients' },
    'subscription-finance': {
      heading: 'Subscriptions & Finance',
      subheading: 'Per-plan host counts, MRR, and monthly payments — super-admin only',
    },
    users: { heading: 'Users', subheading: 'Complete overview of user analytics and activity' },
    invoices: { heading: 'Invoices', subheading: 'Complete overview of invoice trends and performance' },
    clients: { heading: 'Clients', subheading: 'Complete overview of client analytics and growth' },
    activity: { heading: 'Activity Logs', subheading: 'Complete overview of user activities and system events' },
    'google-analytics': { heading: 'Google Analytics', subheading: 'Complete overview of web traffic and behavior' },
  }
  const currentCopy = tabCopy[activeTab] ?? tabCopy.dashboard

  return (
    <SuperAdminGuard>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <PageHeaderTabs
            title={currentCopy.heading}
            description={currentCopy.subheading}
            tabs={navTabs}
            activeTabId={activeTab}
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' && <AnalyticsDashboard />}
              {activeTab === 'subscription-finance' && <PlanSubscriptionFinance />}
              {activeTab === 'users' && <AnalyticsUsers />}
              {activeTab === 'invoices' && <AnalyticsInvoices />}
              {activeTab === 'clients' && <AnalyticsClients />}
              {activeTab === 'activity' && <AnalyticsActivityLog />}
              {activeTab === 'google-analytics' && <GoogleAnalyticsDashboard />}
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
    </SuperAdminGuard>
  )
}

