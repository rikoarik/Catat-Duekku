import { supabase } from '@/core/lib/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const configuredAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !configuredAnonKey) throw new Error('Konfigurasi Supabase belum lengkap. Atur EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY.');
const supabaseAnonKey: string = configuredAnonKey;
const baseUrl = `${supabaseUrl}/functions/v1/api/api/v1`;

export interface ApiMeta { request_id: string }
export interface ApiEnvelope<T> { data: T; meta: ApiMeta }
export interface ApiErrorBody { code: string; message: string; details: { field: string; reason: string }[] }

export class EdgeApiError extends Error {
  constructor(public status: number, public error: ApiErrorBody, public requestId?: string, public retryAfter?: number) {
    super(error.message);
    this.name = 'EdgeApiError';
  }
}

export const isNetworkOrUnavailable = (error: unknown) => error instanceof TypeError || error instanceof EdgeApiError && error.status === 503;
export const idempotencyKey = (scope: string) => `${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function request<T>(path: string, options: RequestInit & { version?: number; idempotencyKey?: string } = {}): Promise<ApiEnvelope<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new EdgeApiError(401, { code: 'AUTHENTICATION_REQUIRED', message: 'Sesi telah berakhir.', details: [] });
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  headers.set('apikey', supabaseAnonKey);
  headers.set('Accept', 'application/json');
  headers.set('X-Request-Id', requestId);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (options.version !== undefined) headers.set('If-Match', `"${options.version}"`);
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch {
    throw new TypeError('Tidak dapat terhubung ke server.');
  }
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | { error: ApiErrorBody; meta?: ApiMeta } | null;
  if (!response.ok) {
    const body = payload && 'error' in payload ? payload : null;
    const msg = response.status === 503
      ? 'Layanan sementara tidak tersedia (503 Service Temporarily Unavailable).'
      : body?.error?.message ?? 'Respons server tidak valid.';
    throw new EdgeApiError(response.status, body?.error ?? { code: 'INVALID_RESPONSE', message: msg, details: [] }, body?.meta?.request_id ?? requestId, Number(response.headers.get('retry-after')) || undefined);
  }
  if (!payload || !('data' in payload) || !payload.meta?.request_id) throw new EdgeApiError(502, { code: 'INVALID_RESPONSE', message: 'Respons server tidak valid.', details: [] }, requestId);
  return payload;
}

export interface Resource { id: string; version: number; created_at: string; updated_at: string }
export interface Profile extends Resource { email: string; full_name: string; timezone: string; theme_mode: 'system' | 'light' | 'dark'; cloud_sync_enabled: boolean; avatar_url?: string | null }
export interface Account extends Resource { name: string; kind: 'CASH' | 'BANK' | 'E_WALLET'; balance: number; is_default: boolean; account_number: string | null; icon: string | null }
export interface Category extends Resource { name: string; type: 'INCOME' | 'EXPENSE'; icon: string | null; color: string | null }
export interface Budget extends Resource { month: string; total_limit: number; used_amount: number; remaining_amount: number; percent_used: number; day_of_month: number; days_in_month: number; days_left: number }
export interface SavingGoal extends Resource { name: string; target_amount: number; target_date: string | null; saved_amount: number; remaining_amount: number; progress_percent: number; monthly_needed: number | null; status: string }
export interface Debt extends Resource { name: string; total_amount: number; paid_amount: number; remaining_amount: number; progress_percent: number; due_date: string | null; status: string; installment_plan: { tenor_months: number; monthly_amount: number; start_date: string; paid_installments: number; months_left: number; projected_payoff_date: string; next_due_date: string | null } }
export interface Summary { total_balance: number; total_income_month: number; total_expense_month: number; percentage_change: number | null; remaining_debt: number; recent_transactions: { id: string; type: 'INCOME' | 'EXPENSE'; amount: number; category_name: string | null; description: string | null; occurred_at: string }[] }
export interface AnalyticsOverview { period: '7m'; month_label: string; monthly_buckets: { month: string; label: string; income: number; expense: number; net_savings: number }[]; kpis: { income: number; expense: number; net_savings: number; income_change_percent: number | null; expense_change_percent: number | null }; category_slices: { label: string; amount: number; percentage: number; color: string }[]; quick_stats: { busiest_weekday: string | null; largest_category: string | null; quietest_week: number | null; expense_transaction_count: number }; insight: string | null }
export type ParserIntent = 'create_expense' | 'create_income' | 'create_account' | 'set_balance' | 'create_debt' | 'pay_debt' | 'create_goal' | 'deposit_goal' | 'withdraw_goal' | 'update_last_amount' | 'update_last_account' | 'undo_last' | 'get_summary' | 'unknown';
export interface ParserResponse { intent: ParserIntent; confidence: number; needs_confirmation: boolean; fields: { amount?: number | null; account_id?: string | null; account_name?: string | null; account_kind?: Account['kind'] | null; category_name?: string | null; description?: string | null; debt_name?: string | null; goal_name?: string | null; new_balance?: number | null }; reason?: string | null }
export interface ReceiptExtraction { merchant: string | null; total: number | null; date: string | null; suggested_category_id: string | null; suggested_category_name: string | null; suggested_account_id: string | null; suggested_account_name: string | null; description: string | null; confidence: number; needs_confirmation: true }
export interface ApiNotification { id: string; kind: 'Penting' | 'Keuangan' | 'Sistem'; title: string; message: string; action: string | null; created_at: string; read: boolean }
export interface NotificationList { items: ApiNotification[]; unread_count: number }

const json = (body: unknown) => JSON.stringify(body);
export const edgeApi = {
  getProfile: () => request<Profile>('/me/profile'),
  updateProfile: (body: Partial<Pick<Profile, 'full_name' | 'timezone' | 'theme_mode' | 'cloud_sync_enabled'>>, version: number) => request<Profile>('/me/profile', { method: 'PATCH', body: json(body), version }),
  reset: () => request<{ status: 'reset'; reset_at: string }>('/me/data', { method: 'DELETE', body: json({ confirmation: 'RESET' }) }),
  registerPushToken: (token: string, platform: 'android' | 'ios') => request<{ status: 'registered' }>('/me/push-tokens', { method: 'POST', body: json({ token, platform }), idempotencyKey: `push-${token}` }),
  unregisterPushToken: (token: string) => request<{ status: 'unregistered' }>('/me/push-tokens', { method: 'DELETE', body: json({ token }) }),
  sendTestPush: () => request<{ status: 'sent'; tickets: number }>('/me/push-test', { method: 'POST', idempotencyKey: idempotencyKey('push-test') }),
  accounts: () => request<Account[]>('/accounts'),
  createAccount: (body: { name: string; kind?: Account['kind']; opening_balance?: number }, key: string) => request<Account>('/accounts', { method: 'POST', body: json(body), idempotencyKey: key }),
  updateAccount: (id: string, name: string, version: number) => request<Account>(`/accounts/${encodeURIComponent(id)}`, { method: 'PATCH', body: json({ name }), version }),
  setAccountBalance: (id: string, balance: number, version: number, key: string) => request<Account>(`/accounts/${encodeURIComponent(id)}/balance`, { method: 'POST', body: json({ balance }), version, idempotencyKey: key }),
  deleteAccount: (id: string, version: number) => request<{ status: 'deleted' }>(`/accounts/${encodeURIComponent(id)}`, { method: 'DELETE', version }),
  categories: () => request<Category[]>('/categories'),
  createCategory: (body: { name: string; type?: Category['type'] }, key: string) => request<Category>('/categories', { method: 'POST', body: json(body), idempotencyKey: key }),
  updateCategory: (id: string, name: string, version: number) => request<Category>(`/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: json({ name }), version }),
  deleteCategory: (id: string, version: number) => request<{ status: 'deleted' }>(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE', version }),
  budget: () => request<Budget | null>('/budgets/current'),
  upsertBudget: (total_limit: number, version?: number) => request<Budget>('/budgets/current', { method: 'PUT', body: json({ total_limit }), version: version ?? 0 }),
  goals: () => request<SavingGoal[]>('/saving-goals'),
  createGoal: (body: { name: string; target_amount: number; target_date?: string | null }, key: string) => request<SavingGoal>('/saving-goals', { method: 'POST', body: json(body), idempotencyKey: key }),
  debts: () => request<Debt[]>('/debts'),
  createDebt: (body: { name: string; total_amount: number; tenor_months: number; paid_installments: number; start_date: string }, key: string) => request<Debt>('/debts', { method: 'POST', body: json(body), idempotencyKey: key }),
  createTransaction: (body: { type: 'INCOME' | 'EXPENSE'; amount: number; account_id: string; category_name?: string | null; description?: string | null; note?: string | null; occurred_at?: string; source?: 'MANUAL' | 'PARSER' | 'RECEIPT' }, key: string) => request<unknown>('/transactions', { method: 'POST', body: json(body), idempotencyKey: key }),
  summary: () => request<Summary>('/summary'),
  analytics: (period: '7m' | '3m' | '1m' = '7m') => request<AnalyticsOverview>(`/analytics/overview?period=${period}`),
  parseInput: (input: string) => request<ParserResponse>('/parser', { method: 'POST', body: json({ input }) }),
  parseImage: (image_base64: string) => request<ParserResponse>('/parser/image', { method: 'POST', body: json({ image_base64 }) }),
  notifications: () => request<NotificationList>('/notifications'),
  markNotificationRead: (id: string) => request<{ status: 'read' }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<{ status: 'read'; count: number }>('/notifications/read-all', { method: 'POST' }),
  extractReceipt: (body: { image_uri: string }) => request<ReceiptExtraction>('/receipts/extractions', { method: 'POST', body: json(body), idempotencyKey: idempotencyKey('receipt') }),
};
