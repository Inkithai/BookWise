// src/components/crm/CRMWorkspaceView.tsx - FIXED VERSION
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileInput, AlertCircle, RefreshCw, Edit, Trash2, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCRMTables, uploadCSV, deleteCRMTable } from '@/services/crm.service';
import { toast } from 'sonner';
import { CRMTableResponse } from '@/services/interface/crm';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export default function CRMWorkspaceView() {
  const [tables, setTables] = useState<CRMTableResponse[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [totalTables, setTotalTables] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<CRMTableResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const router = useRouter();
  const maxRetries = 3;
  
  // ✅ FIX 1: Use ref to track mounted state and prevent memory leaks
  const isMountedRef = useRef(true);
  
  // ✅ FIX 2: Use ref to abort ongoing requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ FIX 3: Separate fetch logic with proper cleanup
  const fetchTables = useCallback(async (showLoadingState = true) => {
    try {
      // ✅ FIX 4: Cancel previous request if still in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      
      if (showLoadingState) {
        setLoadingState('loading');
      }
      setError(null);
      
      console.log('Fetching CRM tables...');
      const response = await getCRMTables('', 0, 50, 1);
      
      // ✅ FIX 5: Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        console.log('Component unmounted, skipping state update');
        return;
      }
      
      console.log('CRM tables loaded successfully:', response);
      setTables(response.data || []);
      setTotalTables(response.recordsTotal || 0);
      setLoadingState('success');
      setRetryCount(0);
      
      if (retryCount > 0) {
        toast.success('Tables loaded successfully');
      }
    } catch (error: unknown) {
      // ✅ FIX 6: Check if error is an abort (expected) or actual error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Previous request was cancelled');
        return;
      }
      
      // Only update state if component is mounted
      if (!isMountedRef.current) {
        console.log('Component unmounted, skipping error state update');
        return;
      }
      
      console.error('Error loading CRM tables:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tables');
      setLoadingState('error');
      
      if (retryCount > 0) {
        toast.error(error instanceof Error ? error.message : 'Failed to load tables');
      }
    }
  }, [retryCount]);

  // ✅ FIX 7: Add cleanup on mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    fetchTables(true);
    
    return () => {
      // Cleanup on unmount
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTables]);

  // ✅ FIX 8: Debounce retry attempts
  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      // Use timeout to prevent rapid successive calls
      setTimeout(() => {
        if (isMountedRef.current) {
          fetchTables(true);
        }
      }, 500);
    }
  }, [retryCount, fetchTables]);

  const resetImportDialog = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    setNewTableName('');
    setImportError(null);
  };

  const handleImportTable = async () => {
    if (!importFile || !newTableName.trim()) {
      setImportError('Both table name and CSV file are required');
      return;
    }

    if (!importFile.name.toLowerCase().endsWith('.csv')) {
      setImportError('Only CSV files are allowed');
      return;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newTableName)) {
      setImportError('Table name must start with a letter and contain only letters, numbers, and underscores');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const response = await uploadCSV(importFile, newTableName);
      toast.success(response.message);
      
      if (isMountedRef.current) {
        await fetchTables(false);
        resetImportDialog();
      }
    } catch (error: unknown) {
      console.error('Import error:', error);
      if (isMountedRef.current) {
        setImportError(error instanceof Error ? error.message : 'Failed to import CSV');
        toast.error(error instanceof Error ? error.message : 'Failed to import table');
      }
    } finally {
      if (isMountedRef.current) {
        setIsImporting(false);
      }
    }
  };

  const handleEditTable = (tableId: number) => {
    router.push(`/crm/edit/${tableId}`);
  };

  const handleDeleteClick = (table: CRMTableResponse) => {
    setTableToDelete(table);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tableToDelete) return;

    setIsDeleting(true);
    try {
      const response = await deleteCRMTable(tableToDelete.id);
      toast.success(response.message);
      
      if (isMountedRef.current) {
        setTables(prev => prev.filter(t => t.id !== tableToDelete.id));
        setTotalTables(prev => prev - 1);
        
        setDeleteDialogOpen(false);
        setTableToDelete(null);
      }
    } catch (error: unknown) {
      console.error('Delete error:', error);
      if (isMountedRef.current) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete table');
      }
    } finally {
      if (isMountedRef.current) {
        setIsDeleting(false);
      }
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  if (loadingState === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p>Loading CRM tables...</p>
        </div>
      </div>
    );
  }

  if (loadingState === 'error' && error) {
    return (
      <div className="p-6">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex gap-2">
              {retryCount < maxRetries && (
                <Button size="sm" variant="outline" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry ({retryCount + 1}/{maxRetries})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => fetchTables(true)}>
                Refresh
              </Button>
            </div>
          </AlertDescription>
        </Alert>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Unable to load CRM tables</h2>
          <p className="text-muted-foreground mb-4">
            There was an issue loading your CRM tables. You can still create new tables.
          </p>
          <Link href="/crm/create">
            <Button className="gap-2">
              <Plus size={16} />
              Create New Table
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Custom CRM Tables</h1>
          <p className="text-muted-foreground">
            {totalTables > 0 ? `${totalTables} table${totalTables !== 1 ? 's' : ''} available` : 'No tables created yet'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/create">
            <Button className="gap-2">
              <Plus size={16} />
              Create Table
            </Button>
          </Link>
          
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileInput size={16} />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Import Table from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tableName">Table Name *</Label>
                  <Input
                    id="tableName"
                    value={newTableName}
                    onChange={(e) => {
                      setNewTableName(e.target.value);
                      setImportError(null);
                    }}
                    placeholder="Enter table name"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must start with a letter and contain only letters, numbers, and underscores
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="csvFile">CSV File *</Label>
                  <Input 
                    id="csvFile"
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => {
                      setImportFile(e.target.files?.[0] || null);
                      setImportError(null);
                    }}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    CSV file must include headers in the first row
                  </p>
                </div>
                {importError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700">
                      {importError}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={resetImportDialog}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImportTable}
                    disabled={!importFile || !newTableName.trim() || isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Import Table'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Link href="/crm/lead-status">
            <Button variant="outline" className="gap-2">
              <BarChart3 size={16} />
              Manage Lead Statuses
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fetchTables(true)}
            title="Refresh tables"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {tables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <div 
              key={table.id}
              className="border rounded-lg p-6 hover:bg-accent transition-colors hover:shadow-md group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 cursor-pointer" onClick={() => router.push(`/crm/${table.id}`)}>
                  <h3 className="font-semibold text-lg truncate">{table.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    ID: {table.id}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTable(table.id);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(table);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground cursor-pointer" onClick={() => router.push(`/crm/${table.id}`)}>
                <div className="flex justify-between">
                  <span>Fields:</span>
                  <span className="font-medium">{table.attributes?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Host ID:</span>
                  <span>{table.host_id || 'N/A'}</span>
                </div>
                {table.created_at && (
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(table.created_at)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Plus size={24} className="text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No tables created yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first custom table to start managing your CRM data, 
            or import existing data from a CSV file.
          </p>
          <div className="flex gap-3">
            <Link href="/crm/create">
              <Button className="gap-2">
                <Plus size={16} />
                Create First Table
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setImportDialogOpen(true)}
            >
              <FileInput size={16} />
              Import CSV
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the table &quot;{tableToDelete?.name}&quot;? 
              This action cannot be undone and will permanently delete all data in this table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Table'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}