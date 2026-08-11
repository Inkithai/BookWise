import React from 'react';
import { Users, FileText, UserCheck, TrendingUp } from 'lucide-react';

interface StatsOverviewProps {
  data: {
    totalUsers: number;
    userInvoices: Array<{
      invoiceCount: number;
      totalAmount: number;
    }>;
    userClients: Array<{
      clientCount: number;
    }>;
    subUsers: Array<{
      subUserCount: number;
    }>;
  };
  overview?: {
    total_invoices?: number;
    total_clients?: number;
    sub_users?: number;
    avg_invoices_per_user?: number;
  };
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ data, overview }) => {
  const totalInvoices = overview?.total_invoices ?? data.userInvoices.reduce((sum, user) => sum + user.invoiceCount, 0);
  const totalClients = overview?.total_clients ?? data.userClients.reduce((sum, user) => sum + user.clientCount, 0);
  const totalSubUsers = overview?.sub_users ?? data.subUsers.reduce((sum, user) => sum + user.subUserCount, 0);
  const avgInvoicesPerUser = overview?.avg_invoices_per_user?.toFixed(1) ?? 
    (data.totalUsers > 0 ? (totalInvoices / data.totalUsers).toFixed(1) : '0');

  const stats = [
    {
      title: 'Total Users',
      value: data.totalUsers,
      icon: Users,
      subText: 'Active system users',
    },
    {
      title: 'Total Invoices',
      value: totalInvoices,
      icon: FileText,
      subText: `Avg ${avgInvoicesPerUser} per user`,
    },
    {
      title: 'Total Clients',
      value: totalClients,
      icon: UserCheck,
      subText: 'Across all users',
    },
    {
      title: 'Sub Users',
      value: totalSubUsers,
      icon: TrendingUp,
      subText: 'Team members',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="group relative bg-white dark:bg-black rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
                  <Icon className="w-6 h-6 text-black dark:text-gray-300" />
                </div>
               
              </div>
              
              <p className="text-black dark:text-gray-400 text-sm font-medium mb-2">
                {stat.title}
              </p>
              
              <p className="text-lg font-medium text-black dark:text-white mb-2">
                {stat.value.toLocaleString()}
              </p>
              
              <p className="text-xs text-gray-700 dark:text-gray-500">
                {stat.subText}
              </p>
            </div>

            <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 opacity-30 rounded-full blur-2xl group-hover:opacity-40 transition-opacity duration-300"></div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsOverview;