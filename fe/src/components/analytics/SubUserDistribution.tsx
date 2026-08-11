import React, { useState } from 'react';
import { UserPlus, Users2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

interface TeamInfo {
  id: number;
  name: string;
}

interface SubUserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  joinedAt?: string; // Add joined date field
}

interface SubUserDistributionProps {
  data: Array<{
    userId: string;
    userName: string;
    subUserCount: number;
    totalTeamMembers?: number;
    currentUserRole?: string;
    teamInfo?: TeamInfo | null;
    subUsersList?: SubUserInfo[];
    joinedAt?: string; // Add joined date for main users
  }>;
  userName?: string;
}

const SubUserDistribution: React.FC<SubUserDistributionProps> = ({ data, userName }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  // Remove sorting - preserve original order
  const actualCount = data[0]?.subUsersList?.length || 0;
  const totalTeamMembers = actualCount || data[0]?.totalTeamMembers || data[0]?.subUserCount || 0;

  const getRoleColor = (role: string) => {
    const colors = {
      Admin: 'bg-teal-100 text-teal-700',
      Manager: 'bg-teal-100 text-teal-700',
      Member: 'bg-emerald-100 text-emerald-700',
    }
    return colors[role as keyof typeof colors] || 'bg-slate-100 text-slate-700'
  }

  // Format date function
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not available';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-800">Sub-User Distribution</h3>
        <p className="text-xs text-slate-500 mt-1">Team members by user</p>
      </div>

      <div className="p-6">
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((user, index) => {
              // For single user view, only show team members
              const isSingleUserView = userName && data.length === 1;

              if (isSingleUserView) {
                // Single user view - show team members in original order (by join date)
                const sortedSubUsers = user.subUsersList ? [...user.subUsersList] : [];
                // Sort by join date if available, otherwise keep original order
                sortedSubUsers.sort((a, b) => {
                  if (a.joinedAt && b.joinedAt) {
                    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
                  }
                  return 0;
                });

                return sortedSubUsers.length > 0 ? (
                  sortedSubUsers.map((subUser, subIndex) => (
                    <div
                      key={subUser.id || subIndex}
                      className="p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-black dark:text-white font-bold text-sm shadow-md border border-gray-300 dark:border-gray-600">
                            {subUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-black dark:text-white text-sm">
                              {subUser.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">#{subIndex + 1}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                          {subUser.email}
                        </p>

                        {/* Join date display */}
                        {subUser.joinedAt && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Joined: {formatDate(subUser.joinedAt)}</span>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <span className="inline-block text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                            {subUser.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div key="no-members" className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No team members found</p>
                  </div>
                );
              } else {
                // Multi-user view - show main users in original order (by join date)
                return (
                  <div
                    key={user.userId}
                    className="group p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-black dark:text-gray-300" />
                        </div>
                        <div>
                          <p className="font-semibold text-black dark:text-white text-sm">
                            {user.userName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {user.userId}</p>
                        </div>
                      </div>
                      {user.currentUserRole && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-medium">
                          {user.currentUserRole}
                        </span>
                      )}
                    </div>

                    {/* Join date for main user */}
                    {user.joinedAt && (
                      <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Joined: {formatDate(user.joinedAt)}</span>
                      </div>
                    )}

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xl font-medium text-black dark:text-white mb-1">
                          {user.subUserCount}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">sub-users</p>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(user.subUserCount, 5) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
                          />
                        ))}
                        {user.subUserCount > 5 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            +{user.subUserCount - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SubUserDistribution