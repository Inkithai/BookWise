// CreateTableForm.tsx - COMMENTED FOREIGN KEY UI
'use client'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createCRMTables, getAllTablesForDropdown } from '@/services/crm.service';
import { toast } from 'sonner';
import { 
  TableFieldType, 
  CRM_FIELD_TYPES, 
  CRM_FIELD_TYPE_DISPLAY_NAMES,
  FOREIGN_KEY_ALLOWED_TYPES 
} from '@/services/interface/crm';
import { normalizeFieldName } from '@/services/interface/crm';

interface TableField {
  id: string;
  name: string;
  type: TableFieldType;
  is_nullable: boolean;
  is_foreign: boolean;
  foreign_table_name?: string;
}

interface AvailableTable {
  id: number;
  name: string;
}

// Create mutable copies of the readonly arrays
const MUTABLE_FIELD_TYPES: TableFieldType[] = [...CRM_FIELD_TYPES];
const MUTABLE_FOREIGN_KEY_TYPES: TableFieldType[] = [...FOREIGN_KEY_ALLOWED_TYPES];

export default function CreateTableForm() {
  const [tableName, setTableName] = useState('');
  const [fields, setFields] = useState<TableField[]>([]);
  const [availableTables, setAvailableTables] = useState<AvailableTable[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadAvailableTables = async () => {
      setLoadingTables(true);
      try {
        const tables = await getAllTablesForDropdown();
        setAvailableTables(tables);
      } catch (error) {
        console.error('Failed to load tables:', error);
        toast.error('Failed to load available tables for foreign keys');
      } finally {
        setLoadingTables(false);
      }
    };

    loadAvailableTables();
  }, []);

  const addField = () => {
    setFields([...fields, {
      id: `field-${Date.now()}`,
      name: '',
      type: 'string',
      is_nullable: true,
      is_foreign: false,
      foreign_table_name: undefined
    }]);
  };

  const removeField = (id: string) => {
    if (confirm('Are you sure you want to remove this field?')) {
      setFields(fields.filter(field => field.id !== id));
    }
  };

  const updateField = <K extends keyof TableField>(id: string, key: K, value: TableField[K]) => {
    setFields(fields.map(field => {
      if (field.id === id) {
        const updatedField = { ...field, [key]: value };
        
        // When setting is_foreign to true, automatically set type to integer
        if (key === 'is_foreign' && value === true) {
          updatedField.type = 'integer';
          updatedField.foreign_table_name = undefined;
        }
        
        // When setting is_foreign to false, clear foreign table
        if (key === 'is_foreign' && value === false) {
          updatedField.foreign_table_name = undefined;
        }
        
        return updatedField;
      }
      return field;
    }));
  };

  // Get available field types based on whether it's a foreign key
  const getAvailableFieldTypes = (isForeign: boolean): TableFieldType[] => {
    if (isForeign) {
      return MUTABLE_FOREIGN_KEY_TYPES;
    }
    return MUTABLE_FIELD_TYPES;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!tableName.trim()) {
      newErrors.tableName = 'Table name is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      newErrors.tableName = 'Table name must start with a letter and contain only letters, numbers, and underscores';
    }
    
    const fieldNames = new Set<string>();
    fields.forEach((field, index) => {
      const fieldKey = `field-${field.id}`;
      
      if (!field.name.trim()) {
        newErrors[`${fieldKey}-name`] = `Field ${index + 1} name is required`;
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
        newErrors[`${fieldKey}-name`] = `Field name must start with a letter and contain only letters, numbers, and underscores`;
      } else if (fieldNames.has(normalizeFieldName(field.name))) {
        newErrors[`${fieldKey}-name`] = `Field name must be unique`;
      } else {
        fieldNames.add(normalizeFieldName(field.name));
      }

      // Foreign key validation
      if (field.is_foreign) {
        if (!field.foreign_table_name) {
          newErrors[`${fieldKey}-foreign`] = `Please select a foreign table for field ${index + 1}`;
        }
        
        // Ensure foreign key fields are always integer type
        if (!MUTABLE_FOREIGN_KEY_TYPES.includes(field.type)) {
          newErrors[`${fieldKey}-type`] = `Foreign key fields must be of type "Whole Number"`;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const response = await createCRMTables({
        table_name: tableName,
        attributes: fields.map(field => ({
          name: normalizeFieldName(field.name),
          type: field.type,
          is_nullable: field.is_nullable,
          is_foreign: field.is_foreign,
          foreign_table_name: field.is_foreign ? field.foreign_table_name : undefined
        }))
      });

      toast.success(response.message || 'Table created successfully!');
      router.push('/crm');
      
    } catch (error: unknown) {
      console.error('Table creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create table');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl p-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/crm">
          <Button variant="outline" size="icon" type="button">
            <ChevronLeft size={16} />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Create New Table</h1>
      </div>

      <div>
        <Label htmlFor="tableName">Table Name *</Label>
        <Input
          id="tableName"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder="Enter table name (letters, numbers, underscores)"
          className={errors.tableName ? 'border-red-500' : ''}
        />
        {errors.tableName && (
          <p className="text-sm text-red-500">{errors.tableName}</p>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Fields *</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={addField}
            className="gap-2"
            type="button"
          >
            <Plus size={16} />
            Add Field
          </Button>
        </div>
        
        <div className="space-y-4">
          {fields.map((field) => {
            const fieldKey = `field-${field.id}`;
            const availableTypes = getAvailableFieldTypes(field.is_foreign);
            
            return (
              <div key={field.id} className="grid grid-cols-14 gap-2 items-start p-4 border rounded-lg">
                <div className="col-span-3">
                  <Label className="text-xs">Field Name</Label>
                  <Input
                    value={field.name}
                    onChange={(e) => updateField(field.id, 'name', e.target.value)}
                    placeholder="Field name"
                    className={errors[`${fieldKey}-name`] ? 'border-red-500' : ''}
                  />
                  {errors[`${fieldKey}-name`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`${fieldKey}-name`]}</p>
                  )}
                </div>
                
                <div className="col-span-3">
                  <Label className="text-xs">Data Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value) => updateField(field.id, 'type', value as TableFieldType)}
                    disabled={field.is_foreign} // Disable type selection for foreign keys
                  >
                    <SelectTrigger className={`w-full ${errors[`${fieldKey}-type`] ? 'border-red-500' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {CRM_FIELD_TYPE_DISPLAY_NAMES[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.is_foreign && (
                    <p className="text-xs text-teal-600 mt-1">
                      Foreign keys must be Whole Number
                    </p>
                  )}
                  {errors[`${fieldKey}-type`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`${fieldKey}-type`]}</p>
                  )}
                </div>
                
                <div className="col-span-2">
                  <Label className="text-xs">Required</Label>
                  <Select
                    value={field.is_nullable ? 'nullable' : 'required'}
                    onValueChange={(value) => updateField(field.id, 'is_nullable', value === 'nullable')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="required">Required</SelectItem>
                      <SelectItem value="nullable">Optional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* COMMENTED OUT: Foreign Key UI Section */}
                {/* 
                <div className="col-span-2">
                  <Label className="text-xs">Foreign Key</Label>
                  <Select
                    value={field.is_foreign ? 'yes' : 'no'}
                    onValueChange={(value) => updateField(field.id, 'is_foreign', value === 'yes')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label className="text-xs">Links To Table</Label>
                  {field.is_foreign ? (
                    <Select
                      value={field.foreign_table_name || ''}
                      onValueChange={(value) => updateField(field.id, 'foreign_table_name', value)}
                      disabled={loadingTables}
                    >
                      <SelectTrigger className={`w-full ${errors[`${fieldKey}-foreign`] ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder={loadingTables ? "Loading..." : "Select table"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTables.map(table => (
                          <SelectItem key={table.id} value={table.name}>
                            {table.name}
                          </SelectItem>
                        ))}
                        {availableTables.length === 0 && !loadingTables && (
                          <SelectItem value="No tables available" disabled>
                            No tables available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-10 flex items-center justify-center text-xs text-muted-foreground border rounded">
                      Not a foreign key
                    </div>
                  )}
                  {errors[`${fieldKey}-foreign`] && (
                    <p className="text-xs text-red-500 mt-1">{errors[`${fieldKey}-foreign`]}</p>
                  )}
                </div>
                */}
                
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(field.id)}
                    className="text-red-500 hover:text-red-700"
                    type="button"
                    title="Remove field"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            );
          })}

          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>No fields added yet</p>
              <p className="text-sm">Click &quot;Add Field&quot; to start building your table</p>
            </div>
          )}
        </div>
      </div>

      {/* COMMENTED OUT: Foreign Key Information Alert */}
      {/* 
      {fields.some(field => field.is_foreign) && (
        <Alert className="bg-teal-50 border-teal-200">
          <AlertCircle className="h-4 w-4 text-teal-600" />
          <AlertDescription className="text-teal-800">
            <strong>Foreign Key Note:</strong> Foreign key fields are automatically set to &quot;Whole Number&quot; type 
            and will reference the ID field of the selected table.
          </AlertDescription>
        </Alert>
      )}
      */}

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting || fields.length === 0}>
          {isSubmitting ? 'Creating...' : 'Create Table'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => router.push('/crm')}
          type="button"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}