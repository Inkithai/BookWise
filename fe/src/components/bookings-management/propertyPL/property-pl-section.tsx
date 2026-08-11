'use client';

import { useState, useMemo } from 'react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import {
  format,
  eachMonthOfInterval,
  subMonths,
} from 'date-fns';
import { toast } from 'sonner';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PropertyPLControls } from './property-pl-controls';
import { ProfitLossTable } from './profit-loss-table';
import { ProfitLossChart } from './profit-loss-chart';

type ExpenseItem = {
  article: string;
  values: Record<string, number>;
};

type DateRangePreset =
  | 'past-month'
  | 'past-6-months'
  | 'past-12-months'
  | 'custom';

export function PropertyPLSection() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [rangePreset, setRangePreset] =
    useState<DateRangePreset>('past-6-months');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const monthsInRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    return eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    }).map((month) => format(month, 'MMM yy'));
  }, [dateRange]);

  const expenseData: ExpenseItem[] = [
    {
      article: 'Rent',
      values: {
        'Jan 25': 1200,
        'Feb 25': 1200,
        'Mar 25': 1200,
        'Apr 25': 1200,
        'May 25': 1200,
        'Jun 25': 1200,
      },
    },
    {
      article: 'Council tax / B.R',
      values: {
        'Jan 25': 150,
        'Feb 25': 150,
        'Mar 25': 150,
        'Apr 25': 150,
        'May 25': 150,
        'Jun 25': 150,
      },
    },
    {
      article: 'Gas',
      values: {
        'Jan 25': 80,
        'Feb 25': 85,
        'Mar 25': 70,
        'Apr 25': 60,
        'May 25': 55,
        'Jun 25': 50,
      },
    },
    {
      article: 'Electricity',
      values: {
        'Jan 25': 90,
        'Feb 25': 95,
        'Mar 25': 85,
        'Apr 25': 75,
        'May 25': 70,
        'Jun 25': 65,
      },
    },
    {
      article: 'Water',
      values: {
        'Jan 25': 45,
        'Feb 25': 45,
        'Mar 25': 45,
        'Apr 25': 45,
        'May 25': 45,
        'Jun 25': 45,
      },
    },
    {
      article: 'Internet',
      values: {
        'Jan 25': 35,
        'Feb 25': 35,
        'Mar 25': 35,
        'Apr 25': 35,
        'May 25': 35,
        'Jun 25': 35,
      },
    },
    {
      article: 'Bin Collection',
      values: {
        'Jan 25': 25,
        'Feb 25': 25,
        'Mar 25': 25,
        'Apr 25': 25,
        'May 25': 25,
        'Jun 25': 25,
      },
    },
    {
      article: 'Netflix',
      values: {
        'Jan 25': 12,
        'Feb 25': 12,
        'Mar 25': 12,
        'Apr 25': 12,
        'May 25': 12,
        'Jun 25': 12,
      },
    },
    {
      article: 'CCTV',
      values: {
        'Jan 25': 20,
        'Feb 25': 20,
        'Mar 25': 20,
        'Apr 25': 20,
        'May 25': 20,
        'Jun 25': 20,
      },
    },
    {
      article: 'Monthly Expense',
      values: {
        'Jan 25': 0,
        'Feb 25': 0,
        'Mar 25': 0,
        'Apr 25': 0,
        'May 25': 0,
        'Jun 25': 0,
      },
    },
    {
      article: 'Total Expense',
      values: {
        'Jan 25': 1657,
        'Feb 25': 1367,
        'Mar 25': 1642,
        'Apr 25': 1622,
        'May 25': 1612,
        'Jun 25': 1602,
      },
    },
    {
      article: 'Total Sales',
      values: {
        'Jan 25': 2306.11,
        'Feb 25': 1407.25,
        'Mar 25': 2509.8,
        'Apr 25': 2287.66,
        'May 25': 2100.5,
        'Jun 25': 1950.75,
      },
    },
    {
      article: 'Profit / Loss',
      values: {
        'Jan 25': 649.11,
        'Feb 25': 259.75,
        'Mar 25': 867.8,
        'Apr 25': 665.66,
        'May 25': 488.5,
        'Jun 25': 348.75,
      },
    },
  ];

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    monthsInRange.forEach((month) => {
      result[month] = expenseData.reduce(
        (sum, item) => sum + (item.values[month] || 0),
        0
      );
    });
    return result;
  }, [monthsInRange, expenseData]);

  const chartData = useMemo(() => {
    return monthsInRange.map((month) => {
      return {
        month,
        profitLoss:
          expenseData.find((item) => item.article === 'Profit / Loss')
            ?.values[month] || 0,
      };
    });
  }, [monthsInRange, expenseData]);

  const chartConfig = {
    profitLoss: {
      label: 'Profit / Loss',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies Record<string, { label: string; color: string }>;

  const generatePDF = async () => {
    setIsGeneratingPDF(true);

    try {
      const toastId = toast.loading('Generating PDF...');

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([842, 595]); // A4 landscape (842x595 points)

      // Set up fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Add title
      page.drawText('Property Profit & Loss Statement', {
        x: 50,
        y: page.getHeight() - 50,
        size: 18,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Add date range
      const dateRangeText =
        dateRange?.from && dateRange?.to
          ? `${format(dateRange.from, 'MMM dd, yyyy')} to ${format(
              dateRange.to,
              'MMM dd, yyyy'
            )}`
          : 'Date range not specified';
      page.drawText(`Date Range: ${dateRangeText}`, {
        x: 50,
        y: page.getHeight() - 80,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });

      // Table setup
      const tableTop = page.getHeight() - 110;
      const colWidth = (page.getWidth() - 100) / (monthsInRange.length + 2);
      const rowHeight = 20;

      // Draw table headers
      const headers = ['Article', ...monthsInRange, 'Total'];
      headers.forEach((header, i) => {
        // Header background
        page.drawRectangle({
          x: 50 + i * colWidth,
          y: tableTop - 15,
          width: colWidth,
          height: rowHeight,
          color: rgb(41 / 255, 128 / 255, 185 / 255),
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
        });

        // Header text
        page.drawText(header, {
          x: 50 + i * colWidth + 5,
          y: tableTop - 5,
          size: 10,
          font: fontBold,
          color: rgb(1, 1, 1),
          maxWidth: colWidth - 10,
        });
      });

      // Draw table rows
      expenseData.forEach((item, rowIndex) => {
        const y = tableTop - (rowIndex + 1) * rowHeight - 5;

        // Alternate row background
        if (rowIndex % 2 === 0) {
          page.drawRectangle({
            x: 50,
            y: y - 5,
            width: page.getWidth() - 100,
            height: rowHeight,
            color: rgb(245 / 255, 245 / 255, 245 / 255),
            borderWidth: 0,
          });
        }

        // Article name
        page.drawText(item.article, {
          x: 50 + 5,
          y,
          size: 10,
          font: rowIndex === expenseData.length - 1 ? fontBold : font,
          color: rgb(0, 0, 0),
          maxWidth: colWidth - 10,
        });

        // Monthly values
        monthsInRange.forEach((month, colIndex) => {
          page.drawText(`£${(item.values[month] || 0).toFixed(2)}`, {
            x: 50 + (colIndex + 1) * colWidth + 5,
            y,
            size: 10,
            font: rowIndex === expenseData.length - 1 ? fontBold : font,
            color: rgb(0, 0, 0),
            maxWidth: colWidth - 10,
          });
        });

        // Total column
        const total = monthsInRange.reduce(
          (sum, month) => sum + (item.values[month] || 0),
          0
        );
        page.drawText(`£${total.toFixed(2)}`, {
          x: 50 + (monthsInRange.length + 1) * colWidth + 5,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0, 0, 0),
          maxWidth: colWidth - 10,
        });
      });

      // Add footer
      page.drawText(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, {
        x: 50,
        y: 30,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Property_PL_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      link.click();

      toast.success('PDF generated successfully!', { id: toastId });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-xl font-semibold text-foreground">
            Property P/L
          </CardTitle>
          <PropertyPLControls
            dateRange={dateRange}
            setDateRange={setDateRange}
            rangePreset={rangePreset}
            setRangePreset={setRangePreset}
            isGeneratingPDF={isGeneratingPDF}
            generatePDF={generatePDF}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ProfitLossTable
          expenseData={expenseData}
          monthsInRange={monthsInRange}
          totals={totals}
        />
        <ProfitLossChart
          chartData={chartData}
          chartConfig={chartConfig}
          monthsInRange={monthsInRange}
        />
      </CardContent>
    </Card>
  );
}