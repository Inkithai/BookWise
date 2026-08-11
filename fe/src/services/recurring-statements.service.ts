import { http } from '@/services/service';

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringStatement {
  id: number;
  host_id: number;
  client_id: number | null;
  title: string;
  frequency: RecurringFrequency;
  amount: string | number | null;
  currency: string;
  pdf_type: string;
  next_run_at: string;
  last_run_at: string | null;
  is_active: boolean;
  notes: string | null;
  client?: { id: number; name: string; email?: string | null };
}

export type RecurringStatementPayload = {
  title: string;
  frequency: RecurringFrequency;
  next_run_at: string;
  client_id?: number | null;
  amount?: number | null;
  currency?: string;
  pdf_type?: string;
  is_active?: boolean;
  notes?: string | null;
  host_id?: number;
};

export async function listRecurringStatements(hostId?: number): Promise<RecurringStatement[]> {
  const params = hostId ? { host_id: hostId } : {};
  const { data } = await http.get<{ success: boolean; data: RecurringStatement[] }>(
    'admin/invoices/recurring-statements',
    { params },
  );
  return data.data ?? [];
}

export async function createRecurringStatement(
  payload: RecurringStatementPayload,
): Promise<RecurringStatement> {
  const { data } = await http.post<{ success: boolean; data: RecurringStatement }>(
    'admin/invoices/recurring-statements',
    payload,
  );
  return data.data;
}

export async function updateRecurringStatement(
  id: number,
  payload: Partial<RecurringStatementPayload>,
): Promise<RecurringStatement> {
  const { data } = await http.put<{ success: boolean; data: RecurringStatement }>(
    `admin/invoices/recurring-statements/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteRecurringStatement(id: number, hostId?: number): Promise<void> {
  const params = hostId ? { host_id: hostId } : {};
  await http.delete(`admin/invoices/recurring-statements/${id}`, { params });
}
