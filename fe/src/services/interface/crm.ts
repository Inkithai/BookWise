//crm.ts
import { format, parse, isValid } from 'date-fns';

export const CRM_FIELD_TYPES = [
  'string', 'text', 'integer', 'float', 'boolean', 
  'date', 'datetime', 'email'
] as const;

export type TableFieldType = typeof CRM_FIELD_TYPES[number];

// User-friendly display names for field types
export const CRM_FIELD_TYPE_DISPLAY_NAMES: Record<TableFieldType, string> = {
  'string': 'Short Text',
  'text': 'Long Text',
  'integer': 'Whole Number',
  'float': 'Decimal Number',
  'boolean': 'Yes/No',
  'date': 'Date',
  'datetime': 'Date & Time',
  'email': 'Email Address'
};

// Field types allowed for foreign keys (only integer)
export const FOREIGN_KEY_ALLOWED_TYPES: TableFieldType[] = ['integer'];

export interface TableField {
  id: string;
  name: string;
  label: string;
  type: TableFieldType;
  required?: boolean;
  nullable?: boolean;
  is_foreign?: boolean;
  options?: string[];
  foreign_table?: string;
  foreign_field?: string;
}

export interface CRMTable {
  id: string;
  name: string;
  display_name: string;
  host_id?: number;
  icon: IconName;
  fields: TableField[];
  record_count: number;
  created_at: string;
  updated_at: string;
}

export interface TableRecord {
  id: string | number;
  [key: string]: unknown;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export type IconName = 
  | 'Table2' | 'Calendar' | 'Check' | 'X' | 'User' | 'FileText' | 'DollarSign'
  | 'CreditCard' | 'Mail' | 'AlertCircle' | 'Home' | 'MapPin' | 'Image' | 'Settings'
  | 'Wrench' | 'Users' | 'Phone' | 'MessageSquare' | 'Star' | 'Heart' | 'Bookmark'
  | 'Search' | 'Sun' | 'Moon' | 'Cloud' | 'Camera' | 'Lock' | 'Unlock' | 'Compass'
  | 'Circle' | 'Square' | 'Database' | 'Folder' | 'File' | 'Edit' | 'Trash2' | 'Plus'
  | 'Minus' | 'Save' | 'Upload' | 'Download' | 'Filter' | 'Sort' | 'Grid' | 'List';

export interface CRMTableResponse {
  id: number;
  name: string;
  host_id: number;
  created_at?: string;
  updated_at?: string;
  attributes: {
    id: number;
    label: string | null;
    name?: string;
    type: string;
    is_nullable?: boolean;
    is_foreign?: boolean;
    foreign_table_name?: string | null;
  }[];
}

export interface PaginatedCRMResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: CRMTableResponse[];
}

export interface CreateTableRequest {
  table_name: string;
  attributes: {
    name: string;
    type: string;
    is_nullable?: boolean;
    is_foreign?: boolean;
    foreign_table_name?: string;
  }[];
}

export interface UpdateTableRequest {
  table_name: string;
  attributes: {
    name: string;
    type: string;
    is_nullable?: boolean;
    is_foreign?: boolean;
    foreign_table_name?: string;
  }[];
}

export interface CreateTableResponse {
  message: string;
  data: CRMTableResponse[];
}

export interface UploadCSVRequest {
  csv_file: File;
  table_name: string;
}

export interface TableAttributesResponse {
  message: string;
  data: {
    id: number;
    name: string;
    type: string;
    is_nullable: boolean;
    is_foreign: boolean;
    foreign_table_name?: string;
  }[];
}

export interface TableRecordsResponse {
  message: string;
  data: {
    table: {
      id: number;
      name: string;
    };
    attributes: {
      id: number;
      name: string;
      type: string;
      is_nullable: boolean;
      is_foreign: boolean;
    }[];
    data: Record<string, unknown>[];
  };
}

export interface StoreRecordRequest {
  [key: string]: unknown;
}

export interface StoreRecordResponse {
  message: string;
  data: Record<string, unknown>;
}

// CRM Lead Status Interfaces
export interface CRMLeadStatus {
  id: number;
  name: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CRMLeadStatusResponse {
  success: boolean;
  data: CRMLeadStatus[];
}

export interface StoreCRMLeadStatusRequest {
  id?: number;
  name: string;
}

export interface StoreCRMLeadStatusResponse {
  success: boolean;
  data: CRMLeadStatus;
}

// CRM Lead Users Interfaces
export interface CRMLeadUser {
  id: number;
  name: string;
}

export interface CRMLeadUsersResponse {
  success: boolean;
  data: CRMLeadUser[];
}

// Admin Users Interfaces
export interface AdminUser {
  id: number;
  name: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user_name?: string;
  phone_number?: string;
  active?: number;
  profile_photo?: string;
  roles?: number;
  company_designation?: string;
  short_bio?: string;
  location?: string;
  profile_img?: string;
}

export interface AdminUsersResponse {
  success: boolean;
  data: AdminUser[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export const normalizeFieldName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

export const parseDateValue = (value: string): string | null => {
  if (!value || value === '-' || value.trim() === '') return null;
  
  try {
    const date = new Date(value);
    if (isValid(date)) {
      return date.toISOString();
    }
    
    const dateFormats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy', 
      'dd/MM/yyyy',
      'yyyy-MM-dd HH:mm',
      'MM/dd/yyyy HH:mm',
      'dd/MM/yyyy HH:mm',
      'yyyy-MM-dd HH:mm:ss',
      'MM/dd/yyyy HH:mm:ss'
    ];

    for (const fmt of dateFormats) {
      try {
        const parsedDate = parse(value, fmt, new Date());
        if (isValid(parsedDate)) {
          return parsedDate.toISOString();
        }
      } catch {
        continue;
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

export const formatDateValue = (value: string, type: 'date' | 'datetime' = 'date'): string => {
  if (!value || value === '-' || value.trim() === '') return '-';

  try {
    const date = new Date(value);
    if (!isValid(date)) return value;

    return type === 'date'
      ? format(date, 'yyyy-MM-dd')
      : format(date, "yyyy-MM-dd HH:mm:ss");
  } catch {
    return value;
  }
};

export const validateFieldValue = (value: unknown, field: TableField): string | null => {
  if (field.required && (value === null || value === undefined || value === '')) {
    return `${field.label} is required`;
  }

  if (!field.required && (value === null || value === undefined || value === '')) {
    return null;
  }

  switch (field.type) {
    case 'email':
      if (typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${field.label} must be a valid email address`;
        }
      }
      break;

    case 'integer':
      if (isNaN(parseInt(String(value), 10))) {
        return `${field.label} must be a valid integer`;
      }
      break;

    case 'float':
      if (isNaN(parseFloat(String(value)))) {
        return `${field.label} must be a valid number`;
      }
      break;

    case 'date':
    case 'datetime':
      if (typeof value === 'string') {
        const dateValue = parseDateValue(value);
        if (!dateValue) {
          return `${field.label} must be a valid date`;
        }
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return `${field.label} must be true or false`;
      }
      break;
  }

  return null;
};

export const generateFieldLabel = (fieldName: string): string => {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

export const convertFieldValue = (value: unknown, fieldType: TableFieldType): unknown => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  switch (fieldType) {
    case 'integer':
      return parseInt(String(value), 10);
    case 'float':
      return parseFloat(String(value));
    case 'boolean':
      return value === true || value === 'true' || value === '1';
    case 'date': {
      const dateVal = parseDateValue(String(value));
      return dateVal ? format(new Date(dateVal), 'yyyy-MM-dd') : null;
    }
    case 'datetime': {
      const datetimeVal = parseDateValue(String(value));
      return datetimeVal ? new Date(datetimeVal).toISOString() : null;
    }
    default:
      return String(value);
  }
};

export const mapFieldType = (apiType: string): TableFieldType => {
  const typeMap: Record<string, TableFieldType> = {
    string: 'string',
    text: 'text',
    integer: 'integer',
    unsignedBigInteger: 'integer',
    bigInteger: 'integer',
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

export const mapTableFields = (attributes: {
  id: number;
  label?: string | null;
  name: string;
  type: string;
  is_nullable?: boolean;
  is_foreign?: boolean;
  foreign_table_name?: string | null;
}[]): TableField[] => {
  return attributes.map(attr => ({
    id: attr.id.toString(),
    name: attr.name,
    label: attr.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: mapFieldType(attr.type),
    required: attr.is_nullable !== true,
    nullable: attr.is_nullable === true,
    is_foreign: attr.is_foreign === true,
    foreign_table: attr.foreign_table_name || undefined
  }));
};