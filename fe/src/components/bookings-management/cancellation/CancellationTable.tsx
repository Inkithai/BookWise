'use client';

import { useState } from 'react';
import { CheckCircle, Clock, Search, XCircle, Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PaginationControls } from './PaginationControls';
import { EditCancellationDialog } from './EditCancellationDialog';
import { CancellationRequest } from './types';

interface CancellationTableProps {
  cancellations: CancellationRequest[];
  onDelete: (cancellationRef: string) => void;
  onUpdate: (cancellation: CancellationRequest) => void;
}

export function CancellationTable({ cancellations, onDelete, onUpdate }: CancellationTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [entriesPerPage, setEntriesPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCancellation, setEditingCancellation] = useState<CancellationRequest | null>(null);

  const filteredCancellations = cancellations.filter((request) => {
    const matchesSearch =
      request.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.bookingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.cancellationRef.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalEntries = filteredCancellations.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentEntries = filteredCancellations.slice(startIndex, endIndex);

  const handleUpdateClick = (cancellation: CancellationRequest) => {
    setEditingCancellation(cancellation);
  };

  const handleSaveChanges = (updatedCancellation: CancellationRequest) => {
    onUpdate(updatedCancellation);
    setEditingCancellation(null);
  };

  const handleEntriesPerPageChange = (value: string) => {
    setEntriesPerPage(Number(value));
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold text-foreground">
        Booking Cancellation
      </h2>
      {/* Filter controls - reordered as requested */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* Search */}
        <div className="relative w-full md:w-[250px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search requests..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Status filter */}
        <Select 
          value={statusFilter} 
          onValueChange={(value) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* Show entries */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground ml-auto">
          <span>Row per page</span>
          <Select value={entriesPerPage.toString()} onValueChange={handleEntriesPerPageChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="20" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
         
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-3">Cancellation Ref</TableHead>
              <TableHead className="px-4 py-3">Booking Ref</TableHead>
              <TableHead className="px-4 py-3">Guest</TableHead>
              <TableHead className="px-4 py-3">Amount</TableHead>
              <TableHead className="px-4 py-3">Reason</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3">Requested At</TableHead>
              <TableHead className="px-4 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentEntries.map((request) => (
              <TableRow key={request.cancellationRef} className="hover:bg-muted/50">
                <TableCell className="px-4 py-3 font-medium">{request.cancellationRef}</TableCell>
                <TableCell className="px-4 py-3">{request.bookingRef}</TableCell>
                <TableCell className="px-4 py-3">{request.guest}</TableCell>
                <TableCell className="px-4 py-3">{request.amount}</TableCell>
                <TableCell className="px-4 py-3 capitalize">{request.reason.replace(/_/g, ' ')}</TableCell>
                <TableCell className="px-4 py-3">
                  <Badge
                    variant={request.status === 'accepted' ? 'default' : 'outline'}
                    className={
                      request.status === 'accepted'
                        ? 'bg-green-100 text-green-800 hover:bg-green-100'
                        : request.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                        : 'bg-red-100 text-red-800 hover:bg-red-100'
                    }
                  >
                    {request.status === 'accepted' && <CheckCircle className="mr-1 h-3 w-3" />}
                    {request.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                    {request.status === 'rejected' && <XCircle className="mr-1 h-3 w-3" />}
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3">{request.requestedAt}</TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleUpdateClick(request)}
                            className="h-8 w-8"
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
                            onClick={() => onDelete(request.cancellationRef)}
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>

      {/* Pagination */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalEntries={totalEntries}
        startIndex={startIndex}
        endIndex={endIndex}
        goToPage={goToPage}
      />

      {/* Edit Dialog */}
      {editingCancellation && (
        <EditCancellationDialog
          cancellation={editingCancellation}
          onSave={handleSaveChanges}
          onOpenChange={(open) => !open && setEditingCancellation(null)}
        />
      )}
    </div>
  );
}