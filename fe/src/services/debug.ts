// services/debug.ts - Add this to help debug API calls
// services/debug.ts - FIXED VERSION
import { StoreInvoiceRequest, UpdateInvoiceRequest } from "./interface/invoice";

export const debugApiCall = (method: string, url: string, payload?: unknown) => {
  console.group(`API Call: ${method} ${url}`);
  console.log('Timestamp:', new Date().toISOString());
  if (payload) {
    console.log('Payload:', JSON.stringify(payload, null, 2));
  }
  console.groupEnd();
};

export const debugApiResponse = (method: string, url: string, response: unknown, error?: unknown) => {
  console.group(`API Response: ${method} ${url}`);
  console.log('Timestamp:', new Date().toISOString());
  if (error) {
    console.error('Error:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const errorResponse = (error as { response?: unknown }).response;
      console.error('Error Response:', errorResponse);
    }
  } else {
    console.log('Success Response:', response);
  }
  console.groupEnd();
};

export const createInvoiceWithDebug = async (payload: StoreInvoiceRequest) => {
  const url = '/api/v1/admin/invoices/store';
  const method = 'POST';
  
  debugApiCall(method, url, payload);
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://admin.bookingsbnb.com'}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      let parsedError: { message?: string } = {};
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { message: errorData };
      }
      
      const error = new Error(parsedError.message || `HTTP ${response.status}`);
      (error as { response?: unknown }).response = {
        status: response.status,
        data: parsedError
      };
      
      debugApiResponse(method, url, null, error);
      throw error;
    }

    const data = await response.json();
    debugApiResponse(method, url, data);
    return data;
  } catch (error) {
    debugApiResponse(method, url, null, error);
    throw error;
  }
};

export const updateInvoiceWithDebug = async (id: number, payload: UpdateInvoiceRequest) => {
  const url = `/api/v1/admin/invoices/update/${id}`;
  const method = 'PUT';
  
  debugApiCall(method, url, payload);
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://admin.bookingsbnb.com'}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      let parsedError: { message?: string } = {};
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { message: errorData };
      }
      
      const error = new Error(parsedError.message || `HTTP ${response.status}`);
      (error as { response?: unknown }).response = {
        status: response.status,
        data: parsedError
      };
      
      debugApiResponse(method, url, null, error);
      throw error;
    }

    const data = await response.json();
    debugApiResponse(method, url, data);
    return data;
  } catch (error) {
    debugApiResponse(method, url, null, error);
    throw error;
  }
};

// ✅ FIXED: Updated to use single items array instead of separate arrays
export const validateInvoicePayload = (payload: StoreInvoiceRequest | UpdateInvoiceRequest, isUpdate = false) => {
  const errors: string[] = [];
  
  if (!isUpdate) {
    if (!('invoice_code' in payload) || !payload.invoice_code) errors.push('invoice_code is required');
    if (!payload.invoice_date) errors.push('invoice_date is required');
  }
  
  if (!payload.client_id) errors.push('client_id is required');
  if (!payload.type_id) errors.push('type_id is required');
  if (!payload.due_date) errors.push('due_date is required');
  if (payload.total_amount === undefined || payload.total_amount === null) errors.push('total_amount is required');
  if (payload.final_amount === undefined || payload.final_amount === null) errors.push('final_amount is required');
  
  // ✅ FIXED: Use the single items array instead of separate arrays
  if (!payload.items || payload.items.length === 0) {
    errors.push('At least one item must be provided in the items array');
  }
  
  // ✅ FIXED: Validate items in the single items array
  const validateItems = (items: any[] | undefined, context: string) => {
    if (!items) return;
    
    items.forEach((item, index) => {
      if (typeof item !== 'object' || item === null) {
        errors.push(`${context}[${index}] must be an object`);
        return;
      }
      
      if (!item.name) errors.push(`${context}[${index}].name is required`);
      if (!item.type) errors.push(`${context}[${index}].type is required`);
      if (item.price === undefined || item.price === null) errors.push(`${context}[${index}].price is required`);
      if (item.total_amount === undefined || item.total_amount === null) errors.push(`${context}[${index}].total_amount is required`);
      
      if (item.type === 'product' && (item.quantity === undefined || item.quantity === null)) {
        errors.push(`${context}[${index}].quantity is required for products`);
      }
    });
  };
  
  // ✅ FIXED: Only validate the single items array
  validateItems(payload.items, 'items');
  
  if (errors.length > 0) {
    console.error('Validation errors:', errors);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  console.log('Payload validation passed');
  return true;
};

// ✅ FIXED: Remove any references to old property names that were causing TypeScript errors
// The following properties no longer exist in the updated interfaces:
// - products
// - services  
// - cleaning_fee
// All items are now in the single 'items' array