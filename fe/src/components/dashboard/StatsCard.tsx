'use client'

import { ArrowUp, ArrowDown, Users, DollarSign, Percent, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  change: number
  changeLabel: string
  iconBg?: string
  iconColor?: string
  changeBg?: string
  changeColor?: string
  bgGradient?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  iconBg = 'bg-accent',
  iconColor = 'text-accent-foreground',
  changeBg = change >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900',
  changeColor = change >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200',
  bgGradient = ''
}: StatsCardProps) {
  const ChangeIcon = change >= 0 ? ArrowUp : ArrowDown

  return (
    <div className={cn("rounded-lg overflow-hidden", bgGradient)}>
      <Card className="hover:shadow-md transition-shadow duration-300">
        <div className="p-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
              <p className="text-xl font-bold mt-1">{value}</p>
              <div className="flex items-center space-x-1 mt-1">
                <Badge 
                  className={cn(
                    "flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium",
                    changeBg,
                    changeColor
                  )}
                >
                  <ChangeIcon className="h-3 w-3 mr-0.5" />
                  {Math.abs(change)}%
                </Badge>
                <p className="text-xs text-muted-foreground">{changeLabel}</p>
              </div>
            </div>
            <div className={cn("p-1.5 rounded-full", iconBg, iconColor)}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// 🔵 Local stats data stored in this file
const stats = [
  {
    title: 'Active Bookings',
    value: '127',
    icon: Users,
    change: -12,
    changeLabel: 'from last month',
    iconBg: 'bg-teal-100 dark:bg-teal-900/50',
    iconColor: 'text-teal-600 dark:text-teal-300',
    changeBg: 'bg-teal-100 dark:bg-teal-900/50',
    changeColor: 'text-teal-600 dark:text-teal-300',
    bgGradient: 'bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-900/20'
  },
  {
    title: 'Monthly Revenue',
    value: '£29,483',
    icon: DollarSign,
    change: 8.3,
    changeLabel: 'from last month',
    iconBg: 'bg-green-100 dark:bg-green-900/50',
    iconColor: 'text-green-600 dark:text-green-300',
    changeBg: 'bg-green-100 dark:bg-green-900/50',
    changeColor: 'text-green-600 dark:text-green-300',
    bgGradient: 'bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-900/20'
  },
  {
    title: 'Occupancy Rate',
    value: '76%',
    icon: Percent,
    change: 5,
    changeLabel: 'from last month',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
    iconColor: 'text-yellow-600 dark:text-yellow-300',
    changeBg: 'bg-yellow-100 dark:bg-yellow-900/50',
    changeColor: 'text-yellow-600 dark:text-yellow-300',
    bgGradient: 'bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-900/20'
  },
  {
    title: 'Average Rating',
    value: '4.8',
    icon: Star,
    change: 0.2,
    changeLabel: 'from last month',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
    iconColor: 'text-red-600 dark:text-red-300',
    changeBg: 'bg-red-100 dark:bg-red-900/50',
    changeColor: 'text-red-600 dark:text-red-300',
    bgGradient: 'bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-900/20'
  }
]

// ✅ Export a wrapper that renders all cards
export function StatsCardList() {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatsCard key={stat.title} {...stat} />
      ))}
    </div>
  )
}
