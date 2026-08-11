"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { AreaChart, Area, CartesianGrid, XAxis, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartContainer,
  ChartConfig,
} from "@/components/ui/chart"

const revenueData = [
  { month: "Jan", revenue: 18900 },
  { month: "Feb", revenue: 21300 },
  { month: "Mar", revenue: 24800 },
  { month: "Apr", revenue: 26100 },
  { month: "May", revenue: 29400 },
  { month: "Jun", revenue: 31200 },
  { month: "Jul", revenue: 34700 },
  { month: "Aug", revenue: 36500 },
  { month: "Sep", revenue: 32800 },
  { month: "Oct", revenue: 30100 },
  { month: "Nov", revenue: 27500 },
  { month: "Dec", revenue: 23800 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(207, 100%, 50%)",
  },
} satisfies ChartConfig

export function RevenueChart() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Revenue Trend</CardTitle>
        <CardDescription className="text-xs">Jan - Dec 2024</CardDescription>
      </CardHeader>
      <CardContent className="pb-1">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={revenueData}
              margin={{ top: 10, right: 12, left: 12, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="pt-0 pb-2">
        <div className="flex items-center gap-1 text-xs font-medium">
          Revenue up by 6.3% <TrendingUp className="h-3 w-3" />
        </div>
      </CardFooter>
    </Card>
  )
}