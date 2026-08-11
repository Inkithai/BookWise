//CRMTableView.tsx
'use client'
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, Edit, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getTableRecords } from '@/services/crm.service';
import { formatDateValue, TableFieldType } from '@/services/interface/crm';
import { toast } from 'sonner';

interface TableFieldData {
  id: string;
  name: string;
  label: string;
  type: TableFieldType;
  required: boolean;
  nullable: boolean;
  is_foreign: boolean;
  foreign_table?: string;
}

export default function CRMTableView() {
  const { tableId } = useParams();
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableFields, setTableFields] = useState<TableFieldData[]>([]);
  const [tableInfo, setTableInfo] = useState<{ id: number; name: string }>({ id: 0, name: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const mapFieldType = (apiType: string): TableFieldType => {
    const typeMap: Record<string, TableFieldType> = {
      string: 'string',
      text: 'text',
      integer: 'integer',
      unsignedbiginteger: 'integer',
      biginteger: 'integer',
      float: 'float',
      double: 'float',
      decimal: 'float',
      date: 'date',
      datetime: 'datetime',
      timestamp: 'datetime',
      boolean: 'boolean',
      email: 'email',
    };
    return typeMap[apiType.toLowerCase()] || 'string';
  };

  const fetchTableData = useCallback(async (search?: string) => {
    try {
      setLoading(!search);
      setIsSearching(!!search);
      setError(null);
      
      console.log('Fetching table data for ID:', tableId);
      const response = await getTableRecords(tableId as string, search);
      
      if (response.data) {
        setTableInfo(response.data.table);
        
        const mappedFields: TableFieldData[] = response.data.attributes.map((attr: {
          id: number;
          name: string;
          type: string;
          is_nullable: boolean;
          is_foreign: boolean;
          foreign_table_name?: string;
        }) => ({
          id: attr.id.toString(),
          name: attr.name || `field_${attr.id}`,
          label: attr.name ? 
            attr.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 
            `Field ${attr.id}`,
          type: mapFieldType(attr.type),
          required: attr.is_nullable !== true,
          nullable: attr.is_nullable === true,
          is_foreign: attr.is_foreign === true,
          foreign_table: attr.foreign_table_name || undefined
        }));
        
        setTableFields(mappedFields);
        
        const allData = Array.isArray(response.data.data) ? response.data.data : [];
        setTotalRecords(allData.length);
        
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        setTableData(allData.slice(startIndex, endIndex));
        
        console.log('Table data loaded successfully:', {
          fields: mappedFields.length,
          records: allData.length
        });
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err: unknown) {
      console.error('Error loading table:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load table data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [tableId, currentPage, rowsPerPage]);

  useEffect(() => {
    if (tableId) {
      fetchTableData();
    }
  }, [tableId, fetchTableData]);

  const handleSearch = async () => {
    setCurrentPage(1);
    if (searchTerm.trim() !== '') {
      await fetchTableData(searchTerm);
    } else {
      await fetchTableData();
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatCellValue = (value: unknown, field: TableFieldData): string => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (field.is_foreign && typeof value === 'object' && value !== null) {
      const objValue = value as { id?: number; name?: string };
      if (objValue.id && objValue.name) {
        return `${objValue.name} (ID: ${objValue.id})`;
      } else if (objValue.id) {
        return `ID: ${objValue.id}`;
      }
      return 'Foreign Reference';
    }
    
    if (field.type === 'date' || field.type === 'datetime') {
      try {
        return formatDateValue(String(value), field.type as 'date' | 'datetime');
      } catch {
        return String(value);
      }
    }
    
    if (field.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  };

  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
          <p>Loading table data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/crm">
            <Button variant="outline" size="icon">
              <ChevronLeft size={16} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Table {tableId}</h1>
        </div>
        
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchTableData()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tableFields.length) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/crm">
            <Button variant="outline" size="icon">
              <ChevronLeft size={16} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{tableInfo.name || `Table ${tableId}`}</h1>
        </div>
        
        <div className="text-center py-8">
          <p className="text-muted-foreground">No fields found for this table</p>
          <Link href={`/crm/edit/${tableId}`}>
            <Button className="mt-4" variant="outline">
              <Edit size={16} className="mr-2" />
              Edit Table Structure
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{tableInfo.name}</h1>
            <p className="text-sm text-muted-foreground">
              {totalRecords} record{totalRecords !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href={`/crm/edit/${tableId}`}>
            <Button variant="outline" size="sm">
              <Edit size={16} className="mr-2" />
              Edit Table
            </Button>
          </Link>
          
          
<Link href={`/crm/${tableId}/add`}>
  <Button className="gap-2">
    <Plus size={16} />
    Add Record
  </Button>
</Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              disabled={isSearching}
              className="w-64 pl-8"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={isSearching}
            variant="outline"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {searchTerm && (
        <div className="text-sm text-muted-foreground">
          {isSearching ? (
            'Searching...'
          ) : (
            `Found ${totalRecords} record${totalRecords !== 1 ? 's' : ''} for "${searchTerm}"`
          )}
        </div>
      )}

      <div className="rounded-md border overflow-auto">
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              {tableFields.map((field) => (
                <TableHead key={field.id} className="whitespace-nowrap">
                  {field.label}
                  {field.is_foreign && (
                    <span className="ml-1 text-xs text-teal-500" title="Foreign Key">
                      FK
                    </span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.length > 0 ? (
              tableData.map((row, rowIndex) => (
                <TableRow key={(row.id as string | number) || rowIndex}>
                  {tableFields.map((field) => (
                    <TableCell key={`${rowIndex}-${field.id}`} className="whitespace-nowrap">
                      {formatCellValue(row[field.name], field)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell 
                  colSpan={tableFields.length} 
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchTerm ? 'No records match your search' : 'No records found'}
                  {!searchTerm && (
                    <div className="mt-4">
                     
<Link href={`/crm/${tableId}/add`}>
  <Button className="gap-2">
    <Plus size={16} />
    Add Record
  </Button>
</Link>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ShadcnTable>
      </div>

      {totalRecords > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {startRecord} to {endRecord} of {totalRecords} records
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              ≪
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              title="Previous page"
            >
              ‹
            </Button>
            
            <div className="flex items-center gap-1">
              {generatePageNumbers().map(pageNum => (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              ))}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Last page"
            >
              ≫
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}