import { useState } from 'react';
import { Import } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import * as Papa from 'papaparse';
import { Contact } from '../../types';

// Define types for CSV row data
interface CSVRow {
  [key: string]: string | undefined;
  name?: string;
  Name?: string;
  contact?: string;
  Contact?: string;
  phone?: string;
  Phone?: string;
  mobile?: string;
  Mobile?: string;
  countryCode?: string;
  code?: string;
  CountryCode?: string;
}

// Define type for parsed CSV data
interface ParseResult {
  data: CSVRow[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

export default function ImportContactsDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (contacts: Contact[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      complete: (results: ParseResult) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file');
          return;
        }
        setPreviewData(results.data.slice(0, 5));
      },
      error: () => {
        setError('Error parsing CSV file');
      }
    });
  };

  const handleImport = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results: ParseResult) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file');
          return;
        }

        const importedContacts: Contact[] = results.data.map((row: CSVRow, index: number) => ({
          id: `imported-${Date.now()}-${index}`,
          name: row.name || row.Name || row.contact || row.Contact || `Contact ${index}`,
          phone: row.phone || row.Phone || row.mobile || row.Mobile || '',
          countryCode: row.countryCode || row.code || row.CountryCode || '+1',
          status: 'offline',
          lastSeen: new Date(),
        }));

        onImport(importedContacts);
        onOpenChange(false);
        setFile(null);
        setPreviewData([]);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import contacts
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">CSV File</label>
            <Input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          
          {previewData.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((value, j) => (
                          <td key={j} className="px-3 py-2 text-sm text-gray-500">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            setFile(null);
            setPreviewData([]);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!file}
          >
            <Import className="h-4 w-4 mr-2" />
            Import Contacts
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}