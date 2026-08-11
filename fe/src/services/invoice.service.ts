// services/invoice.service.ts - UPDATED WITH QUOTATION FIELDS
import axios from "axios";
import { http, handleApiError } from './service';
import {
  Invoice,
  InvoiceType,
  Client,
  InvoiceDataResponse,
  StoreInvoiceRequest,
  StoreDraftInvoiceRequest,
  DraftInvoiceItem,
  DraftInvoice,
  UpdateInvoiceRequest,
  StoreClientRequest,
  UpdateClientRequest,
  ClientsResponse,
  InvoiceTypesResponse,
  SuccessResponse,
  SingleInvoiceResponse,
  normalizeInvoiceResponse,
  InvoiceData,
  DEFAULT_CURRENCY,
  InvoiceItem
} from "@/services/interface/invoice";


// Invoice Services
export const getInvoices = async (search?: string, companyId?: number | null): Promise<Invoice[]> => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (companyId != null) params.append('company_id', String(companyId));

    const response = await http.get(`admin/invoices?${params.toString()}`);

    if (response.data?.success && Array.isArray(response.data.data)) {
      return response.data.data.map(normalizeInvoiceResponse);
    }

    throw new Error('Invalid response format');
  } catch (error: unknown) {
    console.error('Failed to fetch invoices:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch invoices');
    }
    throw new Error('Failed to fetch invoices');
  }
};

export const getInvoice = async (
  id: number,
  options?: {
    clients?: Client[];
    invoiceTypes?: InvoiceType[];
    skipReferenceData?: boolean;
  }
): Promise<Invoice> => {
  try {
    console.log(`📋 API: Fetching invoice ${id}`);

    // Fetch invoice details first so 404 fails fast
    const invoiceResponse = await http.get<SingleInvoiceResponse>(`admin/invoices/show/${id}`);

    console.log('📋 API Response for invoice:', invoiceResponse.data);

    if (invoiceResponse.data?.success && invoiceResponse.data.data) {
      let clientsData = options?.clients;
      let typesData = options?.invoiceTypes;

      if (!options?.skipReferenceData && (!clientsData || !typesData)) {
        const [fetchedClients, fetchedTypes] = await Promise.all([
          clientsData ? Promise.resolve(clientsData) : getInvoiceClients(),
          typesData ? Promise.resolve(typesData) : getInvoiceTypes(),
        ]);
        clientsData = fetchedClients;
        typesData = fetchedTypes;
      }

      const normalized = normalizeInvoiceResponse(
        invoiceResponse.data.data,
        clientsData,
        typesData
      );

      console.log('normaized:', normalized);

      console.log('✅ Normalized invoice with quotation fields:', {
        id: normalized.id,
        code: normalized.code,
        client: normalized.client,
        invoice_type: normalized.invoice_type,
        quotation_title: normalized.quotation_title,
        quotation_content: normalized.quotation_content ? normalized.quotation_content.substring(0, 50) + '...' : null
      });

      return normalized;
    }

    throw new Error('Invoice not found');
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseMessage =
        typeof (error.response?.data as any)?.message === "string"
          ? (error.response?.data as any).message
          : "";

      // Preserve HTTP metadata so callers can detect 404 and run context fallback.
      const wrapped = new Error(
        responseMessage || (status === 404 ? `Invoice #${id} not found` : `Failed to fetch invoice ${id}`)
      ) as Error & { response?: any; status?: number };
      wrapped.response = error.response;
      wrapped.status = status;
      throw wrapped;
    }
    throw new Error(`Failed to fetch invoice ${id}`);
  }
};

export const createInvoice = async (payload: StoreInvoiceRequest): Promise<Invoice> => {
  try {
    if (!payload.items || payload.items.length === 0) {
      throw new Error("At least one item must be provided");
    }

    console.log('📦 Creating invoice with items:', payload.items.length);
    console.log('📝 Quotation fields:', {
      quotation_title: payload.quotation_title,
      quotation_content: payload.quotation_content ? payload.quotation_content.substring(0, 50) + '...' : null
    });

    const jsonPayload = {
      invoice_code: payload.invoice_code,
      client_id: payload.client_id,
      company_id: payload.company_id ?? null,
      type_id: payload.type_id,
      invoice_date: payload.invoice_date,
      due_date: payload.due_date,
      items: payload.items.map(item => ({
        ...item,
        currency: item.currency || DEFAULT_CURRENCY
      })),
      total_amount: payload.total_amount,
      total_vat: payload.total_vat !== undefined ? payload.total_vat : 0,
      total_discount: payload.total_discount !== undefined ? payload.total_discount : 0,
      final_amount: payload.final_amount,
      status: payload.status || "Created",
      pdf_type: payload.pdf_type || 'classic',
      quotation_title: payload.quotation_title,  // ADDED: Include quotation title
      quotation_content: payload.quotation_content, // ADDED: Include quotation content
      bank_payment: payload.bank_payment,
      payment_link: payload.payment_link,
      ...(payload.bank_payment && payload.account_name ? {
        account_name: payload.account_name,
        account_number: payload.account_number,
        sort_code: payload.sort_code,
      } : {}),
      cis_tax: payload.cis_tax ?? null,
      client_utr: payload.client_utr ?? null,
      cis_enabled: payload.cis_enabled ?? false,
      pdf_field_visibility: payload.pdf_field_visibility ?? null,
      all_accounts_view: payload.all_accounts_view ?? false,
      notes: payload.notes,
    };

    console.log('🔄 Creating invoice with JSON payload');
    console.log('📋 Quotation data included:', {
      has_quotation_title: !!payload.quotation_title,
      has_quotation_content: !!payload.quotation_content
    });

    const response = await http.post<SingleInvoiceResponse>(
      'admin/invoices/store',
      jsonPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.success && response.data.data) {
      return normalizeInvoiceResponse(response.data.data);
    }

    throw new Error('Failed to create invoice');
  } catch (error: unknown) {
    console.error('Failed to create invoice:', error);

    if (axios.isAxiosError(error) && error.response?.status === 422) {
      const errors = error.response.data?.errors;


      // catch specific erros
      if (errors.bank_payment || errors.payment_link) {
        const message = errors.bank_payment ?? errors.payment_link
        throw new Error(message);

      }
      if (errors) {
        const errorMessage = Object.entries(errors)
          .map(([field, messages]) => `${(messages as string[]).join(', ')}`)
          .join('\n');
        throw new Error(`${errorMessage}`);
      }
    }

    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to create invoice');
    }
    throw new Error('Failed to create invoice');
  }
};

export const saveOrUpdateDraftInvoice = async (
  id?: number,
  payload?: Partial<StoreDraftInvoiceRequest>
): Promise<DraftInvoice> => {
  try {

    // Validate items only if provided
    if (payload?.items) {
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        throw new Error("At least one item must be provided if items are included");
      }

      payload.items.forEach((item, index) => {
        if (!item.name || !item.type) {
          throw new Error(`Item ${index + 1} must have a name and type`);
        }
        // if (item.price === undefined || item.total_amount === undefined) {
        //   throw new Error(`Item ${index + 1} must have price and total_amount`);
        // }
      });
    }

    const jsonPayload: any = {
      ...(payload?.invoice_code && { invoice_code: payload.invoice_code }),
      ...(payload?.client_id && { client_id: payload.client_id }),
      ...(payload?.type_id && { type_id: payload.type_id }),
      ...(payload?.invoice_date && { invoice_date: payload.invoice_date }),
      ...(payload?.due_date && { due_date: payload.due_date }),
      ...(payload?.items && {
        items: payload.items.map(item => ({
          ...item,
          currency: item.currency || DEFAULT_CURRENCY
        }))
      }),
      ...(payload?.total_amount !== undefined && { total_amount: payload.total_amount }),
      ...(payload?.total_vat !== undefined && { total_vat: payload.total_vat }),
      ...(payload?.total_discount !== undefined && { total_discount: payload.total_discount }),
      ...(payload?.final_amount !== undefined && { final_amount: payload.final_amount }),
      ...(payload?.status && { status: payload.status }),
      ...(payload?.pdf_type && { pdf_type: payload.pdf_type }),
      ...(payload?.quotation_title && { quotation_title: payload.quotation_title }),
      ...(payload?.quotation_content && { quotation_content: payload.quotation_content }),

      ...(payload?.cis_tax && { cis_tax: payload.cis_tax }),
      ...(payload?.client_utr && { client_utr: payload.client_utr }),

      ...(payload?.cis_enabled && { cis_enabled: payload.cis_enabled }),
      ...(payload?.pdf_field_visibility !== undefined && {
        pdf_field_visibility: payload.pdf_field_visibility,
      }),

      ...(payload?.company_id != null && { company_id: payload.company_id }),
      ...(payload?.bank_payment != null && { bank_payment: payload.bank_payment }),
      ...(payload?.payment_link != null && { payment_link: payload.payment_link }),

    };

    const url = id ? `admin/invoices/save-draft/${id}` : "admin/invoices/save-draft";

    const response = await http.post<{
      success: boolean;
      message?: string;
      is_draft?: boolean;
      data?: any;
    }>(url, jsonPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });

    if (response.data?.success && response.data.data) {
      const rawData = response.data.data;

      // Convert item strings to numbers
      const items: DraftInvoiceItem[] = rawData.items?.map((item: any) => ({
        id: item.id,
        invoice_id: item.invoice_id,
        name: item.name,
        type: item.type,
        currency: item.currency,
        price: item.price ? parseFloat(item.price) : undefined,
        quantity: item.quantity ? parseFloat(item.quantity) : undefined,
        discount: item.discount ? parseFloat(item.discount) : undefined,
        discount_value: item.discount_value ? parseFloat(item.discount_value) : undefined,
        vat: item.vat ? parseFloat(item.vat) : undefined,
        vat_value: item.vat_value ? parseFloat(item.vat_value) : undefined,
        total: item.total ? parseFloat(item.total) : undefined,
        custom_fields: Array.isArray(item.custom_fields)
          ? item.custom_fields
            .filter((field: any) => field?.key || field?.value)
            .map((field: any) => ({
              key: typeof field.key === "string" ? field.key : "",
              value: typeof field.value === "string" ? field.value : "",
            }))
          : [],
        cis_tax: item.cis_tax ?? null,
        client_utr: item.client_utr ?? null,
        cis_enabled: item.cis_enabled ?? false,
      }));

      return {
        ...rawData,
        items
      } as DraftInvoice;
    }

    throw new Error("Failed to save/update draft invoice - API returned unsuccessful");

  } catch (error: unknown) {
    console.error("❌ Error saving/updating draft invoice:", error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 422 && data?.errors) {
        const errorMessage = Object.entries(data.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
          .join("; ");
        throw new Error(`Validation failed: ${errorMessage}`);
      }

      if (status === 404 && id) {
        throw new Error(`Invoice #${id} not found`);
      }

      if (data?.message) {
        throw new Error(data.message);
      }

      throw new Error(`HTTP ${status}: ${error.message}`);
    }

    if (error instanceof Error) throw error;
    throw new Error("Failed to save/update draft invoice");
  }
};


export const updateInvoice = async (id: number, payload: UpdateInvoiceRequest): Promise<Invoice> => {
  try {
    console.log("🔄 updateInvoice called with ID:", id);
    console.log("📦 Payload summary:", {
      status: payload.status,
      itemsCount: payload.items?.length || 0,
      client_id: payload.client_id,
      type_id: payload.type_id,
      quotation_title: payload.quotation_title,
      quotation_content: payload.quotation_content ? payload.quotation_content.substring(0, 50) + '...' : null
    });

    // Validate required fields
    if (!payload.client_id || payload.client_id === 0) {
      console.error("❌ Missing client_id");
      throw new Error("client_id is required");
    }

    if (!payload.type_id || payload.type_id === 0) {
      console.error("❌ Missing type_id");
      throw new Error("type_id is required");
    }

    // Validate items
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      console.error("❌ No items found in payload");
      throw new Error("The invoice must contain at least one item");
    }

    // Validate each item
    payload.items.forEach((item, index) => {
      if (!item.name || item.name.trim() === '') {
        throw new Error(`Item ${index + 1} is missing a name`);
      }
      if (!item.type || item.type.trim() === '') {
        throw new Error(`Item ${index + 1} is missing a type`);
      }
      if (item.price === undefined || item.price === null) {
        throw new Error(`Item ${index + 1} is missing a price`);
      }
      if (item.total_amount === undefined || item.total_amount === null) {
        throw new Error(`Item ${index + 1} is missing total amount`);
      }
    });

    // Prepare items with all required fields
    const preparedItems = payload.items.map(item => ({
      name: item.name,
      type: item.type,
      currency: item.currency || DEFAULT_CURRENCY,
      price: parseFloat(item.price.toString()),
      quantity: item.type === "product" ? parseFloat(item.quantity?.toString() || "1") : 1,
      discount: item.discount !== undefined && item.discount !== null ? parseFloat(item.discount.toString()) : 0,
      discount_value: item.discount_value !== undefined && item.discount_value !== null ? parseFloat(item.discount_value.toString()) : 0,
      vat: item.vat !== undefined && item.vat !== null ? parseFloat(item.vat.toString()) : 0,
      vat_value: item.vat_value !== undefined && item.vat_value !== null ? parseFloat(item.vat_value.toString()) : 0,
      total_amount: parseFloat(item.total_amount.toString()),
      project_reference: item.project_reference ?? null,
      custom_fields: Array.isArray(item.custom_fields)
        ? item.custom_fields
          .filter((field) => field?.key?.trim() || field?.value?.trim())
          .map((field) => ({
            key: field.key?.trim() || "",
            value: field.value?.trim() || "",
          }))
        : [],
    }));

    // Prepare complete payload
    const jsonPayload = {
      client_id: payload.client_id,
      company_id: payload.company_id ?? null,
      type_id: payload.type_id,
      invoice_code: payload.invoice_code,
      invoice_date: payload.invoice_date || new Date().toISOString().split('T')[0],
      // due_date: payload.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      due_date: payload.due_date || null,
      items: preparedItems,
      total_amount: payload.total_amount ||
        preparedItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
      total_vat: payload.total_vat !== undefined ? payload.total_vat :
        preparedItems.reduce((sum, item) => sum + (item.vat_value || 0), 0),
      total_discount: payload.total_discount !== undefined ? payload.total_discount :
        preparedItems.reduce((sum, item) => sum + (item.discount_value || 0), 0),
      final_amount: payload.final_amount ||
        preparedItems.reduce((sum, item) => sum + item.total_amount, 0),
      status: payload.status || "Created",
      pdf_type: payload.pdf_type || 'classic',
      quotation_title: payload.quotation_title,  // ADDED: Include quotation title
      quotation_content: payload.quotation_content, // ADDED: Include quotation content,
      payment_link: payload.payment_link,
      bank_payment: payload.bank_payment,
      notes: payload.notes,
      ...(payload.bank_payment && payload.account_name ? {
        account_name: payload.account_name,
        account_number: payload.account_number,
        sort_code: payload.sort_code,
      } : {}),
      cis_enabled: payload.cis_enabled ?? false,
      cis_tax: payload.cis_tax,
      client_utr: payload.client_utr,
      pdf_field_visibility: payload.pdf_field_visibility ?? null,
      all_accounts_view: payload.all_accounts_view ?? false,
    };

    console.log("📦 Sending complete JSON payload to API with", preparedItems.length, "items");
    console.log("📋 Quotation fields:", {
      quotation_title: jsonPayload.quotation_title,
      has_quotation_content: !!jsonPayload.quotation_content
    });

    const response = await http.put<SingleInvoiceResponse>(
      `admin/invoices/update/${id}`,
      jsonPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log("✅ API Response success:", response.data?.success);

    if (response.data?.success && response.data.data) {
      const updatedInvoice = normalizeInvoiceResponse(response.data.data);
      console.log("✅ Invoice updated successfully:", {
        id: updatedInvoice.id,
        code: updatedInvoice.code,
        status: updatedInvoice.status,
        quotation_title: updatedInvoice.quotation_title
      });
      return updatedInvoice;
    }

    throw new Error('Failed to update invoice - API returned unsuccessful');

  } catch (error: unknown) {
    console.error(`❌ Failed to update invoice ${id}:`, error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      console.error("🔴 Error Details:", {
        status,
        message: data?.message,
        errors: data?.errors
      });

      if (status === 422) {
        const errors = data?.errors;


        // catch specific erros
        if (errors.bank_payment || errors.payment_link) {
          const message = errors.bank_payment ?? errors.payment_link
          throw new Error(message);

        }
        if (errors) {
          const errorMessage = Object.entries(errors)
            .map(([field, messages]) => `${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          throw new Error(`${errorMessage}`);
        }
      }

      if (status === 404) {
        throw new Error(`Invoice #${id} not found`);
      }

      if (data?.message) {
        throw new Error(data.message);
      }

      throw new Error(`HTTP ${status}: ${error.message}`);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Failed to update invoice ${id}`);
  }
};

export const deleteInvoice = async (id: number): Promise<SuccessResponse> => {
  try {
    const response = await http.delete<SuccessResponse>(`admin/invoices/delete/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Failed to delete invoice ${id}:`, error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || `Failed to delete invoice ${id}`);
    }
    throw new Error(`Failed to delete invoice ${id}`);
  }
};

export const getInvoiceTypes = async (): Promise<InvoiceType[]> => {
  try {
    const response = await http.get<InvoiceTypesResponse>('admin/invoices/get-types');
    console.log('🔍 getInvoiceTypes response:', response.data);

    if (response.data?.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    console.warn('⚠️ No invoice types data found, returning empty array');
    return [];
  } catch (error: unknown) {
    console.error('Failed to fetch invoice types:', error);
    return [];
  }
};

// Client Services
export const getInvoiceClients = async (companyId?: number | null): Promise<Client[]> => {
  try {
    const params: Record<string, string | number> = {};
    if (companyId != null) params.company_id = companyId;
    const response = await http.get<ClientsResponse>('admin/invoices/get-clients', { params });

    if (response.data?.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    return [];
  } catch (error: unknown) {
    console.error('Failed to fetch clients:', error);
    return [];
  }
};

export const getInvoiceClient = async (id: number): Promise<Client> => {
  try {
    const response = await http.get<{ success: boolean; data: Client }>(`admin/invoices/clients/show/${id}`);

    if (response.data?.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Client not found');
  } catch (error: unknown) {
    console.error(`Failed to fetch client ${id}:`, error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || `Failed to fetch client ${id}`);
    }
    throw new Error(`Failed to fetch client ${id}`);
  }
};

export const createInvoiceClient = async (payload: StoreClientRequest): Promise<Client> => {
  try {
    const response = await http.post<{ success: boolean; message: string; data: Client }>(
      'admin/invoices/clients/store',
      payload
    );

    if (response.data?.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to create client');
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      const errors = error.response.data?.errors;
      if (errors) {
        const errorMessage = Object.entries(errors)
          .map(([field, messages]) => `${(messages as string[]).join(', ')}`)
          .join('\n');
        throw new Error(`${errorMessage}`);
      }
    }

    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to create client');
    }
    throw new Error('Failed to create client');
  }
};

export const updateInvoiceClient = async (id: number, payload: UpdateClientRequest): Promise<Client> => {
  try {
    const response = await http.put<{ success: boolean; message: string; data: Client }>(
      `admin/invoices/clients/update/${id}`,
      payload
    );

    if (response.data?.success && response.data.data) {
      return response.data.data;
    }

    throw new Error('Failed to update client');
  } catch (error: unknown) {
    console.error(`Failed to update client ${id}:`, error);

    if (axios.isAxiosError(error) && error.response?.status === 422) {
      const errors = error.response.data?.errors;
      if (errors) {
        const errorMessage = Object.entries(errors)
          .map(([field, messages]) => `${(messages as string[]).join(', ')}`)
          .join('\n');
        throw new Error(`${errorMessage}`);
      }
    }

    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || `Failed to update client ${id}`);
    }
    throw new Error(`Failed to update client ${id}`);
  }
};

export const deleteInvoiceClient = async (id: number): Promise<SuccessResponse> => {
  try {
    const response = await http.delete<SuccessResponse>(`admin/invoices/clients/delete/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Failed to delete client ${id}:`, error);
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || `Failed to delete client ${id}`);
    }
    throw new Error(`Failed to delete client ${id}`);
  }
};

export const getInvoiceData = async (): Promise<InvoiceData> => {
  try {
    const response = await http.get<InvoiceDataResponse>('admin/invoices/get-data', {
      params: { _t: Date.now() }
    });

    if (response.data?.success && response.data.data) {
      return response.data.data;
    }

    return {
      host_id: 1,
      invoice_code: 'INV-0000',
      clients: [],
      invoice_types: []
    };
  } catch (error: unknown) {
    console.error('Failed to fetch invoice data:', error);
    return {
      host_id: 1,
      invoice_code: 'INV-0000',
      clients: [],
      invoice_types: []
    };
  }
};

export const checkInvoiceCodeExists = async (code: string, excludeInvoiceId?: number, companyId?: number | null): Promise<boolean> => {
  try {
    const params = new URLSearchParams();
    params.append('code', code);
    if (excludeInvoiceId) params.append('exclude_id', String(excludeInvoiceId));
    if (companyId != null) params.append('company_id', String(companyId));

    const response = await http.get<{ success: boolean; exists: boolean }>('admin/invoices/check-code', { params });

    return response.data?.exists || false;
  } catch (error: unknown) {
    console.error('Failed to check invoice code:', error);
    // If the check fails, we should allow the submission to proceed
    // to avoid blocking users due to API errors
    return false;
  }
};

// Email Services
export interface SendInvoiceMailRequest {
  id: number;
  name: string;
  type: 'invoice' | 'receipt';
  email: string[];
  subject?: string;
  additional_info?: string;
  files?: File[];
  payment_link_enabled?: boolean;
}



export interface InvoiceMailResponse {
  success: boolean;
  message: string;
  invoice_id: number;
  emails: string[];
  status: string;
}

export const sendInvoiceEmail = async (payload: SendInvoiceMailRequest): Promise<InvoiceMailResponse> => {
  try {
    const formData = new FormData();

    formData.append('id', payload.id.toString());
    formData.append('name', payload.name);
    formData.append('type', payload.type);

    if (payload.payment_link_enabled !== undefined) {
      formData.append(
        'payment_link_enabled',
        payload.payment_link_enabled ? '1' : '0'
      );
    }

    payload.email.forEach((email, index) => {
      formData.append(`email[${index}]`, email);
    });

    if (payload.subject) {
      formData.append('subject', payload.subject);
    }

    if (payload.additional_info) {
      formData.append('additional_info', payload.additional_info);
    }

    if (payload.files && payload.files.length > 0) {
      payload.files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
    }

    const response = await http.post<{ data: InvoiceMailResponse }>('admin/invoices/send-email', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const responseData = response.data?.data || response.data;

    console.log(responseData);

    if (responseData && responseData.success === true) {
      const result: InvoiceMailResponse = {
        success: true,
        message: responseData.message || 'Email sent successfully',
        invoice_id: responseData.invoice_id || payload.id,
        emails: responseData.emails && responseData.emails.length > 0 ? responseData.emails : payload.email,
        status: responseData.status || 'Mail Sent'
      };

      return result;
    }

    throw new Error(responseData?.message || 'Failed to send email - API returned unsuccessful status');

  } catch (error: unknown) {
    console.error('Email sending error:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        const errors = error.response.data?.errors;
        if (errors) {
          const errorMessage = Object.entries(errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          throw new Error(`Validation failed: ${errorMessage}`);
        }
      }

      if (error.response?.data?.message) {
        const msg = error.response.data.message;
        // Stripe-specific amount limit — show user-friendly message
        if (msg.includes('total amount due must be no more than')) {
          throw new Error('Invoice amount exceeds Stripe\'s maximum limit of £999,999.99. Please disable the payment link or reduce the invoice amount.');
        }
        throw new Error(msg);
      }

      throw new Error(`Network error: ${error.message}`);
    }

    if (error instanceof Error) {
      throw new Error(`Email sending failed: ${error.message}`);
    }

    throw new Error('Failed to send email - Unknown error occurred');
  }
};

// PDF Generation Services
export const generateInvoicePDF = async (id: number, companyId?: number | null): Promise<Blob> => {
  try {
    const params: any = {};
    if (companyId !== undefined) {
      params.company_id = companyId;
      params.all_accounts_view = true;
    }

    const response = await http.get(`admin/invoices/${id}/pdf`, {
      responseType: 'blob',
      params,
      headers: {
        'Accept': 'application/pdf',
      },
    });

    return response.data;
  } catch (error: unknown) {
    console.error(`Failed to generate PDF for invoice ${id}:`, error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || `Failed to generate PDF for invoice ${id}`;
      throw new Error(errorMessage);
    }
    throw new Error(`Failed to generate PDF for invoice ${id}`);
  }
};

export const generateInvoiceReceiptPDF = async (id: number, companyId?: number | null): Promise<Blob> => {
  try {
    const params: any = {};
    if (companyId !== undefined) {
      params.company_id = companyId;
      params.all_accounts_view = true;
    }

    const response = await http.get(`admin/invoices/${id}/receipt`, {
      responseType: 'blob',
      params,
      headers: {
        'Accept': 'application/pdf',
      },
    });

    return response.data;
  } catch (error: unknown) {
    console.error(`Failed to generate receipt PDF for invoice ${id}:`, error);
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || `Failed to generate receipt PDF for invoice ${id}`;
      throw new Error(errorMessage);
    }
    throw new Error(`Failed to generate receipt PDF for invoice ${id}`);
  }
};

export const previewInvoicePDF = async (payload: StoreInvoiceRequest): Promise<Blob> => {
  try {
    console.log('Preview PDF payload being sent:', JSON.stringify(payload, null, 2));

    const response = await http.post('admin/invoices/preview', payload, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf',
        'Content-Type': 'application/json',
      },
    });

    if (response.data.type === 'application/pdf' || response.data instanceof Blob) {
      return response.data;
    }

    throw new Error('Invalid response format - expected PDF blob');

  } catch (error: unknown) {
    console.error('Failed to generate preview PDF:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors;
        if (errors) {
          const errorMessage = Object.entries(errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          throw new Error(`Validation failed: ${errorMessage}`);
        }
      }

      if (error.response?.status === 500) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Server error occurred while generating PDF preview');
          } catch {
            throw new Error('Server error occurred while generating PDF preview');
          }
        }
        throw new Error(error.response.data?.message || 'Server error occurred while generating PDF preview');
      }

      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }

      throw new Error(`HTTP ${error.response?.status}: Failed to generate preview PDF`);
    }

    if (error instanceof Error) {
      throw new Error(`Preview PDF generation failed: ${error.message}`);
    }

    throw new Error('Failed to generate preview PDF - Unknown error occurred');
  }
};

// Helper function to download blob as file
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const getInvoiceItemsForReuse = async (): Promise<InvoiceItem[]> => {
  try {
    const invoices = await getInvoices();

    const allItems: InvoiceItem[] = [];
    const seenItems = new Set<string>();

    invoices.forEach(invoice => {
      if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach(item => {
          const itemKey = `${item.name}-${item.type}-${item.price}-${item.currency}`;

          if (!seenItems.has(itemKey)) {
            seenItems.add(itemKey);
            const itemWithMeta = {
              ...item,
              invoice_reference: {
                id: invoice.id,
                code: invoice.code,
                client: invoice.client
              }
            };
            allItems.push(itemWithMeta);
          }
        });
      }
    });

    return allItems;
  } catch (error: unknown) {
    console.error('Failed to fetch reusable items:', error);
    return [];
  }
};

export const importMigrationCsv = async (file: File): Promise<{ success: boolean; message: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await http.post<{ success: boolean; message: string }>(
      'admin/invoices/migrate',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Increase timeout to 5 minutes for large migrations
        timeout: 300000,
      }
    );

    // Check for both HTTP 200/201 AND the success flag
    if ((response.status === 200 || response.status === 201) && response.data) {
      return {
        success: response.data.success ?? true,
        message: response.data.message || 'Migration completed'
      };
    }

    throw new Error('Server responded with an unexpected status');
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      // If the server took too long, it will be a timeout error
      if (error.code === 'ECONNABORTED') {
        throw new Error('Migration is taking a long time. Please check the dashboard in a few minutes.');
      }
      const errorMessage = error.response?.data?.message || 'Failed to process CSV file';
      throw new Error(errorMessage);
    }
    throw new Error('An unexpected error occurred during import');
  }
};