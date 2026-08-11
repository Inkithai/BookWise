// services/analytics.service.ts - Google Analytics API Service
import axios from 'axios';
import { handleApiError } from './service';

// Create separate axios instance for analytics (no /api/v1/ prefix)
const analyticsHttp = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}/`,
  timeout: 30000,
  httpsAgent: typeof window === 'undefined' ? new (require('https')).Agent({ rejectUnauthorized: false }) : undefined,
});

// Add auth token to requests
analyticsHttp.interceptors.request.use((config) => {
  // Use the same token storage key as the main API service
  const tokenStorageKey = process.env.NEXT_PUBLIC_TOKEN_STORAGE_KEY || "authToken";
  const token = typeof window !== 'undefined' ? localStorage.getItem(tokenStorageKey) : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers.Accept = "application/json";
  }
  return config;
});

// Handle token expiration
analyticsHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token"); // Match main service token key
      localStorage.removeItem("user");
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

// ===== INTERFACES =====

export interface AnalyticsMetricInfo {
  totalSessionCount?: string;
  totalBotSessionCount?: string;
  distinctUserCount?: string;
  pagesPerSessionPercentage?: number;
  totalTime?: string;
  activeTime?: string;
  averageScrollDepth?: number;
  name?: string;
  sessionsCount?: string;
  url?: string;
  visitsCount?: string;
  sessionsWithMetricPercentage?: number;
  sessionsWithoutMetricPercentage?: number;
  pagesViews?: string;
  subTotal?: string;
}

export interface AnalyticsMetric {
  metricName: string;
  information: AnalyticsMetricInfo[];
}

export interface AvailableDate {
  value: string;
  label: string;
}

export interface GoogleAnalyticsResponse {
  success?: boolean;
  data?: {
    analyticsData: AnalyticsMetric[];
    lastFetchedAt: string;
    fromDate: string;
    toDate: string;
    availableDates: AvailableDate[];
  };
  // Support both nested and flat structure
  analyticsData?: AnalyticsMetric[];
  lastFetchedAt?: string;
  fromDate?: string;
  toDate?: string;
  availableDates?: AvailableDate[];
}

export interface FetchClarityResponse {
  success: boolean;
  message: string;
  data?: {
    lastFetchedAt: string;
  };
}


// ===== DATA TRANSFORMATION =====

/**
 * Helper to find and extract metric data
 */
const getMetric = (data: AnalyticsMetric[], metricName: string): AnalyticsMetric | undefined => {
  return data.find(m => m.metricName === metricName);
};

/**
 * Convert API response to frontend format
 */
export const transformAnalyticsData = (apiData: GoogleAnalyticsResponse) => {
  // Handle nested data structure { success: true, data: {...} }
  const actualData = apiData.data || apiData;
  const { analyticsData, lastFetchedAt, fromDate, toDate, availableDates } = actualData;

  // Validate response structure
  if (!analyticsData || !Array.isArray(analyticsData)) {
    console.error('Invalid API response structure:', apiData);
    throw new Error('Invalid analytics data format received from API');
  }

  // Traffic
  const traffic = getMetric(analyticsData, 'Traffic');
  const trafficInfo = traffic?.information[0] || {};

  // Engagement Time
  const engagementTime = getMetric(analyticsData, 'EngagementTime');
  const timeInfo = engagementTime?.information[0] || {};

  // Scroll Depth
  const scrollDepth = getMetric(analyticsData, 'ScrollDepth');
  const scrollInfo = scrollDepth?.information[0] || {};

  // Dead Clicks
  const deadClicks = getMetric(analyticsData, 'DeadClickCount');
  const deadClickInfo = deadClicks?.information[0] || {};

  // Rage Clicks
  const rageClicks = getMetric(analyticsData, 'RageClickCount');
  const rageClickInfo = rageClicks?.information[0] || {};

  // Quick Back Clicks
  const quickBack = getMetric(analyticsData, 'QuickbackClick');
  const quickBackInfo = quickBack?.information[0] || {};

  // Script Errors
  const scriptErrors = getMetric(analyticsData, 'ScriptErrorCount');
  const scriptErrorInfo = scriptErrors?.information[0] || {};

  // Browsers
  const browsers = getMetric(analyticsData, 'Browser');
  const browserList = browsers?.information || [];

  // Devices
  const devices = getMetric(analyticsData, 'Device');
  const deviceList = devices?.information || [];

  // Operating Systems
  const os = getMetric(analyticsData, 'OS');
  const osList = os?.information || [];

  // Countries
  const countries = getMetric(analyticsData, 'Country');
  const countryList = countries?.information || [];

  // Referrers
  const referrers = getMetric(analyticsData, 'ReferrerUrl');
  const referrerList = referrers?.information || [];

  // Popular Pages
  const popularPages = getMetric(analyticsData, 'PopularPages');
  const pagesList = popularPages?.information || [];

  return {
    stats: {
      totalSessions: parseInt(trafficInfo?.totalSessionCount || '0'),
      botSessions: parseInt(trafficInfo?.totalBotSessionCount || '0'),
      distinctUsers: parseInt(trafficInfo?.distinctUserCount || '0'),
      pagesPerSession: trafficInfo?.pagesPerSessionPercentage || 0,
      totalTimeSeconds: parseInt(timeInfo?.totalTime || '0'),
      activeTime: parseInt(timeInfo?.activeTime || '0'),
      avgScrollDepth: scrollInfo?.averageScrollDepth || 0,
    },
    engagement: {
      deadClicks: parseInt(deadClickInfo?.sessionsCount || '0'),
      rageClicks: parseInt(rageClickInfo?.sessionsCount || '0'),
      quickBackClicks: parseInt(quickBackInfo?.sessionsCount || '0'),
      scriptErrors: parseInt(scriptErrorInfo?.sessionsCount || '0'),
    },
    browsers: browserList.map(b => ({
      name: b.name || 'Unknown',
      value: parseFloat(b.sessionsCount || '0'),
    })),
    devices: deviceList.map(d => ({
      name: d.name || 'Unknown',
      value: parseFloat(d.sessionsCount || '0'),
    })),
    operatingSystems: osList.map(o => ({
      name: o.name || 'Unknown',
      value: parseFloat(o.sessionsCount || '0'),
    })),
    countries: countryList.map(c => ({
      name: c.name || 'Unknown',
      value: parseFloat(c.sessionsCount || '0'),
    })),
    referrers: referrerList.map(r => ({
      name: r.name || 'Direct',
      value: parseFloat(r.sessionsCount || '0'),
    })),
    pageVisits: pagesList.map(p => ({
      url: p.url || '',
      visits: parseInt(p.visitsCount || '0'),
    })),
    metadata: {
      lastFetchedAt: lastFetchedAt || new Date().toISOString(),
      fromDate: fromDate || '',
      toDate: toDate || '',
      availableDates: availableDates || [],
    },
  };
};

/**
 * Calculate percentages for chart data
 */
export const calculatePercentages = (items: Array<{ name: string; value: number }>) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) return items.map(item => ({ ...item, percentage: 0 }));
  
  return items.map(item => ({
    ...item,
    percentage: parseFloat(((item.value / total) * 100).toFixed(1)),
  }));
};

// ===== API CALLS =====

/**
 * Get Google Analytics data for a date range
 */
export const getGoogleAnalytics = async (
  fromDate?: string,
  toDate?: string,
  dateRange: string = 'custom'
) => {
  try {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    params.append('date_range', dateRange);

    const response = await analyticsHttp.get<GoogleAnalyticsResponse>(
      `api/v1/admin/google-analytics/invoice?${params.toString()}`
    );
    
    return {
      raw: response.data,
      transformed: transformAnalyticsData(response.data),
    };
  } catch (error) {
    console.error('Failed to fetch Google Analytics:', error);
    handleApiError(error, 'fetch Google Analytics data');
  }
};

/**
 * Manually trigger fresh data fetch from Clarity API
 */
export const fetchClarityData = async () => {
  try {
    const response = await analyticsHttp.post<FetchClarityResponse>(
      'api/v1/admin/google-analytics/fetch-clarity'
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Clarity data:', error);
    
    // Check for specific error messages
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      const message = axiosError.response?.data?.message;
      
      if (message?.includes('already exists')) {
        throw new Error('Data for today already fetched. Try again tomorrow.');
      }
      
      if (message?.includes('rate limit') || message?.includes('429')) {
        const retryAfter = axiosError.response?.data?.retryAfter;
        throw new Error(
          `Rate limited. Please try again in ${retryAfter ? Math.ceil(retryAfter / 60) + ' minutes' : 'a while'}.`
        );
      }
    }
    
    handleApiError(error, 'fetch fresh Clarity data');
  }
};

/**
 * Format seconds to readable time string
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
