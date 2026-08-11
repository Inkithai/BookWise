// GoogleAnalyticsDashboard.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, TrendingUp, Users, Clock, Activity, Globe, Monitor, Smartphone, Zap, MousePointer, AlertTriangle } from 'lucide-react';
import StatCard from './StatCard';
import EngagementCard from './EngagementCard';
import PieChartCard from './PieChartCard';
import PageVisitsTable from './PageVisitsTable';
import DateRangeFilter from './DateRangeFilter';
import { getGoogleAnalytics, fetchClarityData, formatTime, formatDate, calculatePercentages } from '@/services/analytics.service';
import { toast } from 'sonner';

interface AnalyticsData {
  stats: {
    totalSessions: number;
    botSessions: number;
    distinctUsers: number;
    pagesPerSession: number;
    totalTimeSeconds: number;
    activeTime: number;
    avgScrollDepth: number;
  };
  engagement: {
    deadClicks: number;
    rageClicks: number;
    quickBackClicks: number;
    scriptErrors: number;
  };
  browsers: Array<{ name: string; value: number }>;
  devices: Array<{ name: string; value: number }>;
  operatingSystems: Array<{ name: string; value: number }>;
  countries: Array<{ name: string; value: number }>;
  referrers: Array<{ name: string; value: number }>;
  pageVisits: Array<{ url: string; visits: number; avgTime?: number; bounceRate?: number }>;
  metadata?: {
    lastFetchedAt: string;
    fromDate: string;
    toDate: string;
    availableDates: Array<{ value: string; label: string }>;
  };
}

const GoogleAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    setDateRange({
      startDate: start,
      endDate: end,
    });

    // Fetch initial data
    loadAnalyticsData(start, end);
  }, []);

  const loadAnalyticsData = async (start?: string, end?: string) => {
    try {
      setIsLoading(true);
      
      const fromDate = start || dateRange.startDate;
      const toDate = end || dateRange.endDate;
      
      const result = await getGoogleAnalytics(fromDate, toDate, 'custom');
      
      if (result && result.transformed) {
        setAnalyticsData(result.transformed);
        toast.success('Analytics data loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
      
      // Keep existing data on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    await loadAnalyticsData();
  };

  const handleDateChange = (start: string, end: string) => {
    setDateRange({ startDate: start, endDate: end });
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      
      const result = await fetchClarityData();
      
      if (result?.success) {
        toast.success(result.message || 'Data refreshed successfully');
        
        // Reload analytics data after successful refresh
        await loadAnalyticsData();
      }
    } catch (error: any) {
      console.error('Failed to refresh:', error);
      toast.error(error.message || 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center mb-6 sm:mb-8 md:mb-10 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-initial">
              <DateRangeFilter
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onChange={handleDateChange}
                onApply={fetchAnalyticsData}
              />
            </div>
            <button
              onClick={handleRefresh}
              className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              disabled={isLoading || isRefreshing}
              title="Fetch fresh data from Clarity API"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !analyticsData && (
          <div className="flex items-center justify-center py-12 sm:py-16 md:py-20">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 animate-spin text-teal-600 dark:text-teal-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading analytics data...</p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !analyticsData && (
          <div className="flex items-center justify-center py-12 sm:py-16 md:py-20">
            <div className="text-center">
              <Activity className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">No analytics data available</p>
              <button
                onClick={() => loadAnalyticsData()}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Load Data
              </button>
            </div>
          </div>
        )}

        {/* Data Display */}
        {analyticsData && (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <StatCard
                title="Total Sessions"
                value={analyticsData.stats.totalSessions.toLocaleString()}
                subtitle={`Bot Sessions: ${analyticsData.stats.botSessions.toLocaleString()}`}
                icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6" />}
              />
              <StatCard
                title="Distinct Users"
                value={analyticsData.stats.distinctUsers.toLocaleString()}
                subtitle={`${analyticsData.stats.pagesPerSession} Pages/Session`}
                icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
              />
              <StatCard
                title="Total Time"
                value={formatTime(analyticsData.stats.totalTimeSeconds)}
                subtitle={`Active: ${formatTime(analyticsData.stats.activeTime)}`}
                icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />}
              />
              <StatCard
                title="Avg Scroll Depth"
                value={`${analyticsData.stats.avgScrollDepth}%`}
                subtitle="User engagement score"
                icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
              />
            </div>

            {/* Engagement Metrics */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 mb-8 hover:shadow-lg transition-shadow duration-300">
              <h2 className="text-xl font-bold text-primary dark:text-white mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                Engagement Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <EngagementCard
                  title="Dead Clicks"
                  value={analyticsData.engagement.deadClicks}
                  icon={<MousePointer className="w-5 h-5" />}
                />
                <EngagementCard
                  title="Rage Clicks"
                  value={analyticsData.engagement.rageClicks}
                  icon={<AlertTriangle className="w-5 h-5" />}
                />
                <EngagementCard
                  title="Quick Back Clicks"
                  value={analyticsData.engagement.quickBackClicks}
                  icon={<Activity className="w-5 h-5" />}
                />
                <EngagementCard
                  title="Script Errors"
                  value={analyticsData.engagement.scriptErrors}
                  icon={<AlertTriangle className="w-5 h-5" />}
                />
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <PieChartCard
                title="Browsers"
                data={calculatePercentages(analyticsData.browsers)}
                icon={<Globe className="w-4 h-4 sm:w-5 sm:h-5" />}
              />
              <PieChartCard
                title="Devices"
                data={calculatePercentages(analyticsData.devices)}
                icon={<Monitor className="w-4 h-4 sm:w-5 sm:h-5" />}
              />
              <PieChartCard
                title="Operating Systems"
                data={calculatePercentages(analyticsData.operatingSystems)}
                icon={<Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />}
              />
              <PieChartCard
                title="Top Countries"
                data={calculatePercentages(analyticsData.countries)}
                icon={<Globe className="w-4 h-4 sm:w-5 sm:h-5" />}
              />
            </div>

            {/* Referrers Chart */}
            <div className="mb-6 sm:mb-8">
              <PieChartCard
                title="Top Referrers"
                data={calculatePercentages(analyticsData.referrers)}
                icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
              />
            </div>

            {/* Page Visits Table */}
            <PageVisitsTable data={analyticsData.pageVisits} />
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleAnalyticsDashboard;