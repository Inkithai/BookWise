"use client";

import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { IncomeTable } from "./income-table";
import { IncomeToolbar } from "./income-toolbar";
import { IncomePagination } from "./income-pagination";
import { IncomeFilters } from "./income-filters";
import { IncomeCreateDialog } from "./income-create-dialog";
import { IncomeEditDialog } from "./income-edit-dialog";
import { Income } from "./types";
import { generateIncomes } from "./data";

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [filteredIncomes, setFilteredIncomes] = useState<Income[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchFilter, setSearchFilter] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Load initial data
  useEffect(() => {
    setIncomes(generateIncomes());
  }, []);

  // Apply filters whenever incomes or filters change
  useEffect(() => {
    const filtered = incomes.filter(income => {
      if (dateRange?.from && dateRange?.to) {
        const recordedDate = new Date(income.recordedAt);
        if (!(recordedDate >= dateRange.from && recordedDate <= dateRange.to)) {
          return false;
        }
      }

      if (searchFilter && 
          !income.description.toLowerCase().includes(searchFilter.toLowerCase())) {
        return false;
      }

      return true;
    });

    setFilteredIncomes(filtered);
    setTotalEntries(filtered.length);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [incomes, dateRange, searchFilter, itemsPerPage]);

  const showingFrom = (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, totalEntries);

  const handleCreateIncome = (newIncome: Income) => {
    setIncomes(prev => [newIncome, ...prev]);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateIncome = (updatedIncome: Income) => {
    setIncomes(prev => 
      prev.map(income => 
        income.id === updatedIncome.id ? updatedIncome : income
      )
    );
    setEditingIncome(null);
  };

  const handleDeleteIncome = (incomeId: string) => {
    setIncomes(prev => prev.filter(income => income.id !== incomeId));
  };

  const clearFilters = () => {
    setDateRange(undefined);
    setSearchFilter("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <main className="flex-1 p-6 space-y-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Income</h1>
          <IncomeToolbar onCreateIncome={() => setIsCreateDialogOpen(true)} />
        </div>

        <IncomeFilters
          dateRange={dateRange}
          setDateRange={setDateRange}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          onClearFilters={clearFilters}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
        />

        <div className="rounded-md border border-border">
          <IncomeTable
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            incomes={filteredIncomes}
            onEditIncome={setEditingIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        </div>

        <IncomeCreateDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSave={handleCreateIncome}
        />

        {editingIncome && (
          <IncomeEditDialog
            income={editingIncome}
            open={!!editingIncome}
            onOpenChange={(open) => !open && setEditingIncome(null)}
            onSave={handleUpdateIncome}
          />
        )}

        <IncomePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalEntries}
          showingFrom={showingFrom}
          showingTo={showingTo}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </main>
    </div>
  );
}