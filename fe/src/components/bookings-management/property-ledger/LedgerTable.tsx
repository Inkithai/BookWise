'use client'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Mail, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PropertyLedgerEntry } from './types';
import { calculateExpenseTotals, calculateProfit, formatCurrency, generateInvoice } from './utils';
import { format } from 'date-fns';
import { LedgerEntryDialog } from './LedgerEntryDialog';
import { useState } from 'react';
import { generatePdf } from './pdf-generator';

interface LedgerTableProps {
  entries: PropertyLedgerEntry[];
  onAction: (action: string, entry: PropertyLedgerEntry) => void;
}

const statusVariantMap = {
  mailed: 'default',
  updated: 'secondary',
  created: 'destructive',
} as const;

export function LedgerTable({ entries, onAction }: LedgerTableProps) {
  const [selectedEntry, setSelectedEntry] = useState<PropertyLedgerEntry | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleViewClick = (entry: PropertyLedgerEntry) => {
    setSelectedEntry(entry);
    setDialogMode('view');
    setIsDialogOpen(true);
  };

  const handleEditClick = (entry: PropertyLedgerEntry) => {
    setSelectedEntry(entry);
    setDialogMode('edit');
    setIsDialogOpen(true);
  };

  const handleDownloadClick = async (entry: PropertyLedgerEntry) => {
    try {
      // Generate and download the PDF
      const invoice = generateInvoice(entry);
      await generatePdf(invoice);
      
      // Update the status
      onAction('pdf', {...entry, status: 'mailed'});
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <>
      <div className="rounded-md border overflow-hidden dark:border-gray-800">
        <Table>
          <TableHeader className="dark:bg-gray-800">
            <TableRow>
              <TableHead className="dark:text-gray-200">Date</TableHead>
              <TableHead className="dark:text-gray-200">Property</TableHead>
              <TableHead className="dark:text-gray-200">Total Income</TableHead>
              <TableHead className="dark:text-gray-200">Total Expense</TableHead>
              <TableHead className="dark:text-gray-200">Total Profit</TableHead>
              <TableHead className="dark:text-gray-200">Status</TableHead>
              <TableHead className="dark:text-gray-200">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const totalExpense = calculateExpenseTotals(entry.expenses);
              const totalProfit = calculateProfit(entry);
              
              return (
                <TableRow key={entry.id} className="dark:border-gray-800">
                  <TableCell className="dark:text-gray-300">
                    {format(entry.date, 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {entry.property.name}
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {formatCurrency(entry.totalIncome)}
                  </TableCell>
                  <TableCell className="dark:text-gray-300">
                    {formatCurrency(totalExpense)}
                  </TableCell>
                  <TableCell>
                    <span className={
                      totalProfit >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }>
                      {formatCurrency(totalProfit)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[entry.status]} className="capitalize">
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewClick(entry)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditClick(entry)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onAction('delete', entry)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        onClick={() => alert('Mail functionality not implemented')}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownloadClick(entry)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <LedgerEntryDialog 
        entry={selectedEntry} 
        mode={dialogMode}
        onAction={onAction}
        onOpenChange={setIsDialogOpen}
        isOpen={isDialogOpen}
      />
    </>
  );
}