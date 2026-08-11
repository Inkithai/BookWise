'use client';

import { TrendingUp } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface ProfitLossChartProps {
  chartData: { month: string; profitLoss: number }[];
  chartConfig: Record<string, { label: string; color: string }>;
  monthsInRange: string[];
}

export function ProfitLossChart({
  chartData,
  chartConfig,
  monthsInRange,
}: ProfitLossChartProps) {
  return (
    <div className="flex justify-center mt-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Profit / Loss Over Time</CardTitle>
          <CardDescription>
            {monthsInRange.length > 0
              ? `${monthsInRange[0]} - ${
                  monthsInRange[monthsInRange.length - 1]
                }`
              : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="h-64"
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 20 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 6)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="profitLoss"
                fill="var(--color-desktop)"
                radius={8}
              >
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(value: any) => typeof value === 'number' ? `£${value.toFixed(2)}` : value}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <div className="flex gap-2 font-medium leading-none">
            Trending up by 5.2% this month{' '}
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="leading-none text-muted-foreground">
            Showing profit and loss for the selected months
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}