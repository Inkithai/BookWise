// src/app/crm/[tableId]/add/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddRecordDialog } from '@/components/crm/AddRecordDialog';
import { getTableRecords } from '@/services/crm.service';
import { TableFieldType } from '@/services/interface/crm';
import { Loader2 } from 'lucide-react';
import  Sidebar  from '@/components/common/sidebar/Sidebar';
import { Footer } from '@/components/common/Footer';

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

export default function AddRecordPage() {
  const { tableId } = useParams();
  const [tableFields, setTableFields] = useState<TableFieldData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchTableFields = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getTableRecords(tableId as string);
        
        if (response.data) {
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
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err: unknown) {
        console.error('Error loading table fields:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load table fields';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (tableId) {
      fetchTableFields();
    }
  }, [tableId]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6">
          {loading ? (
            <div className="h-64">
              <div className="text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
                <p>Loading form...</p>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <p className="text-red-500">Error: {error}</p>
              </div>
            </div>
          ) : (
            <AddRecordDialog 
              tableId={tableId as string}
              fields={tableFields}
            />
          )}
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}