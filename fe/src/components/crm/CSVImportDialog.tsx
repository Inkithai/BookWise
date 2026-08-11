//CSVImportDialog.tsx
'use client'
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { parse as csvParse } from 'papaparse'
import type { ParseResult } from 'papaparse'
import { format } from 'date-fns'
import { TableField, TableRecord } from '@/services/interface/crm'
import { parseDateValue, normalizeFieldName } from '@/services/interface/crm'
import { toast } from 'sonner'

const DEFAULT_FIELDS: TableField[] = [
  { 
    id: 'id', 
    name: 'id', 
    label: 'ID',
    type: 'text', 
    required: true 
  },
  { 
    id: 'created_at', 
    name: 'created_at', 
    label: 'Created At',
    type: 'datetime', 
    required: true 
  },
  { 
    id: 'created_by', 
    name: 'created_by', 
    label: 'Created By',
    type: 'text', 
    required: true 
  }
];

interface CSVImportDialogProps {
  onImport: (data: TableRecord[], fields: TableField[]) => void
  children: React.ReactNode
}

export function CSVImportDialog({ onImport, children }: CSVImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{
    headers: string[]
    rows: TableRecord[]
    fields: TableField[]
  } | null>(null)

  const detectFieldType = (value: string): TableField['type'] => {
    if (!value || value === '-') return 'text'
    
    if (!isNaN(Date.parse(value))) {
      return value.includes('T') ? 'datetime' : 'date'
    }
    
    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/) || 
        value.match(/^\d{4}-\d{2}-\d{2}$/) ||
        value.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return 'date'
    }
    
    if (!isNaN(Number(value)) && value.trim() !== '') return 'float'
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') return 'boolean'
    
    if (value.includes('@') && value.includes('.')) return 'email'
    
    return 'text'
  }

  const processCSVRow = (row: Record<string, unknown>, index: number): TableRecord => {
    const processedRow: TableRecord = {
      id: index.toString(),
      created_at: new Date().toISOString(),
      created_by: 'System',
      ...row
    };

    Object.keys(processedRow).forEach(key => {
      if (processedRow[key] === null || processedRow[key] === undefined || processedRow[key] === '') {
        processedRow[key] = '-';
      } else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
        const parsedDate = parseDateValue(String(processedRow[key]));
        processedRow[key] = parsedDate || processedRow[key];
      }
    });

    return processedRow;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setPreviewData(null)
    
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Only CSV files are allowed')
      return
    }

    setFile(selectedFile)
  }

  const parseCSV = useCallback(() => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        
        csvParse<Record<string, unknown>>(content, {
          header: true,
          skipEmptyLines: true,
          complete: (results: ParseResult<Record<string, unknown>>) => {
            const data = results.data
            
            if (data.length === 0) {
              setError('CSV file is empty or has no valid data')
              setIsLoading(false)
              return
            }

            const headers = results.meta.fields || []
            
            const processedRows = data.slice(0, 5).map((row, index) => 
              processCSVRow(row, index)
            );

            const generatedFields = headers
              .filter(header => !DEFAULT_FIELDS.some(df => df.name === normalizeFieldName(header)))
              .map((header) => {
                let sampleValue = '';
                for (const row of data) {
                  const rowValue = row[header];
                  if (rowValue !== undefined && rowValue !== '') {
                    sampleValue = String(rowValue);
                    break;
                  }
                }
                
                return {
                  id: normalizeFieldName(header),
                  name: normalizeFieldName(header),
                  label: header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  type: detectFieldType(sampleValue),
                  required: false
                }
              })

            setPreviewData({
              headers,
              rows: processedRows,
              fields: [...DEFAULT_FIELDS, ...generatedFields]
            });
            setIsLoading(false);
          },
          error: (error: Error) => {
            setError(error.message || 'Failed to parse CSV file')
            setIsLoading(false)
          }
        })
      } catch {
        setError('An unexpected error occurred while parsing the file')
        setIsLoading(false)
      }
    }
    
    reader.onerror = () => {
      setError('Failed to read file')
      setIsLoading(false)
    }
    
    reader.readAsText(file)
  }, [file])

  const handleImport = () => {
    if (!previewData || !file) return
    
    setIsLoading(true);
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string
        
        const { data } = await new Promise<{ data: Record<string, unknown>[] }>((resolve, reject) => {
          csvParse<Record<string, unknown>>(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              resolve({ data: results.data })
            },
            error: (error: Error) => {
              reject(error)
            }
          });
        });

        const processedData = data.map((row, index) => 
          processCSVRow(row, index)
        );

        await onImport(processedData, previewData.fields);
        setIsOpen(false);
        setFile(null);
        setPreviewData(null);
        toast.success('CSV imported successfully!');
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        toast.error('Failed to import CSV data');
      } finally {
        setIsLoading(false);
      }
    }
    
    reader.onerror = () => {
      setError('Failed to read file');
      setIsLoading(false);
    }
    
    reader.readAsText(file)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Data from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="csvFile">CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Make sure your CSV includes a header row with field names
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500 p-2 bg-red-50 rounded">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {previewData && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted">
                  <h3 className="font-medium">Preview (first 5 rows)</h3>
                </div>
                <div className="overflow-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {previewData.headers.map((header) => (
                          <th key={header} className="p-2 text-left border-b">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b">
                          {previewData.headers.map((header) => (
                            <td key={`${rowIndex}-${header}`} className="p-2">
                              {header.toLowerCase().includes('date') || header.toLowerCase().includes('time')
                                ? format(new Date(String(row[header])), 'PPpp')
                                : String(row[header])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted">
                  <h3 className="font-medium">Field Mappings</h3>
                </div>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left border-b">Field</th>
                        <th className="p-2 text-left border-b">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.fields.map((field) => (
                        <tr key={field.id} className="border-b">
                          <td className="p-2">{field.label}</td>
                          <td className="p-2 capitalize">{field.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsOpen(false)
              setFile(null)
              setPreviewData(null)
              setError(null)
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          {!previewData && file && (
            <Button onClick={parseCSV} disabled={isLoading}>
              {isLoading ? 'Parsing...' : 'Preview Data'}
            </Button>
          )}
          
          {previewData && (
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? 'Importing...' : 'Import Data'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}