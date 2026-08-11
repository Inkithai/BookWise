// components/analytics/UserInvoiceStats.tsx
import React from 'react'
import { TrendingUp, FileText, DollarSign } from 'lucide-react'

interface UserInvoiceStatsProps {
  data: Array<{
    userId: string
    userName: string
    invoiceCount: number
    totalAmount: number
  }>
  userName?: string
}

const UserInvoiceStats: React.FC<UserInvoiceStatsProps> = ({ data, userName }) => {
  const sampleData = [
    { userId: '1', userName: 'John Smith', invoiceCount: 45, totalAmount: 125000 },
    { userId: '2', userName: 'Sarah Johnson', invoiceCount: 38, totalAmount: 98450 },
    { userId: '3', userName: 'Michael Brown', invoiceCount: 32, totalAmount: 87600 },
    { userId: '4', userName: 'Emma Wilson', invoiceCount: 28, totalAmount: 65400 },
    { userId: '5', userName: 'David Lee', invoiceCount: 21, totalAmount: 43200 },
  ]

  const maxInvoices = Math.max(...sampleData.map(u => u.invoiceCount))

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800">User Invoice Statistics</h3>
        <p className="text-xs text-slate-500 mt-1">Invoice count and value by user</p>
      </div>

      <div className="p-6 space-y-4">
        {sampleData.map((user, index) => {
          const percentage = (user.invoiceCount / maxInvoices) * 100

          return (
            <div key={user.userId} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{user.userName}</span>
                  {index === 0 && (
                    <span className="text-xs bg-teal-100 text-teal-600 px-2 py-0.5 rounded-full">
                      Top
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">{user.invoiceCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-600">
                      £{user.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    index === 0 ? 'bg-teal-500' : 'bg-slate-300'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default UserInvoiceStats