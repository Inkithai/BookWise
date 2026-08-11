"use client"

import { TrendingUp } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import { TooltipProps } from "recharts/types/component/Tooltip"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"

const chartData = [
  { month: "Jan", bookings: 150 },
  { month: "Feb", bookings: 300 },
  { month: "Mar", bookings: 250 },
  { month: "Apr", bookings: 500 },
  { month: "May", bookings: 350 },
  { month: "Jun", bookings: 400 },
  { month: "Jul", bookings: 150 },
  { month: "Aug", bookings: 200 },
  { month: "Sep", bookings: 150 },
  { month: "Oct", bookings: 100 },
  { month: "Nov", bookings: 450 },
  { month: "Dec", bookings: 100 },
]

const chartConfig = {
  bookings: {
    label: "Bookings",
    color: "hsl(207, 100%, 50%)",
  },
} satisfies ChartConfig


const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value
    const numericValue = typeof value === 'number' ? value : 0
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {chartConfig.bookings.label}
            </span>
            <span className="font-bold text-muted-foreground">
              {numericValue}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function LineDotsChart() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Bookings Trend</CardTitle>
        <CardDescription className="text-xs">Monthly bookings 2024</CardDescription>
      </CardHeader>
      <CardContent className="pb-1">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                domain={[0, 750]}
                tickCount={6}
                allowDecimals={false}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Line
                type="linear"
                dataKey="bookings"
                stroke="hsl(207, 100%, 50%)"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(207, 100%, 50%)" }}
                activeDot={{ r: 5, fill: "hsl(207, 100%, 50%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="pt-0 pb-2">
        <div className="flex items-center gap-1 text-xs font-medium">
          Trending up by 5.2% <TrendingUp className="h-3 w-3" />
        </div>
      </CardFooter>
    </Card>
  )
}