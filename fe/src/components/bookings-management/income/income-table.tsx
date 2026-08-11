"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Income } from "./types";
import { formatDate } from "./utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IncomeTableProps {
  itemsPerPage: number;
  currentPage: number;
  incomes: Income[];
  onEditIncome: (income: Income) => void;
  onDeleteIncome: (incomeId: string) => void;
}

export function IncomeTable({
  itemsPerPage,
  currentPage,
  incomes,
  onEditIncome,
  onDeleteIncome,
}: IncomeTableProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncomes = incomes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Recorded At</TableHead>
          <TableHead>Recorded By</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedIncomes.map((income) => (
          <TableRow key={income.id}>
            <TableCell>{income.description}</TableCell>
            <TableCell>{income.property}</TableCell>
            <TableCell>£{income.amount.toLocaleString()}</TableCell>
            <TableCell>{formatDate(income.recordedAt)}</TableCell>
            <TableCell>{income.recordedBy}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditIncome(income)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteIncome(income.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}