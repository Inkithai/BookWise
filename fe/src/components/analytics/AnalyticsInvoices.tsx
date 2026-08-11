// components/analytics/AnalyticsInvoices.tsx
"use client"

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Search, FileText, Eye, MoreVertical, Calendar,
  CheckCircle, Clock, XCircle, Mail, ChevronLeft,
  ChevronRight, X, Users, Receipt,
  UserCircle, AlertCircle, CreditCard, Send, ChevronDown, ChevronUp,
  BarChart3, TrendingUp, PieChart, ArrowUpDown, ArrowUp, ArrowDown,
  SlidersHorizontal
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getAnalyticsInvoices,
  getUsersList,
  type AnalyticsInvoice,
  type UserDropdownItem,
} from '@/services/userAnalytics.service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserStat {
  userId: string
  userName: string
  invoiceCount: number
  statuses: Record<string, number>
  monthlyDistribution: Record<string, number>
  invoices?: AnalyticsInvoice[] // Store invoices for monthly calculation
}

// ─── Status config ────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  'Draft', 'Created', 'Mail Sent', 'Pending', 'Not Paid',
  'Overdue', 'Paid', 'Installment Payment', 'Receipt Sent', 'Rejected',
] as const

const STATUS_CONFIG: Record<string, {
  icon: React.ElementType; color: string; bg: string; text: string; border: string
}> = {
  Draft: { icon: FileText, color: '#94a3b8', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  Created: { icon: FileText, color: '#0D9488', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Mail Sent': { icon: Mail, color: '#14B8A6', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Pending: { icon: Clock, color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Not Paid': { icon: XCircle, color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Overdue: { icon: XCircle, color: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Paid: { icon: CheckCircle, color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Installment Payment': { icon: Clock, color: '#2DD4BF', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Receipt Sent': { icon: CheckCircle, color: '#14b8a6', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Rejected: { icon: XCircle, color: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

const USER_COLORS = [
  { from: '#0D9488', to: '#14B8A6', bg: 'bg-teal-100', text: 'text-teal-600' },
  { from: '#115E59', to: '#5EEAD4', bg: 'bg-teal-100', text: 'text-teal-600' },
  { from: '#10b981', to: '#14b8a6', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  { from: '#f59e0b', to: '#f97316', bg: 'bg-amber-100', text: 'text-amber-600' },
  { from: '#f43f5e', to: '#fb7185', bg: 'bg-rose-100', text: 'text-rose-600' },
]

// ─── Helper function to extract month from date string ───────────────────────

function extractMonthYear(dateString: string): string {
  try {
    // Handle different date formats
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      // Try to parse format like "2024-01-15" or "Jan 15, 2024"
      const parsed = new Date(dateString.replace(/-/g, '/'))
      if (isNaN(parsed.getTime())) return ''
      const year = parsed.getFullYear()
      const month = String(parsed.getMonth() + 1).padStart(2, '0')
      return `${year}-${month}`
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  } catch {
    return ''
  }
}

// ─── Calculate monthly distribution from invoices ────────────────────────────

function calculateMonthlyDistribution(invoices: AnalyticsInvoice[]): Record<string, number> {
  const distribution: Record<string, number> = {}

  invoices.forEach(invoice => {
    if (invoice.date) {
      const monthYear = extractMonthYear(invoice.date)
      if (monthYear) {
        distribution[monthYear] = (distribution[monthYear] || 0) + 1
      }
    }
  })

  return distribution
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

function UserAvatar({ userName, userId }: { userName: string; userId: string }) {
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colorIndex = Math.abs(parseInt(userId, 10) || 0) % USER_COLORS.length
  const colors = USER_COLORS[colorIndex]
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
      style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
    >
      {initials}
    </div>
  )
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 mt-4">Loading invoices...</p>
      </div>
    </div>
  )
}

// ─── Monthly Bar Chart Component ─────────────────────────────────────────────

function MonthlyBarChart({ data, maxCount }: { data: Record<string, number>; maxCount: number }) {
  const sortedMonths = Object.entries(data || {}).sort((a, b) => a[0].localeCompare(b[0]))

  if (sortedMonths.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No monthly data available</p>
  }

  return (
    <div className="space-y-3">
      {sortedMonths.map(([month, count]) => {
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
        const [year, monthNum] = month.split('-')
        const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'short' })

        return (
          <div key={month} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">{monthName} {year}</span>
              <span className="text-xs font-semibold text-slate-700">{count} invoices</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-teal-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── User Invoices Section with Monthly Distribution ─────────────────────────

function UserInvoicesSection({
  userStats,
  selectedMonth,
  onMonthChange,
  availableMonths
}: {
  userStats: UserStat[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  availableMonths: string[];
}) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  const maxCount = Math.max(...userStats.map(s => s.invoiceCount), 1)

  const toggleExpand = (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  if (userStats.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No user data available</p>
      </div>
    )
  }

  // Calculate total for selected month safely
  const totalForSelectedMonth = userStats.reduce((sum, user) => {
    const monthlyData = user.monthlyDistribution || {}
    return sum + (monthlyData[selectedMonth] || 0)
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Invoices by User</h3>
          <p className="text-xs text-slate-500 mt-1">Invoice distribution across users with monthly breakdown</p>
        </div>

        {/* Month Filter */}
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <Select value={selectedMonth} onValueChange={onMonthChange}>
                <SelectTrigger className="w-[180px] rounded-lg border-slate-200">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(month => {
                    const [year, monthNum] = month.split('-')
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' })
                    return (
                      <SelectItem key={month} value={month}>
                        {monthName} {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-teal-50 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-teal-600 font-medium">
                Total: {totalForSelectedMonth} invoices
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userStats.map((user) => {
          const percentage = (user.invoiceCount / maxCount) * 100
          const colorIndex = Math.abs(parseInt(user.userId, 10) || 0) % USER_COLORS.length
          const colors = USER_COLORS[colorIndex]
          const topStatuses = Object.entries(user.statuses || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)

          const monthlyDistribution = user.monthlyDistribution || {}
          const monthlyCount = monthlyDistribution[selectedMonth] || 0
          const monthlyPercentage = user.invoiceCount > 0 ? (monthlyCount / user.invoiceCount) * 100 : 0
          const isExpanded = expandedUsers.has(user.userId)

          // Calculate max count for monthly chart
          const monthlyMaxCount = Math.max(...Object.values(monthlyDistribution), 1)

          return (
            <div
              key={user.userId}
              className="relative bg-white rounded-xl border border-slate-200 hover:shadow-md transition-all cursor-pointer"
              onClick={() => toggleExpand(user.userId)}
            >
              <div className="p-5">
                <div
                  className="absolute -top-2 -right-2 w-12 h-12 rounded-full opacity-20"
                  style={{ background: `radial-gradient(circle, ${colors.from}, ${colors.to})` }}
                />

                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                  >
                    {user.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{user.userName}</p>
                  </div>
                  <div className="text-right">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mb-3">
                  <p className="text-2xl font-bold text-slate-800">{user.invoiceCount}</p>
                  <p className="text-xs text-slate-500">total invoices</p>
                </div>

                {/* Monthly Highlight */}
                {Object.keys(monthlyDistribution).length > 0 && (
                  <div className="mb-3 p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600">Selected month:</span>
                      <span className="text-sm font-bold text-teal-600">{monthlyCount}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${monthlyPercentage}%`, background: `linear-gradient(to right, ${colors.from}, ${colors.to})` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {monthlyPercentage.toFixed(1)}% of total
                    </p>
                  </div>
                )}



                {/* Status Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {topStatuses.map(([status, count]) => {
                    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft
                    return (
                      <span
                        key={status}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}
                      >
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: cfg.color }} />
                        {status} ({count})
                      </span>
                    )
                  })}
                  {Object.keys(user.statuses || {}).length > 3 && (
                    <span className="text-[10px] text-slate-400">
                      +{Object.keys(user.statuses || {}).length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Content - Monthly Distribution */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 rounded-b-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-teal-500" />
                    <h4 className="text-sm font-semibold text-slate-700">Monthly Distribution</h4>
                  </div>

                  {Object.keys(monthlyDistribution).length > 0 ? (
                    <>
                      <MonthlyBarChart
                        data={monthlyDistribution}
                        maxCount={monthlyMaxCount}
                      />

                      {/* Summary Stats */}
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center">
                            <p className="text-xs text-slate-500">Best Month</p>
                            {(() => {
                              const bestMonth = Object.entries(monthlyDistribution)
                                .sort((a, b) => b[1] - a[1])[0]
                              if (bestMonth) {
                                const [year, monthNum] = bestMonth[0].split('-')
                                const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'short' })
                                return (
                                  <p className="text-sm font-semibold text-slate-700">
                                    {monthName} {year} ({bestMonth[1]})
                                  </p>
                                )
                              }
                              return <p className="text-sm text-slate-400">No data</p>
                            })()}
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-500">Avg per month</p>
                            <p className="text-sm font-semibold text-slate-700">
                              {Object.values(monthlyDistribution).length > 0
                                ? (user.invoiceCount / Object.values(monthlyDistribution).length).toFixed(1)
                                : '0'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-slate-400 py-4">
                      <BarChart3 className="w-4 h-4" />
                      <p className="text-sm">No monthly distribution data available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const AnalyticsInvoices: React.FC = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [sortBy, setSortBy]             = useState<'date' | 'due_date' | 'status' | 'client' | 'number'>('date')
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc')
  const itemsPerPage = 8

  // API data
  const [allInvoices, setAllInvoices] = useState<AnalyticsInvoice[]>([])
  const [invoices, setInvoices] = useState<AnalyticsInvoice[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({})
  const [userStats, setUserStats] = useState<UserStat[]>([])
  const [users, setUsers] = useState<UserDropdownItem[]>([])
  const [pagination, setPagination] = useState({ total: 0, per_page: 8, current_page: 1, last_page: 1 })
  const [loading, setLoading] = useState(true)

  // Fetch users for dropdown once
  useEffect(() => {
    getUsersList().then(setUsers).catch(console.error)
  }, [])

  // Fetch all invoices for monthly distribution calculation
  const fetchAllInvoices = useCallback(async () => {
    try {
      // Fetch all invoices without pagination for monthly stats
      const res = await getAnalyticsInvoices({
        search:    search || undefined,
        status:    statusFilter !== 'all' ? statusFilter : undefined,
        user_id:   userFilter !== 'all' ? userFilter : undefined,
        date_from: dateFrom || undefined,
        date_to:   dateTo   || undefined,
        per_page:  1000,
      })
      setAllInvoices(res.invoices)

      // Group invoices by user and calculate monthly distribution
      const userMap = new Map<string, UserStat>()

      res.invoices.forEach(invoice => {
        const userId = invoice.userId
        const userName = invoice.userName

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            userName,
            invoiceCount: 0,
            statuses: {},
            monthlyDistribution: {},
            invoices: []
          })
        }

        const userStat = userMap.get(userId)!
        userStat.invoiceCount++
        userStat.statuses[invoice.status] = (userStat.statuses[invoice.status] || 0) + 1
        userStat.invoices!.push(invoice)

        // Calculate monthly distribution from invoice date
        const monthYear = extractMonthYear(invoice.date)
        if (monthYear) {
          userStat.monthlyDistribution[monthYear] = (userStat.monthlyDistribution[monthYear] || 0) + 1
        }
      })

      // Convert map to array and sort by invoice count
      const processedUserStats = Array.from(userMap.values())
        .sort((a, b) => b.invoiceCount - a.invoiceCount)

      setUserStats(processedUserStats)

      // Set available months
      const months = new Set<string>()
      processedUserStats.forEach(user => {
        Object.keys(user.monthlyDistribution).forEach(month => months.add(month))
      })
      const sortedMonths = Array.from(months).sort()
      if (sortedMonths.length > 0 && !selectedMonth) {
        setSelectedMonth(sortedMonths[sortedMonths.length - 1]) // Latest month
      }

    } catch (e) {
      console.error('Failed to fetch all invoices', e)
    }
  }, [search, statusFilter, userFilter, dateFrom, dateTo])

  const fetchPaginatedInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getAnalyticsInvoices({
        search:    search    || undefined,
        status:    statusFilter !== 'all' ? statusFilter : undefined,
        user_id:   userFilter   !== 'all' ? userFilter   : undefined,
        date_from: dateFrom  || undefined,
        date_to:   dateTo    || undefined,
        sort_by:   sortBy,
        sort_dir:  sortDir,
        page:      currentPage,
        per_page:  itemsPerPage,
      })
      setInvoices(res.invoices)
      setStatusCounts(res.status_counts)
      setStatusBreakdown(res.status_breakdown)
      setPagination(res.pagination)
    } catch (e) {
      console.error('Failed to fetch invoices', e)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, userFilter, dateFrom, dateTo, sortBy, sortDir, currentPage])

  useEffect(() => {
    fetchAllInvoices()
    fetchPaginatedInvoices()
  }, [fetchAllInvoices, fetchPaginatedInvoices])

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, userFilter, dateFrom, dateTo, sortBy, sortDir])

  const toggleSortDir = () => setSortDir(d => d === 'desc' ? 'asc' : 'desc')

  const handleSortByColumn = (col: 'date' | 'due_date' | 'status' | 'client' | 'number') => {
    if (sortBy === col) {
      toggleSortDir()
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const totalInvoices = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  // Get available months from user stats
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    userStats.forEach(user => {
      Object.keys(user.monthlyDistribution || {}).forEach(month => months.add(month))
    })
    return Array.from(months).sort()
  }, [userStats])

  // Status cards in specified order
  const statusCards = [
    { key: 'Draft', label: 'Draft', icon: FileText, color: '#94a3b8', iconBg: 'bg-slate-100', text: 'text-slate-600' },
    { key: 'Created', label: 'Created', icon: FileText, color: '#0D9488', iconBg: 'bg-teal-100', text: 'text-teal-600' },
    { key: 'Mail Sent', label: 'Mail Sent', icon: Mail, color: '#14B8A6', iconBg: 'bg-teal-100', text: 'text-teal-600' },
    { key: 'Pending', label: 'Pending', icon: Clock, color: '#f59e0b', iconBg: 'bg-amber-100', text: 'text-amber-600' },
    { key: 'Not Paid', label: 'Not Paid', icon: XCircle, color: '#f59e0b', iconBg: 'bg-amber-100', text: 'text-amber-600' },
    { key: 'Overdue', label: 'Overdue', icon: XCircle, color: '#f43f5e', iconBg: 'bg-rose-100', text: 'text-rose-600' },
    { key: 'Paid', label: 'Paid', icon: CheckCircle, color: '#10b981', iconBg: 'bg-emerald-100', text: 'text-emerald-600' },
    { key: 'Installment Payment', label: 'Installment', icon: Clock, color: '#2DD4BF', iconBg: 'bg-teal-100', text: 'text-teal-600' },
    { key: 'Receipt Sent', label: 'Receipt Sent', icon: CheckCircle, color: '#14b8a6', iconBg: 'bg-teal-100', text: 'text-teal-600' },
    { key: 'Rejected', label: 'Rejected', icon: XCircle, color: '#f43f5e', iconBg: 'bg-rose-100', text: 'text-rose-600' },
  ]

  const hasFilters = search || statusFilter !== 'all' || userFilter !== 'all' || dateFrom || dateTo
  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setUserFilter('all'); setDateFrom(''); setDateTo(''); setSortBy('date'); setSortDir('desc'); setCurrentPage(1) }

  if (loading && invoices.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* The redundant header has been removed */}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {/* Total Invoices Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all group col-span-2 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-teal-100 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-teal-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalInvoices}</p>
          <p className="text-xs text-slate-500 mt-1">Total Invoices</p>
        </div>

        {/* Other Status Cards */}
        {statusCards.map((card, i) => {
          const Icon = card.icon
          const value = statusCounts[card.key] || 0
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all group">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${card.iconBg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4 h-4 ${card.text}`} />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor="analytics-invoices-search" className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="analytics-invoices-search"
                placeholder="Invoice number or client..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                className="pl-9 rounded-lg border-slate-200 focus:border-teal-300"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label htmlFor="analytics-invoices-status" className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1) }}>
              <SelectTrigger id="analytics-invoices-status" className="rounded-lg border-slate-200"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <label htmlFor="analytics-invoices-user" className="text-xs font-medium text-slate-500 mb-1 block">User</label>
            <Select value={userFilter} onValueChange={v => { setUserFilter(v); setCurrentPage(1) }}>
              <SelectTrigger id="analytics-invoices-user" className="rounded-lg border-slate-200"><SelectValue placeholder="All Users" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(u => <SelectItem key={u.userId} value={u.userId}>{u.userName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">From Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setCurrentPage(1) }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 bg-white"
              />
            </div>
          </div>
          <div className="min-w-[150px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">To Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setCurrentPage(1) }}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100 bg-white"
              />
            </div>
          </div>
          <div className="min-w-[150px]">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Sort By</label>
            <div className="flex gap-1">
              <Select value={sortBy} onValueChange={v => { setSortBy(v as any); setCurrentPage(1) }}>
                <SelectTrigger className="rounded-lg border-slate-200 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="number">Invoice #</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={toggleSortDir}
                className="px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-teal-300 transition-colors text-slate-500"
                title={sortDir === 'desc' ? 'Descending — click for Ascending' : 'Ascending — click for Descending'}
              >
                {sortDir === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors mt-5">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {([
                  { label: 'Invoice', col: 'number' },
                  { label: 'Client',  col: 'client' },
                  { label: 'User',    col: null },
                  { label: 'Date',    col: 'date' },
                  { label: 'Due Date',col: 'due_date' },
                  { label: 'Status',  col: 'status' },
                ] as { label: string; col: string | null }[]).map(({ label, col }) => (
                  <th
                    key={label}
                    className={`px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                      col ? 'cursor-pointer select-none hover:text-teal-600 hover:bg-slate-100 transition-colors' : ''
                    }`}
                    onClick={() => col && handleSortByColumn(col as any)}
                  >
                    <div className="flex items-center gap-1.5">
                      {label}
                      {col && (
                        sortBy === col
                          ? sortDir === 'desc'
                            ? <ArrowDown className="w-3 h-3 text-teal-500" />
                            : <ArrowUp className="w-3 h-3 text-teal-500" />
                          : <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                  </div>
                </td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No invoices found matching your filters</td></tr>
              ) : invoices.map(invoice => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-50 rounded-lg"><FileText className="w-4 h-4 text-teal-600" /></div>
                      <span className="text-sm font-medium text-slate-700">{invoice.number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-600">{invoice.client}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserAvatar userName={invoice.userName} userId={invoice.userId} />
                      <span className="text-sm text-slate-600">{invoice.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="text-sm text-slate-500">{invoice.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-slate-500">{invoice.dueDate}</span></td>
                  <td className="px-6 py-4"><StatusBadge status={invoice.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              Showing {Math.min((pagination.current_page - 1) * pagination.per_page + 1, pagination.total)} to{' '}
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} invoices
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-sm text-slate-600 px-3">Page {currentPage} of {pagination.last_page}</span>
              <button onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))} disabled={currentPage === pagination.last_page}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoices by User Section with Monthly Distribution */}
      <UserInvoicesSection
        userStats={userStats}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
      />
    </div>
  )
}

export default AnalyticsInvoices