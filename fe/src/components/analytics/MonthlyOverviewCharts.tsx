// components/analytics/MonthlyOverviewCharts.tsx
"use client"

import React, { useState, useMemo } from 'react'
import {
  FileText,
  Users,
  ChevronDown,
  TrendingUp,
} from 'lucide-react'

interface MonthlyDataPoint {
  month: string // e.g. "2024-01"
  invoices?: number
  clients?: number
  users?: number
  subUsers?: number
}

interface MonthlyOverviewChartsProps {
  data?: MonthlyDataPoint[]
  isLoading?: boolean
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CHART_HEIGHT = 180

interface ChartConfig {
  key: keyof Omit<MonthlyDataPoint, 'month'>
  title: string
  subtitle: string
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  lightBg: string
  iconBg: string
  iconColor: string
  textColor: string
  borderColor: string
}

const CHARTS: ChartConfig[] = [
  {
    key: 'invoices',
    title: 'Invoices Created',
    subtitle: 'Monthly invoice generation',
    icon: FileText,
    gradientFrom: '#0D9488',
    gradientTo: '#14B8A6',
    lightBg: 'bg-teal-50',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    textColor: 'text-teal-600',
    borderColor: 'border-teal-200',
  },
  {
    key: 'users',
    title: 'Users Joined',
    subtitle: 'New user registrations',
    icon: Users,
    gradientFrom: '#2DD4BF',
    gradientTo: '#5EEAD4',
    lightBg: 'bg-teal-50',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    textColor: 'text-teal-600',
    borderColor: 'border-teal-200',
  },
]

interface BarChartProps {
  config: ChartConfig
  monthlyValues: number[]
  isLoading: boolean
}

const BarChart: React.FC<BarChartProps> = ({ config, monthlyValues, isLoading }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const Icon = config.icon

  const max = Math.max(...monthlyValues, 1)
  const total = monthlyValues.reduce((a, b) => a + b, 0)

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b border-slate-100 ${config.lightBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${config.iconBg} shadow-sm`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{config.title}</h3>
              <p className="text-xs text-slate-500">{config.subtitle}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.lightBg} ${config.textColor} border ${config.borderColor}`}>
            {total} total
          </span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="p-5">
        <div
          className="flex items-end gap-1 mb-2"
          style={{ height: `${CHART_HEIGHT}px` }}
        >
          {monthlyValues.map((val, i) => {
            const barHeight = max > 0 ? Math.max((val / max) * CHART_HEIGHT, val > 0 ? 4 : 0) : 0
            const isHovered = hoveredIndex === i

            return (
              <div
                key={i}
                className="relative flex-1 flex flex-col items-end justify-end"
                style={{ height: '100%' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && !isLoading && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap z-20 pointer-events-none shadow-lg">
                    {MONTHS[i]}: {val}
                  </div>
                )}

                {/* Bar — show a ghost bar at min height when loading/empty */}
                <div
                  className="w-full rounded-t-md transition-all duration-300"
                  style={{
                    height: isLoading || val === 0 ? '4px' : `${barHeight}px`,
                    background: isLoading
                      ? '#e2e8f0'
                      : isHovered
                        ? `linear-gradient(to top, ${config.gradientTo}, ${config.gradientFrom})`
                        : `linear-gradient(to top, ${config.gradientFrom}, ${config.gradientTo})`,
                    opacity: isHovered && !isLoading ? 1 : 0.9,
                    boxShadow: isHovered && !isLoading ? `0 2px 8px ${config.gradientFrom}40` : 'none',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Month Labels */}
        <div className="flex gap-1 mt-2">
          {MONTHS.map((m, i) => (
            <div
              key={i}
              className="flex-1 text-center text-[10px] font-medium transition-colors"
              style={{ color: hoveredIndex === i ? config.textColor : '#94a3b8' }}
            >
              {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const MonthlyOverviewCharts: React.FC<MonthlyOverviewChartsProps> = ({ data, isLoading = false }) => {
  const hasData = data && data.length > 0

  const availableYears = useMemo(() => {
    if (!hasData) return [new Date().getFullYear()]
    const years = [...new Set(data!.map(d => parseInt(d.month.split('-')[0])))]
    return years.sort((a, b) => b - a)
  }, [data, hasData])

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0])

  const buildMonthlyValues = (key: keyof Omit<MonthlyDataPoint, 'month'>): number[] => {
    if (!hasData) return new Array(12).fill(0)
    const result = new Array(12).fill(0)
    data!
      .filter(d => parseInt(d.month.split('-')[0]) === selectedYear)
      .forEach(d => {
        const monthIndex = parseInt(d.month.split('-')[1]) - 1
        result[monthIndex] = d[key] ?? 0
      })
    return result
  }

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className={`flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Monthly Overview</h2>
            <p className="text-xs text-slate-500">Track growth metrics month by month</p>
          </div>
        </div>

        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            disabled={isLoading || !hasData}
            className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 cursor-pointer hover:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Single Column Chart Layout */}
      <div className="space-y-5">
        {CHARTS.map((config) => (
          <BarChart
            key={config.key}
            config={config}
            monthlyValues={buildMonthlyValues(config.key)}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  )
}

export default MonthlyOverviewCharts