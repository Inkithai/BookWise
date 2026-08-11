// PropertyLedger.tsx
'use client'
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PropertyLedgerEntry } from './types';
import { LedgerFilters } from './LedgerFilters';
import { LedgerTable } from './LedgerTable';
import { filterEntries } from './utils';
import { CreateLedgerDialog } from './CreateLedgerDialog';
import { DateRange } from './types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Sample data
const sampleEntries: PropertyLedgerEntry[] = [
  {
    id: '1',
    date: new Date(2023, 5, 15),
    property: { id: '1', name: '123 Main St' },
    totalIncome: 2000,
    expenses: {
      rent: 1200,
      gas: 100,
      electricity: 80,
      water: 50,
      brCouncil: 120,
      internet: 40,
      binCollection: 20,
      maintenance: 150,
      netflix: 10,
      cctv: 15,
      otherExpenses: [
        { type: 'Cleaning', amount: 60, note: 'Monthly cleaning service' }
      ],
      customExpenses: [
        { type: 'Gardening', amount: 45, note: 'Lawn maintenance' }
      ]
    },
    status: 'created'
  },
  {
    id: '2',
    date: new Date(2023, 4, 10),
    property: { id: '2', name: '456 Oak Ave' },
    totalIncome: 1800,
    expenses: {
      rent: 1100,
      gas: 90,
      electricity: 75,
      water: 45,
      brCouncil: 110,
      internet: 40,
      binCollection: 20,
      maintenance: 120,
      netflix: 10,
      cctv: 15,
      otherExpenses: [],
      customExpenses: [
        { type: 'Painting', amount: 200, note: 'Exterior painting' }
      ]
    },
    status: 'updated'
  },
  {
    id: '3',
    date: new Date(2023, 3, 5),
    property: { id: '3', name: '789 Pine Rd' },
    totalIncome: 2200,
    expenses: {
      rent: 1300,
      gas: 110,
      electricity: 90,
      water: 55,
      brCouncil: 130,
      internet: 40,
      binCollection: 20,
      maintenance: 180,
      netflix: 10,
      cctv: 15,
      otherExpenses: [
        { type: 'Repairs', amount: 150, note: 'Kitchen faucet replacement' }
      ],
      customExpenses: []
    },
    status: 'mailed'
  },
];

export function PropertyLedger() {
  const [entries, setEntries] = useState<PropertyLedgerEntry[]>(sampleEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>(undefined);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredEntries = useMemo(() => {
    return filterEntries(entries, searchTerm, dateRange, statusFilter);
  }, [entries, searchTerm, dateRange, statusFilter]);

  const paginatedEntries = useMemo(() => {
    return filteredEntries.slice(
      (currentPage - 1) * Number(entriesPerPage),
      currentPage * Number(entriesPerPage)
    );
  }, [filteredEntries, currentPage, entriesPerPage]);

  const totalPages = Math.ceil(filteredEntries.length / Number(entriesPerPage));

  const handleAction = (action: string, entry: PropertyLedgerEntry) => {
    switch (action) {
      case 'delete':
        setEntries(entries.filter(e => e.id !== entry.id));
        break;
      case 'update':
        setEntries(entries.map(e => e.id === entry.id ? entry : e));
        break;
      case 'create':
        setEntries([entry, ...entries]);
        break;
      case 'pdf':
        console.log('Generating PDF for:', entry.id);
        // In a real app, this would generate and download a PDF
        break;
      case 'mail':
        console.log('Sending email for:', entry.id);
        // In a real app, this would send an email
        break;
      default:
        console.log('Action:', action, 'on entry:', entry.id);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Property Ledger</h1>
        <CreateLedgerDialog onCreate={(entry) => handleAction('create', entry)} />
      </div>

      <LedgerFilters
        entriesToShow={entriesPerPage}
        setEntriesToShow={(value) => {
          setEntriesPerPage(value);
          setCurrentPage(1);
        }}
        searchTerm={searchTerm}
        setSearchTerm={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        dateRange={dateRange}
        setDateRange={(range) => {
          setDateRange(range);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        setStatusFilter={(value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        }}
      />

      <LedgerTable
        entries={paginatedEntries}
        onAction={handleAction}
      />

      {/* Pagination */}
      {filteredEntries.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Showing {paginatedEntries.length > 0 ? (currentPage - 1) * Number(entriesPerPage) + 1 : 0} to{' '}
            {Math.min(currentPage * Number(entriesPerPage), filteredEntries.length)} of{' '}
            {filteredEntries.length} entries
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}