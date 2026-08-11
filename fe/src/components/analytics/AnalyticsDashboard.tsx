// components/analytics/AnalyticsDashboard.tsx
"use client"

import React, { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle, Users, UserCheck, FileText, UserPlus, ShieldCheck } from 'lucide-react'
import MonthlyOverviewCharts from './MonthlyOverviewCharts'
import {
  getRoleAwareDashboard,
  type DashboardData,
} from '@/services/userAnalytics.service'
import { getStoredUser } from '@/utils/auth'

// ── StatsOverview (inlined) ──────────────────────────────────────────────────
interface StatsProps {
  data: {
    totalUsers: number
    userInvoices: Array<{ invoiceCount: number; totalAmount: number }>
    userClients: Array<{ clientCount: number }>
    subUsers: Array<{ subUserCount: number }>
  }
  overview?: {
    total_invoices?: number
    total_clients?: number
    sub_users?: number
    avg_invoices_per_user?: number
    admin_users?: number
  }
  isLoading?: boolean
}

const StatsOverview: React.FC<StatsProps> = ({ data, overview, isLoading = false }) => {
  const totalInvoices =
    overview?.total_invoices ??
    data.userInvoices.reduce((sum, u) => sum + u.invoiceCount, 0)

  const totalClients =
    overview?.total_clients ??
    data.userClients.reduce((sum, u) => sum + u.clientCount, 0)

  const totalSubUsers =
    overview?.sub_users ??
    data.subUsers.reduce((sum, u) => sum + u.subUserCount, 0)

  const avgInvoicesPerUser =
    overview?.avg_invoices_per_user?.toFixed(1) ??
    (data.totalUsers > 0 ? (totalInvoices / data.totalUsers).toFixed(1) : '0')

  const stats = [
    {
      title: 'Total Invoices',
      value: totalInvoices,
      icon: FileText,
      subText: `${avgInvoicesPerUser} per user`,
      color: '#0D9488',
      text: 'text-teal-600',
      iconBg: 'bg-teal-100',
    },
    {
      title: 'Active Users',
      value: data.totalUsers,
      icon: Users,
      subText: 'Registered accounts',
      color: '#0F766E',
      text: 'text-teal-600',
      iconBg: 'bg-teal-100',
    },
    {
      title: 'Admin Users',
      value: overview?.admin_users ?? 0,
      icon: ShieldCheck,
      subText: 'Main accounts only',
      color: '#0ea5e9',
      text: 'text-teal-600',
      iconBg: 'bg-teal-100',
    },
    {
      title: 'Total Clients',
      value: totalClients,
      icon: UserCheck,
      subText: 'Across all users',
      color: '#f59e0b',
      text: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      title: 'Sub Users',
      value: totalSubUsers,
      icon: UserPlus,
      subText: 'Team members added',
      color: '#10b981',
      text: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
  ]

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className="group relative bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all overflow-hidden"
          >
            <div
              className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500"
              style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color})` }}
            />
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${stat.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                </div>
              </div>
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
              style={{ background: `linear-gradient(to right, ${stat.color}, ${stat.color})` }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── AnalyticsDashboard ───────────────────────────────────────────────────────
const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user to determine role
      const user = getStoredUser()

      // Fetch dashboard data based on user role
      const result = await getRoleAwareDashboard(user)
      setData(result)
    } catch (err: any) {
      console.error('Failed to fetch analytics data', err)

      let message = 'Failed to load dashboard data'

      if (err?.response) {
        const status = err.response.status
        const body = err.response.data

        if (status === 401) {
          message = 'Session expired. Please log in again.'
        } else if (status === 404) {
          message = 'Analytics API not found. Please check the configuration.'
        } else if (status === 500) {
          message = `Server error. Please try again later.`
        } else {
          message = `Error ${status}: ${body?.message ?? 'Unable to load data'}`
        }
      } else if (err?.request) {
        message = 'Unable to connect to the server. Please check your connection.'
      } else {
        message = err?.message ?? 'Failed to load dashboard data'
      }

      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="max-w-lg w-full bg-rose-50 border border-rose-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium text-sm">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="mt-1 inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {isLoading && (
          <RefreshCw className="w-4 h-4 animate-spin text-teal-400 ml-auto" />
        )}
      </div>

      <StatsOverview
        data={{
          totalUsers: data?.overview?.total_users ?? 0,
          userInvoices: (data?.user_invoice_stats ?? []).map(u => ({
            invoiceCount: u.invoiceCount,
            totalAmount: u.totalAmount,
          })),
          userClients: (data?.user_client_stats ?? []).map(u => ({
            clientCount: u.clientCount,
          })),
          subUsers: (data?.sub_user_distribution ?? []).map(u => ({
            subUserCount: u.subUserCount,
          })),
        }}
        overview={data?.overview}
        isLoading={isLoading}
      />

      <MonthlyOverviewCharts data={data?.monthly_timeseries} isLoading={isLoading} />
    </div>
  )
}

export default AnalyticsDashboard