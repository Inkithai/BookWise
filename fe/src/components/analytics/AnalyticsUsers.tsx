// components/analytics/AnalyticsUsers.tsx
"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import {
  Edit, Trash2, MoreVertical, X, Search,
  Users, UserPlus, ChevronRight, ChevronLeft,
  ShieldCheck, ShieldOff, UserCheck, UserX,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format } from 'date-fns'
import { deleteUser, activateUser, deactivateUser } from '@/services/service'
import { parseApiError } from '@/services/service'
import {
  getAnalyticsUsers,
  type AnalyticsUser,
} from '@/services/userAnalytics.service'
import { RootState } from '@/slices/store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isOtpVerifiedUser = (user: Partial<AnalyticsUser> | null | undefined): boolean => {
  if (!user) return false
  const raw = (user as any).is_otp_verified
  const numeric = typeof raw === 'string' ? Number(raw) : raw
  if (numeric === 1) return true
  const label = String((user as any).is_otp_verified_label ?? '').trim().toLowerCase()
  return label === 'verified'
}

const AVATAR_GRADS = [
  { from: '#0D9488', to: '#14B8A6' },
  { from: '#115E59', to: '#5EEAD4' },
  { from: '#10b981', to: '#14b8a6' },
  { from: '#f59e0b', to: '#f97316' },
  { from: '#f43f5e', to: '#fb7185' },
  { from: '#5EEAD4', to: '#14B8A6' },
]

const resolveInitials = (name?: string | null) => {
  const safeName = (name ?? '').trim()
  if (!safeName) return '?'
  return safeName
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'
}

// ─── Sub-user distribution card ───────────────────────────────────────────────

function SubUserDistributionCard({ user, onClose }: { user: AnalyticsUser; onClose: () => void }) {
  const subUsers = user.sub_users ?? []
  const total = subUsers.length
  const activeCount = subUsers.filter(su => su.is_active).length
  const inactiveCount = total - activeCount
  const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0

  const statCards = [
    { label: 'Total Sub Users', value: total, icon: Users, bg: 'bg-teal-50', text: 'text-teal-600' },
    { label: 'Active', value: activeCount, icon: UserCheck, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Inactive', value: inactiveCount, icon: UserX, bg: 'bg-rose-50', text: 'text-rose-600' },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg">
      <div className="px-5 py-4 bg-gradient-to-r from-teal-500 to-pink-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sub User Distribution</h3>
              <p className="text-xs text-white/80 mt-0.5">{user.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 p-4">
        {statCards.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`${stat.bg} rounded-lg p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${stat.text}`} />
                <span className={`text-xs font-medium ${stat.text}`}>{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {total > 0 && (
        <>
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">Active ratio</span>
              <span className="text-xs font-semibold text-teal-600">{activePct}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${activePct}%`, background: 'linear-gradient(to right, #10b981, #34d399)' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-emerald-600">{activeCount} active</span>
              <span className="text-xs text-rose-500">{inactiveCount} inactive</span>
            </div>
          </div>

          <div className="px-4 pb-4">
            <p className="text-xs font-medium text-slate-500 mb-3">Team members ({total})</p>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {subUsers.map((su, i) => {
                const colors = AVATAR_GRADS[i % AVATAR_GRADS.length]
                const initials = resolveInitials(su.full_name)
                return (
                  <div key={su.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                      <span className="text-white text-xs font-bold">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{su.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{su.email || '—'}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${su.is_active ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${su.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className={`text-xs font-medium ${su.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {su.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {total === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-3">
            <UserPlus className="w-8 h-8 text-teal-300" />
          </div>
          <p className="text-sm font-medium text-slate-600">No sub users</p>
          <p className="text-xs text-slate-400 mt-1">This user doesn't have any team members yet</p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsUsers() {
  const authUser = useSelector((state: RootState) => state.auth.user)
  const isSuperAdmin = Array.isArray(authUser?.roles)
    ? authUser.roles.some((role) => String(role).toLowerCase() === 'super-admin')
    : false

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [accountTypeFilter, setAcctFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [users, setUsers] = useState<AnalyticsUser[]>([])
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    sub_users: 0,
    admin_users: 0,
    total_companies: 0,
  })
  const [pagination, setPagination] = useState({ total: 0, per_page: 10, current_page: 1, last_page: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AnalyticsUser | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'activate' | 'deactivate' | 'delete'; userId: number
  } | null>(null)

  const fetchUsers = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    try {
      setLoading(true)
      setError(null)
      const isOtpFilter = accountTypeFilter === 'verified' || accountTypeFilter === 'unverified'
      const res = await getAnalyticsUsers({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        account_type:
          accountTypeFilter !== 'all' && !isOtpFilter
            ? accountTypeFilter
            : undefined,
        page: currentPage,
        per_page: itemsPerPage,
      })
      setUsers(res.data)
      setSummary({
        ...res.summary,
        total_companies: res.summary.total_companies ?? 0,
      })
      setPagination(res.pagination)
      setLoading(false)
    } catch (e) {
      console.error(`Failed to load users (attempt ${retryCount + 1}):`, e);

      if (retryCount < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying in ${delay}ms...`);

        setTimeout(() => {
          fetchUsers(retryCount + 1);
        }, delay);
        return; // Don't set error yet, we're retrying
      }

      // All retries failed
      const userMessage = parseApiError(e, 'load users')

      setError(userMessage)
      setUsers([])
      setSummary({
        total: 0,
        active: 0,
        inactive: 0,
        sub_users: 0,
        admin_users: 0,
        total_companies: 0,
      })
      toast.error(`${userMessage}. Please try again.`)
      setLoading(false)
    }
  }, [search, statusFilter, accountTypeFilter, currentPage, itemsPerPage])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter, accountTypeFilter])

  const displayedUsers = (() => {
    if (accountTypeFilter === 'verified') return users.filter((u) => isOtpVerifiedUser(u))
    if (accountTypeFilter === 'unverified') return users.filter((u) => !isOtpVerifiedUser(u))
    return users
  })()

  const handleRetry = () => {
    fetchUsers(0)
  }

  const handleConfirm = async () => {
    if (!confirmDialog) return
    const { type, userId } = confirmDialog
    setConfirmDialog(null)
    try {
      setLoading(true)
      if (type === 'activate') await activateUser(userId)
      if (type === 'deactivate') await deactivateUser(userId)
      if (type === 'delete') await deleteUser(userId, 'delete')
      toast.success(`User ${type}d successfully`)
      await fetchUsers()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to ${type} user`)
    } finally {
      setLoading(false)
    }
  }

  const fallbackCompanyCount = new Set(
    users
      .map((u) => Number(u.company_id))
      .filter((id) => Number.isFinite(id) && id > 0)
  ).size

  const totalCompanies =
    Number((summary as any).total_companies ?? 0) > 0
      ? Number((summary as any).total_companies)
      : fallbackCompanyCount

  const summaryCards = [
    { label: 'Total Users', value: summary.total, icon: Users, bg: 'bg-teal-100', text: 'text-teal-600' },
    { label: 'Total Admins', value: summary.admin_users, icon: ShieldCheck, bg: 'bg-teal-100', text: 'text-teal-600' },
    ...(isSuperAdmin
      ? [{ label: 'Total Companies', value: totalCompanies, icon: Users, bg: 'bg-amber-100', text: 'text-amber-600' }]
      : []),
    { label: 'Active Users', value: summary.active, icon: UserCheck, bg: 'bg-emerald-100', text: 'text-emerald-600' },
    { label: 'Inactive Users', value: summary.inactive, icon: UserX, bg: 'bg-amber-100', text: 'text-amber-600' },
    { label: 'Sub Users', value: summary.sub_users, icon: UserPlus, bg: 'bg-teal-100', text: 'text-teal-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header removed. Kept right-side badge aligned to the end */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-teal-50 px-4 py-2 rounded-full">
          <Users className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-teal-700">{pagination.total} users</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-white rounded-xl border border-red-200 p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">{error}</h3>
            <p className="text-sm text-slate-500 mb-4">Please try again or contact support if the issue persists.</p>
            <Button onClick={handleRetry} className="bg-red-600 hover:bg-red-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {summaryCards.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${s.bg} rounded-lg`}><Icon className={`w-5 h-5 ${s.text}`} /></div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[240px]">
            <label htmlFor="analytics-users-search" className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input id="analytics-users-search" placeholder="Search by name, email, username..." value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                className="pl-9 h-10 text-sm rounded-lg border-slate-200 focus:border-teal-300" />
            </div>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="analytics-users-status" className="text-xs font-medium text-slate-500 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1) }}>
              <SelectTrigger id="analytics-users-status" className="h-10 text-sm rounded-lg border-slate-200"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <label htmlFor="analytics-users-account-type" className="text-xs font-medium text-slate-500 mb-1 block">Account Type</label>
            <Select value={accountTypeFilter} onValueChange={v => { setAcctFilter(v); setCurrentPage(1) }}>
              <SelectTrigger id="analytics-users-account-type" className="h-10 text-sm rounded-lg border-slate-200"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="verified">Verified Accounts</SelectItem>
                <SelectItem value="unverified">Unverified Accounts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(statusFilter !== 'all' || accountTypeFilter !== 'all' || search) && (
            <button onClick={() => { setSearch(''); setStatusFilter('all'); setAcctFilter('all'); setCurrentPage(1) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table + Sub-user panel */}
      <div className={`grid gap-5 ${selectedUser ? 'grid-cols-1 xl:grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['ID', 'User', 'Email', 'Phone', 'Account Type', 'Sub Users', 'Status', 'Joined', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedUsers.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No users found matching your filters</td></tr>
                    ) : displayedUsers.map((user, idx) => {
                      const isActive = !!user.is_active
                      const subCount = user.sub_user_count
                      const isSelected = selectedUser?.id === user.id
                      const colors = AVATAR_GRADS[idx % AVATAR_GRADS.length]
                      const initials = resolveInitials(user.full_name)

                      return (
                        <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-teal-50/50' : ''}`}>
                          <td className="px-4 py-4">
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">#{user.id}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                                <span className="text-white text-xs font-bold">{initials}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{user.full_name}</p>
                                <p className="text-xs text-slate-400">@{user.user_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4"><span className="text-sm text-slate-600">{user.email || '—'}</span></td>
                          <td className="px-4 py-4"><span className="text-sm text-slate-600">{user.phone_number || '—'}</span></td>
                          <td className="px-4 py-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${user.account_type === 'company' || user.company_id
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-teal-50 text-teal-600 border-teal-200'
                              }`}>
                              {user.account_type || (user.company_id ? 'Company' : 'Personal')}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => setSelectedUser(isSelected ? null : user)}
                              disabled={subCount === 0}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                ${subCount > 0
                                  ? isSelected
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100 cursor-pointer'
                                  : 'bg-slate-50 text-slate-400 cursor-default'
                                }`}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              {subCount}
                              {subCount > 0 && <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90' : ''}`} />}
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-sm text-slate-500">
                                {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100">
                                  <MoreVertical className="h-4 w-4 text-slate-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 shadow-lg w-44">
                                <DropdownMenuItem asChild>
                                  <Link href={`/analytics/edit/${user.id}`} className="cursor-pointer rounded-lg">
                                    <Edit className="mr-2 h-4 w-4 text-teal-500" /> Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {isActive ? (
                                  <DropdownMenuItem onClick={() => setConfirmDialog({ type: 'deactivate', userId: user.id })} className="cursor-pointer rounded-lg">
                                    <ShieldOff className="mr-2 h-4 w-4 text-amber-500" /> Deactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setConfirmDialog({ type: 'activate', userId: user.id })} className="cursor-pointer rounded-lg">
                                    <ShieldCheck className="mr-2 h-4 w-4 text-emerald-500" /> Activate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setConfirmDialog({ type: 'delete', userId: user.id })}
                                  className="cursor-pointer text-rose-600 focus:text-rose-600 rounded-lg">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Rows per page</span>
                      <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
                        <SelectTrigger className="h-8 w-16 text-sm rounded-lg border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent>{[10, 25, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-slate-500">
                      Showing {Math.min((pagination.current_page - 1) * pagination.per_page + 1, pagination.total)} to{' '}
                      {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="text-sm text-slate-600 px-2">Page {currentPage} of {pagination.last_page}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(pagination.last_page, p + 1))} disabled={currentPage === pagination.last_page}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sub-user distribution panel */}
        {selectedUser && (
          <div className="xl:sticky xl:top-5 xl:self-start">
            <SubUserDistributionCard user={selectedUser} onClose={() => setSelectedUser(null)} />
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent className="rounded-xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              {confirmDialog?.type === 'delete' ? 'Delete User' : confirmDialog?.type === 'deactivate' ? 'Deactivate User' : 'Activate User'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              {confirmDialog?.type === 'delete'
                ? 'Are you sure you want to permanently delete this user? This action cannot be undone.'
                : confirmDialog?.type === 'deactivate'
                ? 'Are you sure you want to deactivate this user? They will no longer be able to log in.'
                : 'Are you sure you want to activate this user? They will regain access to the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}
              className={`rounded-lg text-white ${confirmDialog?.type === 'delete' ? 'bg-rose-600 hover:bg-rose-700' :
                  confirmDialog?.type === 'deactivate' ? 'bg-amber-600 hover:bg-amber-700' :
                    'bg-emerald-600 hover:bg-emerald-700'
                }`}>
              {confirmDialog?.type === 'delete' ? 'Delete' : confirmDialog?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
