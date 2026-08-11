// services/crm.service.ts - UPDATED with better error handling
import axios from "axios";
import { http } from './service';
import { 
  PaginatedCRMResponse,
  CreateTableRequest,
  UpdateTableRequest,
  CreateTableResponse,
  TableAttributesResponse,
  TableRecordsResponse,
  StoreRecordResponse,
  CRMLeadStatus,
  StoreCRMLeadStatusRequest,
  CRMLeadStatusResponse,
  StoreCRMLeadStatusResponse,
  CRMLeadUser,
  CRMLeadUsersResponse
} from "@/services/interface/crm";

// ✅ NEW: Enhanced error interface
interface APIError {
  error: boolean;
  message: string;
  code: number;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

// ✅ NEW: Helper function to extract user-friendly error messages
const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as APIError | undefined;
    
    if (apiError?.message) {
      // Handle foreign key errors specifically
      if (apiError.message.includes('foreign key constraint fails')) {
        // Extract the table name from the error message
        const tableMatch = apiError.message.match(/REFERENCES `([^`]+)`/);
        const foreignKeyMatch = apiError.message.match(/`([^`]+)_foreign`/);
        
        if (tableMatch && foreignKeyMatch) {
          const referencedTable = tableMatch[1];
          const fieldName = foreignKeyMatch[1].split('_').slice(0, -1).join('_');
          return `Invalid reference: The ${fieldName} you selected doesn't exist in ${referencedTable}. Please select a valid option.`;
        }
        
        return 'The selected reference is invalid or does not exist. Please choose a valid option from the dropdown.';
      }
      
      // Handle "table does not exist" errors
      if (apiError.message.includes('does not exist for foreign key')) {
        const tableMatch = apiError.message.match(/Referenced table '([^']+)'/);
        if (tableMatch) {
          return `Configuration error: The referenced table "${tableMatch[1]}" does not exist. Please contact your administrator.`;
        }
        return 'The referenced table does not exist. Please contact your administrator.';
      }
      
      // Handle integrity constraint violations
      if (apiError.message.includes('Integrity constraint violation')) {
        return 'Data integrity error: The data you entered conflicts with database constraints. Please check your input values.';
      }
      
      // Handle validation errors
      if (apiError.errors && Object.keys(apiError.errors).length > 0) {
        const fieldErrors = Object.entries(apiError.errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        return `${apiError.message}: ${fieldErrors}`;
      }
      
      // Return the raw message if no specific pattern matches
      return apiError.message;
    }
    
    // Fallback to HTTP status messages
    if (error.response?.status === 500) {
      return 'Server error occurred. Please try again later or contact support.';
    }
    if (error.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.response?.status === 401) {
      return 'Your session has expired. Please login again.';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// CRM Table Services
let crmTablesPromise: Promise<PaginatedCRMResponse> | null = null;

export const getCRMTables = async (
  search?: string,
  start = 0,
  length = 50,
  draw = 1
): Promise<PaginatedCRMResponse> => {
  // If we have an identical request in flight, return that promise
  // For simplicity, we only collapse requests with no search/pagination params (most common in sidebar/dashboard)
  const isDefaultRequest = !search && start === 0 && length === 50;
  
  if (isDefaultRequest && crmTablesPromise) {
    return crmTablesPromise;
  }

  try {
    const fetchPromise = (async () => {
      console.log('API Call: Fetching CRM tables', { search, start, length, draw });
      
      const response = await http.get('admin/custom-crm', {
        params: { search, start, length, draw },
      });
      
      console.log('API Response: CRM tables', response.data);
      return response.data;
    })();

    if (isDefaultRequest) {
      crmTablesPromise = fetchPromise;
    }
    
    const data = await fetchPromise;
    return data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = Number(error.response?.status);
      if ([401, 403, 404].includes(status)) {
        console.warn('getCRMTables: skipping due to auth/route status', {
          status,
          url: error.config?.url ?? null,
        });
        return { draw: draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
      }
    }

    console.error('getCRMTables Error:', error);
    return { draw: draw, recordsTotal: 0, recordsFiltered: 0, data: [] };
  } finally {
    if (isDefaultRequest) {
      // Clear after a short delay to allow other components to catch up
      setTimeout(() => {
        crmTablesPromise = null;
      }, 500);
    }
  }
};

export const createCRMTables = async (
  tableData: CreateTableRequest
): Promise<CreateTableResponse> => {
  try {
    const response = await http.post('admin/custom-crm/store', tableData);
    return response.data;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Create table error:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateCRMTable = async (
  tableId: string | number,
  tableData: UpdateTableRequest
): Promise<CreateTableResponse> => {
  try {
    const response = await http.put(`admin/custom-crm/update/${tableId}/attributes`, tableData);
    return response.data;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Update table error:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const deleteCRMTable = async (
  tableId: string | number
): Promise<{ message: string }> => {
  try {
    const response = await http.delete(`admin/custom-crm/delete/${tableId}`);
    return response.data;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Delete table error:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const uploadCSV = async (
  file: File,
  tableName: string
): Promise<{ message: string }> => {
  try {
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('table_name', tableName);

    const response = await http.post(
      'admin/custom-crm/upload-csv',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Upload CSV error:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const getTableAttributes = async (
  tableId: string | number
): Promise<TableAttributesResponse> => {
  try {
    const response = await http.get(`admin/custom-crm/custom-tables/${tableId}/attributes`);
    return response.data;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Get table attributes error:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const getTableRecords = async (
  tableId: string | number,
  search?: string
): Promise<TableRecordsResponse> => {
  try {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    
    console.log('Fetching table records for ID:', tableId);
    
    const response = await http.get(`admin/custom-crm/custom-tables/${tableId}/attributes/records`, {
      params
    });
    
    console.log('Table records response:', response.data);
    return response.data;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Get table records error:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ✅ UPDATED: Enhanced error handling for record creation
export const storeTableRecord = async (
  tableId: string | number,
  recordData: Record<string, unknown>
): Promise<StoreRecordResponse> => {
  try {
    const requestBody = {
      attributes: recordData
    };
    
    console.log('=== STORE RECORD API CALL ===');
    console.log('Table ID:', tableId);
    console.log('Payload:', JSON.stringify(requestBody, null, 2));
    
    const response = await http.post(
      `admin/custom-crm/custom-tables/${tableId}/records/store`, 
      requestBody
    );
    
    console.log('=== STORE RECORD SUCCESS ===');
    console.log('Response:', response.data);
    
    return response.data;
  } catch (error: unknown) {
    console.error('=== STORE RECORD ERROR ===');
    console.error('Full error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    
    const errorMessage = extractErrorMessage(error);
    console.error('Extracted error message:', errorMessage);
    
    throw new Error(errorMessage);
  }
};

export const getAllTablesForDropdown = async (): Promise<{ id: number; name: string; }[]> => {
  try {
    const response = await getCRMTables('', 0, 1000, 1);
    return response.data.map(table => ({
      id: table.id,
      name: table.name
    }));
  } catch (error: unknown) {
    console.error('Failed to fetch tables for dropdown:', error);
    return [];
  }
};

export const getForeignTableRecords = async (
  tableName: string
): Promise<{ id: number; name?: string; [key: string]: unknown }[]> => {
  try {
    console.log(`Fetching foreign table records for: ${tableName}`);
    
    const tablesResponse = await getCRMTables('', 0, 1000, 1);
    const targetTable = tablesResponse.data.find(t => t.name === tableName);
    
    if (!targetTable) {
      console.error(`Foreign table "${tableName}" not found in available tables`);
      return [];
    }
    
    console.log(`Found target table: ${targetTable.name} (ID: ${targetTable.id})`);
    
    const response = await getTableRecords(targetTable.id);
    
    if (!response.data || !Array.isArray(response.data.data)) {
      console.error('Invalid response format for foreign table records');
      return [];
    }
    
    const records = response.data.data.map((record: any, index: number) => {
      const recordId = record?.id || index + 1;
      
      let displayName = record?.name || record?.title || record?.email || 
                       record?.first_name || `Record ${recordId}`;
      
      return {
        id: recordId,
        name: displayName,
        ...record
      };
    });
    
    console.log(`Loaded ${records.length} records from foreign table ${tableName}`);
    return records;
    
  } catch (error: unknown) {
    console.error(`Failed to fetch foreign table records for ${tableName}:`, error);
    return [];
  }
};

// CRM Lead Status Services
export const getCRMLeadStatuses = async (): Promise<CRMLeadStatus[]> => {
  try {
    const response = await http.get<CRMLeadStatusResponse>('admin/custom-crm/crm-leads-status');
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    
    return [];
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Failed to fetch CRM lead statuses:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const storeCRMLeadStatus = async (
  payload: StoreCRMLeadStatusRequest
): Promise<StoreCRMLeadStatusResponse> => {
  try {
    const response = await http.post<StoreCRMLeadStatusResponse>(
      'admin/custom-crm/crm-leads-status/store',
      payload
    );
    
    return response.data;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Failed to store CRM lead status:', errorMessage);
    throw new Error(errorMessage);
  }
};

// CRM Lead Users Service
export const getLeadUsers = async (): Promise<CRMLeadUser[]> => {
  try {
    const response = await http.get<CRMLeadUsersResponse>('admin/custom-crm/lead-users');
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    
    return [];
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);
    console.error('Failed to fetch lead users:', errorMessage);
    throw new Error(errorMessage);
  }
};