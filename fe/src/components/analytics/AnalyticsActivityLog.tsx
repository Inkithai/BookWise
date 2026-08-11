"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, Eye, ChevronLeft, ChevronRight, X,
  Clock, CheckCircle, XCircle, AlertCircle,
  Shield, Users, Mail, UserCog
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  getActivityLogs,
  type ActivityLogItem,
} from '@/services/userAnalytics.service'

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; text: string }> = {
  login:          { label: 'Login',          icon: Shield,   color: '#14B8A6', bg: 'bg-teal-50',   text: 'text-teal-700' },
  register:       { label: 'Register',       icon: Users,    color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  verify_otp:     { label: 'Verify OTP',     icon: Shield,   color: '#0F766E', bg: 'bg-teal-50',  text: 'text-teal-700' },
  forget_password:{ label: 'Forget Password',icon: Mail,     color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700' },
  update_info:    { label: 'Update Info',    icon: UserCog,  color: '#5EEAD4', bg: 'bg-teal-50',    text: 'text-teal-700' },
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; text: string; border: string }> = {
  success: { icon: CheckCircle, color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  failed:  { icon: XCircle,     color: '#ef4444', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' },
  pending: { icon: Clock,       color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  default: { icon: AlertCircle, color: '#64748b', bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200' },
}

const ACCOUNT_TYPE_COLORS: Record<string, { from: string; to: string; bg: string; text: string }> = {
  super_admin: { from: '#0F766E', to: '#0D9488', bg: 'bg-teal-100',  text: 'text-teal-600' },
  admin:       { from: '#14B8A6', to: '#5EEAD4', bg: 'bg-teal-100',    text: 'text-teal-600' },
  user:        { from: '#10b981', to: '#14b8a6', bg: 'bg-emerald-100', text: 'text-emerald-600' },
  guest:       { from: '#94a3b8', to: '#64748b', bg: 'bg-slate-100',   text: 'text-slate-600' },
}

const AVATAR_COLORS = [
  { from: '#0D9488', to: '#14B8A6' },
  { from: '#0F766E', to: '#2DD4BF' },
  { from: '#5EEAD4', to: '#14B8A6' },
  { from: '#10b981', to: '#14b8a6' },
  { from: '#f59e0b', to: '#f97316' },
  { from: '#ef4444', to: '#fb7185' },
]

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 75, 100]

// Helper function to truncate text
function truncateText(text: string, maxLength: number = 60): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Helper function to get short description based on type and status
function getShortDescription(log: ActivityLogItem): string {
  const type = log.type
  const status = log.status
  const action = log.action || ''
  const details = log.details || ''

  // If there's an action, use it as base
  let description = action

  // Add brief context based on type and status
  if (type === 'login') {
    if (status === 'failed') {
      return 'Failed login attempt'
    } else if (status === 'success') {
      return 'Successful login'
    }
  } else if (type === 'register') {
    if (status === 'pending') {
      return 'Registration pending verification'
    } else if (status === 'success') {
      return 'Registration completed'
    } else if (status === 'failed') {
      return 'Registration failed'
    }
  } else if (type === 'verify_otp') {
    if (status === 'failed') {
      return 'Invalid OTP code'
    } else if (status === 'success') {
      return 'OTP verified successfully'
    }
  } else if (type === 'forget_password') {
    if (status === 'pending') {
      return 'Password reset email sent'
    } else if (status === 'failed') {
      return 'Password reset failed'
    }
  } else if (type === 'update_info') {
    return 'Profile updated'
  }

  // If we have details, use a truncated version
  if (details) {
    // Try to extract just the main message
    if (details.includes(':')) {
      const parts = details.split(':')
      return truncateText(parts[0] + ': ' + (parts[1]?.substring(0, 30) || ''), 60)
    }
    return truncateText(details, 60)
  }

  // Fallback to action or type
  return description || type || 'Activity log'
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatAccountType(type: string): string {
  const map: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', user: 'User', guest: 'Guest' }
  return map[type] || type || 'Unknown'
}

function formatRequestData(data: string): string {
  try { 
    const parsed = JSON.parse(data)
    // If it's an object with many fields, show just a summary
    if (typeof parsed === 'object' && parsed !== null) {
      const keys = Object.keys(parsed)
      if (keys.length > 3) {
        return `{${keys.slice(0, 3).join(', ')}...} (${keys.length} fields)`
      }
    }
    return JSON.stringify(parsed, null, 2) 
  } catch { 
    return truncateText(data, 100) 
  }
}

// ─── Log Card ─────────────────────────────────────────────────────────────────

function LogCard({ log, expandedId, setExpandedId }: {
  log: ActivityLogItem; expandedId: number | null; setExpandedId: (id: number | null) => void
}) {
  const typeConfig    = TYPE_CONFIG[log.type] || { 
    label: log.type || 'Unknown', 
    icon: AlertCircle, 
    color: '#64748b', 
    bg: 'bg-slate-50', 
    text: 'text-slate-600' 
  }
  
  const statusKey = log.status && STATUS_CONFIG[log.status] ? log.status : 'default'
  const statusConfig = STATUS_CONFIG[statusKey]
  
  const accountColors = ACCOUNT_TYPE_COLORS[log.account_type] || ACCOUNT_TYPE_COLORS.guest
  const StatusIcon    = statusConfig.icon
  const TypeIcon      = typeConfig.icon
  const avatarColors  = AVATAR_COLORS[log.id % AVATAR_COLORS.length]
  const isExpanded    = expandedId === log.id
  
  const shortDescription = getShortDescription(log)

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200 overflow-hidden mb-3">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${avatarColors.from}, ${avatarColors.to})` }}>
            <span className="text-white text-sm font-bold font-mono">{log.id}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${accountColors.from}, ${accountColors.to})` }}>
                <span className="text-white text-xs font-bold">{getInitials(log.user_name)}</span>
              </div>
              <span className="text-sm font-semibold text-slate-800">{log.user_name}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${accountColors.bg} ${accountColors.text} border-slate-200`}>
                {formatAccountType(log.account_type)}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeConfig.bg} ${typeConfig.text} border-slate-200`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {typeConfig.label}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {log.status || 'unknown'}
              </span>
              <button onClick={() => setExpandedId(isExpanded ? null : log.id)}
                className="ml-auto p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <Eye className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">{log.time_ago}</span>
              </div>
              {log.ip_address && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">IP:</span>
                  <span className="text-xs font-mono text-slate-600">{log.ip_address}</span>
                </div>
              )}
            </div>

            {/* Short description */}
            <p className="text-sm text-slate-600 mb-2">{shortDescription}</p>

            {/* Show error indicator for failed logs without expanding */}
            {log.status === 'failed' && !isExpanded && log.details && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-xs text-rose-600">{truncateText(log.details, 40)}</span>
              </div>
            )}

            {/* Expanded view with full details */}
            {isExpanded && (
              <div className="mt-4 space-y-3">
                {log.details && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <p className="text-xs font-medium text-slate-500">Full Details</p>
                    </div>
                    <pre className="p-3 text-xs font-mono text-slate-600 bg-white overflow-x-auto max-h-40">
                      {log.details}
                    </pre>
                  </div>
                )}
                {log.error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                    <p className="text-xs font-medium text-rose-700 mb-1">Error Details</p>
                    <p className="text-xs text-rose-600 font-mono break-all">{log.error}</p>
                  </div>
                )}
                {log.request_data && (
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <p className="text-xs font-medium text-slate-500">Request Data</p>
                    </div>
                    <pre className="p-3 text-xs font-mono text-slate-600 bg-white overflow-x-auto max-h-40">
                      {formatRequestData(log.request_data)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsActivityLog() {
  const [search, setSearch]               = useState('')
  const [typeFilter, setTypeFilter]       = useState('all')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [accountTypeFilter, setAcctFilter]= useState('all')
  const [currentPage, setCurrentPage]     = useState(1)
  const [expandedId, setExpandedId]       = useState<number | null>(null)
  const [itemsPerPage, setItemsPerPage]   = useState(10)

  // API data
  const [logs, setLogs]           = useState<ActivityLogItem[]>([])
  const [summary, setSummary]     = useState({ total: 0, success: 0, failed: 0, pending: 0 })
  const [pagination, setPagination] = useState({ total: 0, per_page: 10, current_page: 1, last_page: 1 })
  const [loading, setLoading]     = useState(true)

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getActivityLogs({
        search:       search       || undefined,
        type:         typeFilter   !== 'all' ? typeFilter   : undefined,
        status:       statusFilter !== 'all' ? statusFilter : undefined,
        account_type: accountTypeFilter !== 'all' ? accountTypeFilter : undefined,
        page:         currentPage,
        per_page:     itemsPerPage,
      })
      setLogs(res.data)
      setSummary(res.summary)
      setPagination(res.pagination)
    } catch (e) {
      console.error('Failed to fetch activity logs', e)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, accountTypeFilter, currentPage, itemsPerPage])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { setCurrentPage(1) }, [search, typeFilter, statusFilter, accountTypeFilter, itemsPerPage])

  const statCards = [
    { label: 'Total Events', value: summary.total,   icon: Clock,       color: '#0D9488', iconBg: 'bg-teal-100',  text: 'text-teal-600' },
    { label: 'Success',      value: summary.success, icon: CheckCircle, color: '#10b981', iconBg: 'bg-emerald-100', text: 'text-emerald-600' },
    { label: 'Failed',       value: summary.failed,  icon: XCircle,     color: '#ef4444', iconBg: 'bg-rose-100',    text: 'text-rose-600' },
    { label: 'Pending',      value: summary.pending, icon: Clock,       color: '#f59e0b', iconBg: 'bg-amber-100',   text: 'text-amber-600' },
  ]

  const hasFilters = search || typeFilter !== 'all' || statusFilter !== 'all' || accountTypeFilter !== 'all'
  const clearFilters = () => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); setAcctFilter('all'); setCurrentPage(1) }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-teal-50 px-4 py-2 rounded-full">
          <Clock className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-teal-700">{pagination.total} events</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="group relative bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all overflow-hidden">
              <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500"
                style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color})` }} />
              <div className="relative flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${stat.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                style={{ background: `linear-gradient(to right, ${stat.color}, ${stat.color})` }} />
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor="analytics-activity-search" className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input id="analytics-activity-search" placeholder="Search by user, email, description..." value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                className="pl-9 h-10 text-sm rounded-lg border-slate-200 focus:border-teal-300" />
            </div>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="analytics-activity-account-type" className="text-xs font-medium text-slate-500 mb-1 block">Account Type</label>
            <Select value={accountTypeFilter} onValueChange={v => { setAcctFilter(v); setCurrentPage(1) }}>
              <SelectTrigger id="analytics-activity-account-type" className="h-10 text-sm rounded-lg border-slate-200"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="analytics-activity-action-type" className="text-xs font-medium text-slate-500 mb-1 block">Action Type</label>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setCurrentPage(1) }}>
              <SelectTrigger id="analytics-activity-action-type" className="h-10 text-sm rounded-lg border-slate-200"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.keys(TYPE_CONFIG).map(t => <SelectItem key={t} value={t}>{TYPE_CONFIG[t].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="analytics-activity-status" className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1) }}>
              <SelectTrigger id="analytics-activity-status" className="h-10 text-sm rounded-lg border-slate-200"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Logs List */}
      {loading && logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-3" />
          <p className="text-base">Loading activity logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <Clock className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base">No activity logs found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <LogCard key={log.id} log={log} expandedId={expandedId} setExpandedId={setExpandedId} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Rows per page</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => {
                setItemsPerPage(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[90px] h-9 rounded-lg border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-slate-500">
            Showing {Math.min((pagination.current_page - 1) * pagination.per_page + 1, pagination.total)} to{' '}
            {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} events
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
  )
}