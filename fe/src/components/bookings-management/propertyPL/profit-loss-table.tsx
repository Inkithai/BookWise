'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ExpenseItem {
  article: string;
  values: Record<string, number>;
}

interface ProfitLossTableProps {
  expenseData: ExpenseItem[];
  monthsInRange: string[];
  totals: Record<string, number>;
}

export function ProfitLossTable({
  expenseData,
  monthsInRange,
  totals,
}: ProfitLossTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px] font-bold">Article</TableHead>
          {monthsInRange.map((month) => (
            <TableHead key={month} className="text-right font-bold">
              {month}
            </TableHead>
          ))}
          <TableHead className="text-right font-bold">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenseData.map((item) => (
          <TableRow key={item.article}>
            <TableCell className="font-bold">{item.article}</TableCell>
            {monthsInRange.map((month) => (
              <TableCell
                key={`${item.article}-${month}`}
                className="text-right"
              >
                £{(item.values[month] || 0).toFixed(2)}
              </TableCell>
            ))}
            <TableCell className="text-right font-bold">
              £
              {monthsInRange
                .reduce(
                  (sum, month) => sum + (item.values[month] || 0),
                  0
                )
                .toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-muted/50 font-bold">
          <TableCell>Grand Total</TableCell>
          {monthsInRange.map((month) => (
            <TableCell key={`total-${month}`} className="text-right">
              £{totals[month].toFixed(2)}
            </TableCell>
          ))}
          <TableCell className="text-right">
            £
            {Object.values(totals)
              .reduce((sum, value) => sum + value, 0)
              .toFixed(2)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}