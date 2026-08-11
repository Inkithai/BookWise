// src/components/crm/AddRecordDialog.tsx - UPDATED with better error handling
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { TableField } from '@/services/interface/crm';
import { getForeignTableRecords, storeTableRecord, getCRMLeadStatuses, getLeadUsers } from '@/services/crm.service';
import { toast } from 'sonner';
import Link from 'next/link';
import { CalendarIcon, AlertCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ForeignRecord {
  id: number;
  name?: string;
  [key: string]: unknown;
}

interface AddRecordDialogProps {
  tableId: string | number;
  fields: TableField[];
  onRecordAdded?: () => void;
}

export function AddRecordDialog({ tableId, fields, onRecordAdded }: AddRecordDialogProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [foreignKeyData, setForeignKeyData] = useState<Record<string, ForeignRecord[]>>({});
  const [loadingForeignKeys, setLoadingForeignKeys] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ NEW: General error message state
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  const [leadStatuses, setLeadStatuses] = useState<{ id: number; name: string }[]>([]);
  const [leadUsers, setLeadUsers] = useState<{ id: number; name: string }[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  useEffect(() => {
    const loadForeignKeyData = async () => {
      const foreignFields = fields.filter(field => field.is_foreign && field.foreign_table);
      if (foreignFields.length === 0) return;

      setLoadingForeignKeys(true);
      try {
        const foreignData: Record<string, ForeignRecord[]> = {};
        
        for (const field of foreignFields) {
          if (field.foreign_table) {
            console.log(`Loading foreign key data for field: ${field.name}, table: ${field.foreign_table}`);
            
            try {
              const foreignRecords = await getForeignTableRecords(field.foreign_table);
              
              if (foreignRecords.length === 0) {
                console.warn(`No records found in foreign table: ${field.foreign_table}`);
                toast.warning(`No records found in related table: ${field.foreign_table}. You may need to create records there first.`);
              }
              
              foreignData[field.name] = foreignRecords;
              console.log(`Loaded ${foreignRecords.length} records for ${field.name}`);
              
            } catch (error) {
              console.error(`Failed to load foreign table ${field.foreign_table}:`, error);
              toast.error(`Failed to load data from ${field.foreign_table}`);
              foreignData[field.name] = [];
            }
          }
        }
        
        setForeignKeyData(foreignData);
      } catch (error: unknown) {
        console.error('Failed to load foreign key data:', error);
        toast.error('Failed to load related data');
      } finally {
        setLoadingForeignKeys(false);
      }
    };

    const loadDropdownData = async () => {
      setLoadingDropdowns(true);
      try {
        const [statusesData, usersData] = await Promise.all([
          getCRMLeadStatuses(),
          getLeadUsers()
        ]);
        
        setLeadStatuses(statusesData);
        setLeadUsers(usersData);
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
        toast.error('Failed to load dropdown data');
      } finally {
        setLoadingDropdowns(false);
      }
    };

    loadForeignKeyData();
    loadDropdownData();
  }, [fields]);

  const handleSubmit = async () => {
    // Clear previous errors
    setErrors({});
    setGeneralError(null);
    
    const validationErrors: Record<string, string> = {};
    
    // Validate required fields
    fields.forEach(field => {
      const fieldName = field.name;
      const value = formData[fieldName];
      
      if (field.required && (value === undefined || value === '' || value === null)) {
        validationErrors[fieldName] = `${field.label} is required`;
        return;
      }
      
      // Additional validation for foreign keys
      if (field.is_foreign && field.required && (!value || value === '')) {
        validationErrors[fieldName] = `${field.label} is required`;
        return;
      }
      
      // Type-specific validation
      if (value !== undefined && value !== '' && value !== null) {
        switch (field.type) {
          case 'date':
          case 'datetime':
            try {
              const date = new Date(String(value));
              if (isNaN(date.getTime())) {
                validationErrors[fieldName] = `${field.label} contains an invalid date`;
              }
            } catch {
              validationErrors[fieldName] = `${field.label} contains an invalid date`;
            }
            break;
          
          case 'email':
            if (typeof value === 'string') {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                validationErrors[fieldName] = `${field.label} must be a valid email address`;
              }
            }
            break;
          
          case 'integer':
            if (isNaN(parseInt(String(value), 10)) || !Number.isInteger(parseFloat(String(value)))) {
              validationErrors[fieldName] = `${field.label} must be a valid integer`;
            }
            break;
          
          case 'float':
            if (isNaN(parseFloat(String(value)))) {
              validationErrors[fieldName] = `${field.label} must be a valid number`;
            }
            break;
        }
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setGeneralError('Please fix the validation errors before submitting');
      toast.error('Please fix validation errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      
      fields.forEach(field => {
        const fieldName = field.name;
        const value = formData[fieldName];
        
        // Skip empty optional fields
        if ((value === '' || value === undefined || value === null) && !field.required) {
          return;
        }
        
        // Process the value based on field type
        switch (field.type) {
          case 'integer':
            if (value !== null && value !== undefined && value !== '') {
              payload[fieldName] = parseInt(String(value), 10);
            } else if (field.required) {
              payload[fieldName] = null;
            }
            break;
            
          case 'float':
            if (value !== null && value !== undefined && value !== '') {
              payload[fieldName] = parseFloat(String(value));
            } else if (field.required) {
              payload[fieldName] = null;
            }
            break;
            
          case 'boolean':
            payload[fieldName] = value === true || value === 'true' || value === '1';
            break;
            
          case 'date':
            if (value) {
              const date = new Date(String(value));
              payload[fieldName] = format(date, 'yyyy-MM-dd');
            } else if (field.required) {
              payload[fieldName] = null;
            }
            break;
            
          case 'datetime':
            if (value) {
              const datetime = new Date(String(value));
              payload[fieldName] = datetime.toISOString();
            } else if (field.required) {
              payload[fieldName] = null;
            }
            break;
            
          default:
            if (field.is_foreign) {
              payload[fieldName] = value ? parseInt(String(value), 10) : null;
            } else {
              payload[fieldName] = value !== null && value !== undefined ? String(value) : null;
            }
        }
      });

      console.log('=== SUBMITTING RECORD ===');
      console.log('Table ID:', tableId);
      console.log('Payload being sent:', JSON.stringify(payload, null, 2));

      await storeTableRecord(tableId, payload);
      
      setFormData({});
      setErrors({});
      setGeneralError(null);
      toast.success('Record created successfully!');
      
      if (onRecordAdded) {
        onRecordAdded();
      }
      
      router.push(`/crm/${tableId}`);
    } catch (error: unknown) {
      console.error('=== RECORD CREATION ERROR ===');
      console.error('Error:', error);
      
      // ✅ UPDATED: Display the API error message
      if (error instanceof Error) {
        setGeneralError(error.message);
        toast.error(error.message, {
          duration: 6000, // Show for longer since it's important
        });
      } else {
        const errorMsg = 'Failed to create record. Please try again.';
        setGeneralError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldInput = (field: TableField) => {
    const fieldName = field.name;
    const value = formData[fieldName];
    const error = errors[fieldName];

    const baseClassName = error ? 'border-red-500' : '';
    const commonProps = {
      'aria-invalid': !!error,
      'aria-describedby': error ? `${fieldName}-error` : undefined
    };

    // Check if this field should be a lead status dropdown
    if (fieldName.toLowerCase().includes('status') && !field.is_foreign) {
      return (
        <Select
          value={value?.toString() || ''}
          onValueChange={(val) => setFormData({ ...formData, [fieldName]: val === '' ? null : parseInt(val) })}
          disabled={loadingDropdowns}
          {...commonProps}
        >
          <SelectTrigger className={`text-left ${baseClassName}`}>
            <SelectValue placeholder={
              loadingDropdowns 
                ? 'Loading statuses...' 
                : `Select ${field.label}`
            } />
          </SelectTrigger>
          <SelectContent>
            {!field.required && (
              <SelectItem value="">
                <span className="text-muted-foreground">None selected</span>
              </SelectItem>
            )}
            {leadStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                {status.name}
              </SelectItem>
            ))}
            {leadStatuses.length === 0 && !loadingDropdowns && (
              <SelectItem value="" disabled>
                No lead statuses found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      );
    }

    // Check if this field should be a lead user dropdown
    if ((fieldName.toLowerCase().includes('user') || fieldName.toLowerCase().includes('assigned')) && !field.is_foreign) {
      return (
        <Select
          value={value?.toString() || ''}
          onValueChange={(val) => setFormData({ ...formData, [fieldName]: val === '' ? null : parseInt(val) })}
          disabled={loadingDropdowns}
          {...commonProps}
        >
          <SelectTrigger className={`text-left ${baseClassName}`}>
            <SelectValue placeholder={
              loadingDropdowns 
                ? 'Loading users...' 
                : `Select ${field.label}`
            } />
          </SelectTrigger>
          <SelectContent>
            {!field.required && (
              <SelectItem value="none">
                <span className="text-muted-foreground">None selected</span>
              </SelectItem>
            )}
            {leadUsers.map((user) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.name}
              </SelectItem>
            ))}
            {leadUsers.length === 0 && !loadingDropdowns && (
              <SelectItem value="" disabled>
                No lead users found
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      );
    }

    if (field.is_foreign && field.foreign_table) {
      const foreignRecords = foreignKeyData[fieldName] || [];
      
      return (
        <Select
          value={value?.toString() || ''}
          onValueChange={(val) => setFormData({ ...formData, [fieldName]: val === '' ? null : parseInt(val) })}
          disabled={loadingForeignKeys}
          {...commonProps}
        >
          <SelectTrigger className={`text-left ${baseClassName}`}>
            <SelectValue placeholder={
              loadingForeignKeys 
                ? 'Loading...' 
                : `Select ${field.label}`
            } />
          </SelectTrigger>
          <SelectContent>
            {!field.required && (
              <SelectItem value="">
                <span className="text-muted-foreground">None selected</span>
              </SelectItem>
            )}
            {foreignRecords.map((record) => (
              <SelectItem key={record.id} value={record.id.toString()}>
                {record.name || `${field.foreign_table} - ID: ${record.id}`}
              </SelectItem>
            ))}
            {foreignRecords.length === 0 && !loadingForeignKeys && (
              <SelectItem value="" disabled>
                No records found in {field.foreign_table}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      );
    }

    switch (field.type) {
      case 'boolean':
        return (
          <Select
            value={value !== undefined ? String(value) : ''}
            onValueChange={(val) =>
              setFormData({ ...formData, [fieldName]: val === '' ? null : val === 'true' })
            }
            {...commonProps}
          >
            <SelectTrigger className={`text-left ${baseClassName}`}>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {!field.required && (
                <SelectItem value="None">
                  <span className="text-muted-foreground">None selected</span>
                </SelectItem>
              )}
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  baseClassName,
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(String(value)), "PPP") : `Select ${field.label}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(String(value)) : undefined}
                onSelect={(date) => setFormData({ ...formData, [fieldName]: date || null })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'datetime':
        return (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    baseClassName,
                    !value && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(String(value)), "PPP") : `Select date`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={value ? new Date(String(value)) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const currentValue = value ? new Date(String(value)) : new Date();
                      const newDateTime = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                        currentValue.getHours(),
                        currentValue.getMinutes()
                      );
                      setFormData({ ...formData, [fieldName]: newDateTime });
                    } else {
                      setFormData({ ...formData, [fieldName]: null });
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={value ? format(new Date(String(value)), "HH:mm") : ''}
              onChange={(e) => {
                const time = e.target.value;
                if (time && value) {
                  const currentDate = new Date(String(value));
                  const [hours, minutes] = time.split(':');
                  const newDateTime = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDate.getDate(),
                    parseInt(hours),
                    parseInt(minutes)
                  );
                  setFormData({ ...formData, [fieldName]: newDateTime });
                }
              }}
              className={baseClassName}
              {...commonProps}
            />
          </div>
        );

      case 'integer':
        return (
          <Input
            type="number"
            step="1"
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData({ 
                ...formData, 
                [fieldName]: val === '' ? null : val
              });
            }}
            placeholder={`Enter ${field.label}`}
            className={`text-left ${baseClassName}`}
            {...commonProps}
          />
        );

      case 'float':
        return (
          <Input
            type="number"
            step="0.01"
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData({ 
                ...formData, 
                [fieldName]: val === '' ? null : val
              });
            }}
            placeholder={`Enter ${field.label}`}
            className={`text-left ${baseClassName}`}
            {...commonProps}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={(e) =>
              setFormData({ ...formData, [fieldName]: e.target.value })
            }
            placeholder={`Enter ${field.label}`}
            className={`text-left ${baseClassName}`}
            {...commonProps}
          />
        );

      case 'text':
        return (
          <Textarea
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={(e) =>
              setFormData({ ...formData, [fieldName]: e.target.value })
            }
            placeholder={`Enter ${field.label}`}
            rows={3}
            className={`text-left ${baseClassName}`}
            {...commonProps}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={(e) => {
              setFormData({ ...formData, [fieldName]: e.target.value });
            }}
            placeholder={`Enter ${field.label}`}
            className={`text-left ${baseClassName}`}
            {...commonProps}
          />
        );
    }
  };

  return (
    <div className="p-0">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-left">Add New Record</h1>
      </div>

      {/* ✅ NEW: General error alert */}
      {generalError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-start gap-2">
            <div className="flex-1">
              <p className="font-semibold mb-1">Error Creating Record</p>
              <p className="text-sm">{generalError}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
              onClick={() => setGeneralError(null)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-4xl space-y-4">
        <div className="p-0 space-y-4">
          {fields.map(field => {
            const fieldName = field.name;
            
            return (
              <div key={field.id} className="space-y-2 text-left">
                <Label htmlFor={fieldName} className="text-left block">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                  {field.is_foreign && (
                    <span className="ml-2 text-xs text-teal-500 bg-teal-50 px-2 py-1 rounded">
                      Foreign Key → {field.foreign_table}
                    </span>
                  )}
                </Label>
                {renderFieldInput(field)}
                {errors[fieldName] && (
                  <p id={`${fieldName}-error`} className="text-sm text-red-500 text-left">
                    {errors[fieldName]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-start gap-2 border-t pt-4">
          <Link href={`/crm/${tableId}`}>
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || loadingForeignKeys || loadingDropdowns}
          >
            {isSubmitting ? 'Creating...' : 'Create Record'}
          </Button>
        </div>
      </div>
    </div>
  );
}