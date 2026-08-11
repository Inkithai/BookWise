"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  Search, Mail, Phone, Building2, MoreVertical,
  Users, UserCheck, UserX, ChevronLeft, ChevronRight, X,
  PieChart,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getAnalyticsClients,
  type AnalyticsClient,
  type UserClientStat,
} from '@/services/userAnalytics.service'

// ── getUsersList() is intentionally NOT imported here anymore.
// The Owner dropdown is now built from userDistribution which comes from the
// same getAnalyticsClients() call. This guarantees the userId values in the
// dropdown are exactly the same host_id values used by the PHP filter —
// so they always match. Using a separate endpoint returned ALL users, many
// of whom had no clients, causing the filter to return 0 results.

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_GRADS = [
  { from: '#0D9488', to: '#14B8A6', text: 'text-teal-600' },
  { from: '#115E59', to: '#5EEAD4', text: 'text-teal-600' },
  { from: '#10b981', to: '#14b8a6', text: 'text-emerald-600' },
  { from: '#f59e0b', to: '#f97316', text: 'text-amber-600' },
  { from: '#f43f5e', to: '#fb7185', text: 'text-rose-600' },
  { from: '#5EEAD4', to: '#14B8A6', text: 'text-teal-600' },
]

const getInitials = (name: string) =>
  name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({ client, gradFrom, gradTo, textColor }: {
  client: AnalyticsClient
  gradFrom: string
  gradTo: string
  textColor: string
}) {
  return (
    <div className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(to right, ${gradFrom}, ${gradTo})` }} />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}>
            <span className="text-white text-sm font-bold">{getInitials(client.name)}</span>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">{client.name}</p>
            <div className="flex items-center gap-1 mt-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs text-slate-500">{client.company || '—'}</p>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-slate-200 w-32">
            <DropdownMenuItem className="rounded-lg text-sm">Edit</DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-sm text-rose-600 focus:text-rose-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-600 truncate">{client.email || '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-sm text-slate-600">{client.phone || '—'}</span>
        </div>
        {client.userName && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm text-slate-500">Owner:</span>
            <span className="text-sm font-medium text-slate-700">{client.userName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${client.status === 'active'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
          {client.status === 'active' ? 'Active' : 'Inactive'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Invoices:</span>
          <span className={`text-lg font-bold ${textColor}`}>{client.totalInvoices}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Client Distribution Card ─────────────────────────────────────────────────

function ClientDistributionCard({
  stats, selectedUserId, onSelectUser,
}: {
  stats: UserClientStat[]
  selectedUserId: string
  onSelectUser: (id: string) => void
}) {
  const max = Math.max(...stats.map(s => s.clientCount), 1)
  const total = stats.reduce((s, u) => s + u.clientCount, 0)
  const avg = stats.length > 0 ? (total / stats.length).toFixed(1) : '0'
  const sorted = [...stats].sort((a, b) => b.clientCount - a.clientCount)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <PieChart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Client Distribution</h3>
              <p className="text-xs text-slate-500 mt-0.5">Clients per user — click to filter</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">{total}</p>
              <p className="text-xs text-slate-500">Total Clients</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-700">{avg}</p>
              <p className="text-xs text-slate-500">Avg per User</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((user, index) => {
            const pct = (user.clientCount / max) * 100
            const sharePct = total > 0 ? ((user.clientCount / total) * 100).toFixed(1) : '0'
            const isSelected = selectedUserId === String(user.userId)
            const colors = AVATAR_GRADS[index % AVATAR_GRADS.length]

            return (
              <button
                key={user.userId}
                onClick={() => onSelectUser(isSelected ? 'all' : String(user.userId))}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${isSelected
                    ? 'border-emerald-400 bg-emerald-50 shadow-md'
                    : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                    <span className="text-white text-sm font-bold">{getInitials(user.userName)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-slate-800 truncate">{user.userName}</p>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-xs text-slate-400">{sharePct}%</span>
                        <span className="text-lg font-bold text-slate-800">{user.clientCount}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: `linear-gradient(to right, ${colors.from}, ${colors.to})` }} />
                    </div>
                  </div>
                </div>
                {(user.activeCount > 0 || user.inactiveCount > 0) && (
                  <div className="flex items-center gap-2 mt-2">
                    {user.activeCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active: {user.activeCount}
                      </span>
                    )}
                    {user.inactiveCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Inactive: {user.inactiveCount}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AnalyticsClients: React.FC = () => {

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9

  const [clients, setClients] = useState<AnalyticsClient[]>([])
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 })
  const [userDistribution, setUserDist] = useState<UserClientStat[]>([])
  const [pagination, setPagination] = useState({ total: 0, per_page: 9, current_page: 1, last_page: 1 })
  const [loading, setLoading] = useState(true)

  // ── THE FIX: derive Owner dropdown options directly from userDistribution ──
  // userDistribution comes from the same getAnalyticsClients() API call.
  // Its userId values are exactly the host_id values in invoices_clients —
  // guaranteed to match the PHP filter. No separate getUsersList() call needed.
  // We keep a stable copy so the dropdown doesn't empty out while filtering.
  const [ownerOptions, setOwnerOptions] = useState<UserClientStat[]>([])

  const fetchClients = useCallback(async (
    _search: string,
    _status: string,
    _userId: string,
    _page: number,
  ) => {
    try {
      setLoading(true)
      const res = await getAnalyticsClients({
        search: _search || undefined,
        status: _status !== 'all' ? _status : undefined,
        user_id: _userId !== 'all' ? _userId : undefined,
        page: _page,
        per_page: itemsPerPage,
      })
      setClients(res.clients)
      setSummary(res.summary)
      setUserDist(res.user_distribution)
      setPagination(res.pagination)

      // Only update ownerOptions when no user filter is active —
      // when filtered, user_distribution only contains the selected user,
      // which would collapse the dropdown to one option.
      if (_userId === 'all') {
        setOwnerOptions(res.user_distribution)
      }
    } catch (e) {
      console.error('Failed to fetch clients', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients(search, statusFilter, userFilter, currentPage)
  }, [search, statusFilter, userFilter, currentPage, fetchClients])

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleUserChange = (value: string) => {
    setUserFilter(value)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleDistributionClick = (id: string) => {
    setUserFilter(id)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setUserFilter('all')
    setCurrentPage(1)
  }

  const hasFilters = search !== '' || statusFilter !== 'all' || userFilter !== 'all'

  const statCards = [
    { label: 'Total Clients', value: summary.total, icon: Users, gradFrom: '#0D9488', gradTo: '#14B8A6', iconBg: 'bg-teal-100', text: 'text-teal-600' },
    /*{ label: 'Active',        value: summary.active,   icon: UserCheck, gradFrom: '#10b981', gradTo: '#14b8a6', iconBg: 'bg-emerald-100', text: 'text-emerald-600' },
    { label: 'Inactive',      value: summary.inactive, icon: UserX,     gradFrom: '#f43f5e', gradTo: '#fb7185', iconBg: 'bg-rose-100',    text: 'text-rose-600' },*/
  ]

  return (
    <div className="space-y-6">

      {/* Header removed. Kept right-side badge aligned to the end */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full">
          <Users className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-700">{pagination.total} clients</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {statCards.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="group relative bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all overflow-hidden">
              <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500"
                style={{ background: `linear-gradient(135deg, ${s.gradFrom}, ${s.gradTo})` }} />
              <div className="relative flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${s.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-sm font-medium text-slate-500">{s.label}</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                style={{ background: `linear-gradient(to right, ${s.gradFrom}, ${s.gradTo})` }} />
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap gap-4 items-end">

          <div className="flex-1 min-w-[240px]">
            <label htmlFor="analytics-clients-search" className="text-xs font-medium text-slate-500 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="analytics-clients-search"
                placeholder="Name, email, company or owner..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-9 h-10 text-sm rounded-lg border-slate-200 focus:border-emerald-300"
              />
            </div>
          </div>

          <div className="min-w-[160px]">
            <label htmlFor="analytics-clients-user" className="text-xs font-medium text-slate-500 mb-1 block">User</label>
            <Select value={userFilter} onValueChange={v => { setUserFilter(v); setCurrentPage(1) }}>
              <SelectTrigger id="analytics-clients-user" className="h-10 text-sm rounded-lg border-slate-200"><SelectValue placeholder="All Users" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {ownerOptions.map(u => (
                  <SelectItem key={String(u.userId)} value={String(u.userId)}>
                    {u.userName}

                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Active filter pills */}
      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Search: "{search}"
              <button onClick={() => handleSearchChange('')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Status: {statusFilter}
              <button onClick={() => handleStatusChange('all')}><X className="w-3 h-3" /></button>
            </span>
          )}
          {userFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
              Owner: {ownerOptions.find(u => String(u.userId) === userFilter)?.userName ?? userFilter}
              <button onClick={() => handleUserChange('all')}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Client Cards Grid */}
      {loading && clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
          <p className="text-base">Loading clients...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-slate-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-base">No clients found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((client, idx) => {
            const ownerIdx = ownerOptions.findIndex(u => String(u.userId) === String(client.userId))
            const colors = AVATAR_GRADS[Math.max(ownerIdx, 0) % AVATAR_GRADS.length]
            return (
              <ClientCard
                key={client.id}
                client={client}
                gradFrom={colors.from}
                gradTo={colors.to}
                textColor={colors.text}
              />
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {Math.min((pagination.current_page - 1) * pagination.per_page + 1, pagination.total)} to{' '}
            {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} clients
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

      {/* Distribution card */}
      {userDistribution.length > 0 && (
        <ClientDistributionCard
          stats={userDistribution}
          selectedUserId={userFilter}
          onSelectUser={handleDistributionClick}
        />
      )}

    </div>
  )
}

export default AnalyticsClients