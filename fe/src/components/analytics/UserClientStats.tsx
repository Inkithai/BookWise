// components/analytics/UserClientStats.tsx
import React, { useState } from 'react'
import { Users, TrendingUp } from 'lucide-react'

interface UserClientStatsProps {
  data: Array<{
    userId: string
    userName: string
    clientCount: number
    percentageOfTotal?: number
  }>
  userName?: string
  avgClientsPerUser?: number
}

const UserClientStats: React.FC<UserClientStatsProps> = ({ data, userName, avgClientsPerUser }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  // Remove sorting - use data as is to preserve original order
  const totalClients = data.reduce((sum, user) => sum + user.clientCount, 0);
  const avgClients = avgClientsPerUser?.toFixed(1) || (data.length > 0 ? (totalClients / data.length).toFixed(1) : '0');

  const displayName = userName || 'All Users';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800">Client Distribution</h3>
        <p className="text-xs text-slate-500 mt-1">Clients per user</p>
      </div>

      {isExpanded && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((user, index) => {
              const percentage = user.percentageOfTotal?.toFixed(1) || (totalClients > 0 ? ((user.clientCount / totalClients) * 100).toFixed(1) : '0');

              return (
                <div key={user.userId} className="p-4 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${index === 0 ? 'bg-emerald-100' : 'bg-slate-100'
                        } flex items-center justify-center`}>
                        <span className={`text-sm font-semibold ${index === 0 ? 'text-emerald-600' : 'text-slate-500'
                          }`}>
                          {user.userName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{user.userName}</p>
                        <p className="text-xs text-slate-400">#{index + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">{user.clientCount}</p>
                      <p className="text-xs text-slate-400">clients</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">of total</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Share</span>
                      <span className="text-xs font-medium text-emerald-600">{user.percentageOfTotal}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${index === 0 ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        style={{ width: `${user.percentageOfTotal}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">Average clients per user</span>
            <span className="text-lg font-bold text-slate-800">17.2</span>
          </div>
        </>
      )}
    </div >
  )
}

export default UserClientStats