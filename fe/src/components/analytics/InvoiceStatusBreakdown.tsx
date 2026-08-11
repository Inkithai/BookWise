// components/analytics/InvoiceStatusBreakdown.tsx
"use client"

import React, { useState, useMemo } from 'react'
import {
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Mail,
  Users,
  ChevronDown,
  Search
} from 'lucide-react'

interface InvoiceStatusBreakdownProps {
  data: Array<{
    userId: string
    userName: string
    statuses: {
      Paid: number
      'Mail Sent': number
      Created: number
      Rejected: number
      'Not Paid': number
      'Installment Payment': number
      'Receipt Sent': number
      Draft: number
    }
  }>
  userName?: string
}

// Status configuration with colors and labels
const STATUS_CONFIG = [
  { key: 'Paid', icon: CheckCircle, label: 'Paid', color: 'emerald', gradient: 'from-emerald-500 to-green-500' },
  { key: 'Pending', icon: Clock, label: 'Pending', color: 'amber', gradient: 'from-amber-500 to-orange-500' },
  { key: 'Draft', icon: FileText, label: 'Draft', color: 'slate', gradient: 'from-slate-500 to-slate-600' },
  { key: 'Mail Sent', icon: Mail, label: 'Mail Sent', color: 'blue', gradient: 'from-teal-500 to-teal-500' },
  { key: 'Not Paid', icon: XCircle, label: 'Not Paid', color: 'amber', gradient: 'from-amber-500 to-orange-500' },
  { key: 'Rejected', icon: XCircle, label: 'Rejected', color: 'red', gradient: 'from-red-500 to-rose-500' },
  { key: 'Installment Payment', icon: Clock, label: 'Installment', color: 'purple', gradient: 'from-teal-500 to-pink-500' },
  { key: 'Receipt Sent', icon: CheckCircle, label: 'Receipt Sent', color: 'teal', gradient: 'from-teal-500 to-teal-500' },
  { key: 'Created', icon: FileText, label: 'Created', color: 'indigo', gradient: 'from-teal-500 to-teal-500' },
  { key: 'Overdue', icon: XCircle, label: 'Overdue', color: 'red', gradient: 'from-red-500 to-rose-500' },
]

const colorClasses = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', light: 'bg-emerald-100' },
  blue: { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500', light: 'bg-teal-100' },
  indigo: { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500', light: 'bg-teal-100' },
  red: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500', light: 'bg-red-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', light: 'bg-amber-100' },
  purple: { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500', light: 'bg-teal-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', bar: 'bg-teal-500', light: 'bg-teal-100' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-700', bar: 'bg-slate-500', light: 'bg-slate-100' },
}

const USER_AVATARS = [
  { from: '#0D9488', to: '#14B8A6' }, // teal mid to teal bright
  { from: '#115E59', to: '#5EEAD4' }, // deep teal to light teal
  { from: '#10b981', to: '#14b8a6' }, // emerald to teal
  { from: '#f59e0b', to: '#f97316' }, // amber to orange
  { from: '#f43f5e', to: '#fb7185' }, // rose to pink
]

const InvoiceStatusBreakdown: React.FC<InvoiceStatusBreakdownProps> = ({ data, userName }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  // Get unique users from data
  const users = useMemo(() => {
    return data.map(item => ({
      id: item.userId,
      name: item.userName,
      total: Object.values(item.statuses).reduce((sum, val) => sum + val, 0)
    }))
  }, [data])

  // Get statuses for selected user or all users combined
  const statusData = useMemo(() => {
    if (selectedUserId === 'all') {
      // Combine all users' statuses
      const combined: Record<string, number> = {}
      data.forEach(user => {
        Object.entries(user.statuses).forEach(([status, count]) => {
          combined[status] = (combined[status] || 0) + count
        })
      })
      return combined
    } else {
      // Get specific user's statuses
      const user = data.find(u => u.userId === selectedUserId)
      return user?.statuses || {}
    }
  }, [data, selectedUserId])

  // Calculate total
  const total = Object.values(statusData).reduce((sum, val) => sum + val, 0)

  // Get selected user name
  const selectedUser = users.find(u => u.id === selectedUserId)

  // Filter users based on search
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Statuses we want to show (prioritized)
  const priorityStatuses = ['Paid', 'Pending', 'Draft', 'Mail Sent', 'Not Paid', 'Rejected']

  // Sort statuses: priority first, then by count
  const sortedStatuses = Object.entries(statusData)
    .sort((a, b) => {
      const aPriority = priorityStatuses.indexOf(a[0])
      const bPriority = priorityStatuses.indexOf(b[0])
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority
      if (aPriority !== -1) return -1
      if (bPriority !== -1) return 1
      return b[1] - a[1]
    })

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header with User Selector */}
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-teal-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Invoice Status Breakdown</h3>
            <p className="text-xs text-slate-500 mt-1">Filter invoice status by user</p>
          </div>

          {/* User Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 hover:border-teal-300 transition-colors min-w-[200px]"
            >
              <Users className="w-4 h-4 text-teal-500" />
              <span className="flex-1 text-left text-sm font-medium">
                {selectedUserId === 'all' ? 'All Users' : selectedUser?.name}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-slate-200 shadow-lg z-10">
                {/* Search */}
                <div className="p-2 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:border-teal-300"
                    />
                  </div>
                </div>

                {/* User List */}
                <div className="max-h-60 overflow-y-auto p-1">
                  <button
                    onClick={() => {
                      setSelectedUserId('all')
                      setShowUserDropdown(false)
                      setSearchTerm('')
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between
                      ${selectedUserId === 'all' ? 'bg-teal-50 text-teal-600' : 'hover:bg-slate-50'}`}
                  >
                    <span className="font-medium">All Users</span>
                    <span className="text-xs text-slate-400">{data.length} users</span>
                  </button>

                  {filteredUsers.map((user, index) => {
                    const colors = USER_AVATARS[index % USER_AVATARS.length]
                    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id)
                          setShowUserDropdown(false)
                          setSearchTerm('')
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2
                          ${selectedUserId === user.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                        </div>
                        <span className="text-xs text-slate-400">{user.total}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {sortedStatuses.map(([status, count]) => {
            const config = STATUS_CONFIG.find(c => c.key === status)
            if (!config) return null

            const colors = colorClasses[config.color as keyof typeof colorClasses]
            const Icon = config.icon
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0'

            return (
              <div 
                key={status} 
                className="group relative bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all"
              >
                {/* Decorative gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 group-hover:opacity-5 rounded-lg transition-opacity`} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${colors.light}`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <span className={`text-xs font-semibold ${colors.text}`}>{percentage}%</span>
                  </div>

                  <p className="text-xl font-bold text-slate-800">{count}</p>
                  <p className="text-xs text-slate-500 mb-2">{config.label}</p>

                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer with Total and Selected User Info */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Total Invoices</span>
              <span className="text-lg font-bold text-slate-800">{total}</span>
            </div>
            {selectedUserId !== 'all' && selectedUser && (
              <>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filtered by:</span>
                  <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">
                    {selectedUser.name}
                  </span>
                  <button
                    onClick={() => setSelectedUserId('all')}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mini User Indicators */}
          {selectedUserId === 'all' && (
            <div className="flex items-center gap-1">
              {users.slice(0, 5).map((user, index) => {
                const colors = USER_AVATARS[index % USER_AVATARS.length]
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <div
                    key={user.id}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[8px] font-bold cursor-help"
                    style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
                    title={user.name}
                  >
                    {initials}
                  </div>
                )
              })}
              {users.length > 5 && (
                <span className="text-xs text-slate-400 ml-1">+{users.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InvoiceStatusBreakdown