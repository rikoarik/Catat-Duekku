import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.7';
import { ApiError, canonicalJson, exact, extractProviderJson, idempotencyKey, integer, isoDate, isoTimestamp, jpegBase64, money, nullableText, object, oneOf, optionalVersion, routeKey, text, validateChatProvider, validateInsightProvider, validateParserProvider } from './helpers.ts';
const origins = new Set((Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '').split(',').map((v) => v.trim()).filter(Boolean));
const cors = (req: Request): Record<string, string> => { const origin = req.headers.get('origin'); return origin && origins.has(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'authorization,apikey,x-client-info,content-type,idempotency-key,if-match,x-request-id', vary: 'Origin' } : {}; };
const reply = (req: Request, id: string, status: number, data?: unknown, error?: ApiError) => Response.json(error ? { error: { code: error.code, message: error.message, details: error.details }, meta: { request_id: id } } : { data, meta: { request_id: id } }, { status, headers: { ...cors(req), 'cache-control': 'no-store', ...(error?.retryAfter ? { 'retry-after': String(error.retryAfter) } : {}) } });
async function body(req: Request) { if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json.'); try {
    return object(await req.json());
}
catch (e) {
    if (e instanceof ApiError)
        throw e;
    throw new ApiError(400, 'INVALID_JSON', 'Request body is invalid JSON.');
} }
const hash = async (v: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))), b => b.toString(16).padStart(2, '0')).join('');
const db = <T>(r: {
    data: T | null;
    error: unknown;
}) => { if (r.error)
    throw r.error; if (r.data == null)
    throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.', [], 2); return r.data; };
const base = (r: any) => ({ id: r.id, version: r.version, created_at: r.created_at, updated_at: r.updated_at });
const account = (r: any) => ({ ...base(r), name: r.name, kind: r.kind, balance: r.balance, is_default: r.is_default, account_number: r.account_number, icon: r.icon });
const category = (r: any) => ({ ...base(r), name: r.name, type: r.type, icon: r.icon, color: r.color });
const goal = (r: any) => { const remaining = Math.max(0, r.target_amount - r.saved_amount); const months = r.target_date ? Math.max(1, Math.ceil((new Date(r.target_date).getTime() - Date.now()) / 2629800000)) : null; return { ...base(r), name: r.name, target_amount: r.target_amount, target_date: r.target_date, saved_amount: r.saved_amount, remaining_amount: remaining, progress_percent: r.target_amount ? 100 * r.saved_amount / r.target_amount : 0, monthly_needed: months ? Math.ceil(remaining / months) : null, status: r.saved_amount >= r.target_amount ? 'achieved' : r.target_date && r.target_date < new Date().toISOString().slice(0, 10) ? 'overdue' : 'active' }; };
const debt = (r: any) => ({ ...base(r), name: r.name, total_amount: r.total_amount, paid_amount: r.paid_amount, remaining_amount: r.total_amount - r.paid_amount, progress_percent: 100 * r.paid_amount / r.total_amount, due_date: r.due_date, status: r.paid_amount >= r.total_amount ? 'paid' : 'active', installment_plan: { tenor_months: r.tenor_months, monthly_amount: r.monthly_amount, start_date: r.start_date, paid_installments: r.paid_installments, months_left: Math.max(0, r.tenor_months - r.paid_installments), projected_payoff_date: r.due_date, next_due_date: r.paid_installments >= r.tenor_months ? null : new Date(new Date(r.start_date).setUTCMonth(new Date(r.start_date).getUTCMonth() + r.paid_installments)).toISOString().slice(0, 10) } });
const transaction = (r: any) => ({ ...base(r), type: r.type, amount: r.amount, account_id: r.account_id, category_id: r.category_id, category_name: r.category_name, description: r.description, note: r.note, occurred_at: r.occurred_at, source: r.source, resulting_balance: r.resulting_balance });
async function list(c: SupabaseClient, t: string, order = 'created_at') { const r = await c.from(t).select('*').is('deleted_at', null).order(order, { ascending: false }); if (r.error)
    throw r.error; return r.data; }
async function analyticsInsight(overview: any) { const apiKey = Deno.env.get('ARKLABS_API_KEY'); if (!apiKey)
    return overview; try {
    const response = await fetch('https://api.arklabs.biz.id/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'catat', temperature: 0, stream: false, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Buat satu insight keuangan pribadi yang singkat, spesifik, suportif, dan dapat ditindaklanjuti dalam Bahasa Indonesia. Gunakan hanya agregat yang diberikan. Jangan mengarang angka. Return JSON only: {"insight":string}.' }, { role: 'user', content: JSON.stringify({ kpis: overview.kpis, category_slices: overview.category_slices, quick_stats: overview.quick_stats, monthly_buckets: Array.isArray(overview.monthly_buckets) ? overview.monthly_buckets.slice(-2) : [] }) }] }) });
    if (!response.ok)
        return overview;
    const envelope = object(await response.json());
    if (!Array.isArray(envelope.choices) || envelope.choices.length !== 1)
        return overview;
    const choice = object(envelope.choices[0]);
    const message = object(choice.message);
    return { ...overview, ...validateInsightProvider(extractProviderJson(message.content, 1000)) };
}
catch {
    return overview;
} }
async function execute(req: Request, c: SupabaseClient, path: string, url: URL): Promise<{
    data: unknown;
    status: number;
}> {
    const key = routeKey(req.method, path);
    if (key === 'GET /api/v1/me/profile') {
        const [profile, user] = await Promise.all([c.from('profiles').select('*').single(), c.auth.getUser()]);
        const r = db(profile);
        return { status: 200, data: { ...base({ ...r, id: r.user_id }), email: user.data.user?.email ?? '', full_name: r.full_name, timezone: r.timezone, theme_mode: r.theme_mode, cloud_sync_enabled: r.cloud_sync_enabled } };
    }
    if (key === 'PATCH /api/v1/me/profile') {
        const v = await body(req);
        exact(v, ['full_name', 'timezone', 'theme_mode', 'cloud_sync_enabled']);
        if (!Object.keys(v).length)
            throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.');
        if ('cloud_sync_enabled' in v && typeof v.cloud_sync_enabled !== 'boolean')
            throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: 'cloud_sync_enabled', reason: 'must be boolean' }]);
        const user = (await c.auth.getUser()).data.user!;
        const r = db(await c.rpc('update_my_profile', { p_full_name: 'full_name' in v ? text(v, 'full_name') : null, p_timezone: 'timezone' in v ? text(v, 'timezone', 64) : null, p_theme_mode: 'theme_mode' in v ? oneOf(v, 'theme_mode', ['system', 'light', 'dark']) : null, p_cloud_sync_enabled: 'cloud_sync_enabled' in v ? v.cloud_sync_enabled : null, p_expected_version: optionalVersion(req) ?? null }));
        return { status: 200, data: { ...base({ ...r, id: r.user_id }), email: user.email ?? '', full_name: r.full_name, timezone: r.timezone, theme_mode: r.theme_mode, cloud_sync_enabled: r.cloud_sync_enabled } };
    }
    if (key === 'GET /api/v1/accounts')
        return { status: 200, data: (await list(c, 'accounts')).map(account) };
    if (key === 'POST /api/v1/accounts') {
        const v = await body(req);
        exact(v, ['name', 'kind', 'opening_balance', 'is_default', 'account_number', 'icon']);
        const r = db(await c.rpc('create_account', { p_name: text(v, 'name'), p_kind: oneOf(v, 'kind', ['CASH', 'BANK', 'E_WALLET', 'INVESTMENT'], 'BANK'), p_opening_balance: 'opening_balance' in v ? money(v, 'opening_balance', true) : 0, p_is_default: v.is_default === true, p_account_number: nullableText(v, 'account_number', 64) ?? null, p_icon: nullableText(v, 'icon', 64) ?? null }));
        return { status: 201, data: account(r) };
    }
    const accountBalanceRoute = path.match(/^\/api\/v1\/accounts\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/balance$/i);
    if (req.method === 'POST' && accountBalanceRoute) {
        const v = await body(req);
        exact(v, ['balance']);
        const expected = optionalVersion(req);
        if (expected === undefined)
            throw new ApiError(428, 'VERSION_REQUIRED', 'If-Match is required.');
        return { status: 200, data: account(db(await c.rpc('set_account_balance', { p_id: accountBalanceRoute[1], p_balance: money(v, 'balance', true), p_expected_version: expected }))) };
    }
    const accountRoute = path.match(/^\/api\/v1\/accounts\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (req.method === 'PATCH' && accountRoute) {
        const v = await body(req);
        exact(v, ['name', 'kind', 'is_default', 'account_number', 'icon']);
        const expected = optionalVersion(req);
        if (expected === undefined)
            throw new ApiError(428, 'VERSION_REQUIRED', 'If-Match is required.');
        if (typeof v.is_default !== 'boolean')
            throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: 'is_default', reason: 'must be boolean' }]);
        return { status: 200, data: account(db(await c.rpc('update_account', { p_id: accountRoute[1], p_name: text(v, 'name'), p_kind: oneOf(v, 'kind', ['CASH', 'BANK', 'E_WALLET', 'INVESTMENT']), p_is_default: v.is_default, p_account_number: nullableText(v, 'account_number', 64) ?? null, p_icon: nullableText(v, 'icon', 64) ?? null, p_expected_version: expected }))) };
    }
    if (req.method === 'DELETE' && accountRoute) {
        const result = await c.rpc('delete_account', { p_id: accountRoute[1], p_expected_version: optionalVersion(req) ?? null });
        if (result.error)
            throw result.error;
        return { status: 200, data: { status: 'deleted' } };
    }
    if (key === 'GET /api/v1/categories')
        return { status: 200, data: (await list(c, 'categories')).map(category) };
    if (key === 'POST /api/v1/categories') {
        const v = await body(req);
        exact(v, ['name', 'type', 'icon', 'color']);
        const color = nullableText(v, 'color', 7) ?? null;
        if (color && !/^#[0-9a-f]{6}$/i.test(color))
            throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: 'color', reason: 'invalid color' }]);
        return { status: 201, data: category(db(await c.rpc('create_category', { p_name: text(v, 'name'), p_type: oneOf(v, 'type', ['INCOME', 'EXPENSE'], 'EXPENSE'), p_icon: nullableText(v, 'icon', 64) ?? null, p_color: color }))) };
    }
    const categoryRoute = path.match(/^\/api\/v1\/categories\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (req.method === 'PATCH' && categoryRoute) {
        const v = await body(req);
        exact(v, ['name']);
        const expected = optionalVersion(req);
        if (expected === undefined)
            throw new ApiError(428, 'VERSION_REQUIRED', 'If-Match is required.');
        return { status: 200, data: category(db(await c.rpc('update_category', { p_id: categoryRoute[1], p_name: text(v, 'name'), p_expected_version: expected }))) };
    }
    if (req.method === 'DELETE' && categoryRoute) {
        const result = await c.rpc('delete_category', { p_id: categoryRoute[1], p_expected_version: optionalVersion(req) ?? null });
        if (result.error)
            throw result.error;
        return { status: 200, data: { status: 'deleted' } };
    }
    if (key === 'GET /api/v1/saving-goals')
        return { status: 200, data: (await list(c, 'saving_goals')).map(goal) };
    if (key === 'POST /api/v1/saving-goals') {
        const v = await body(req);
        exact(v, ['name', 'target_amount', 'target_date']);
        return { status: 201, data: goal(db(await c.rpc('create_saving_goal', { p_name: text(v, 'name'), p_target_amount: money(v, 'target_amount'), p_target_date: 'target_date' in v && v.target_date !== null ? isoDate(v, 'target_date') : null }))) };
    }
    const savingMutationRoute = path.match(/^\/api\/v1\/saving-goals\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/mutations$/i);
    if (req.method === 'GET' && savingMutationRoute) {
        const result = await c.from('saving_goal_mutations').select('id,goal_id,kind,amount,note,occurred_at,created_at').eq('goal_id', savingMutationRoute[1]).order('occurred_at', { ascending: false });
        if (result.error)
            throw result.error;
        return { status: 200, data: result.data };
    }
    if (req.method === 'POST' && savingMutationRoute) {
        const v = await body(req);
        exact(v, ['kind', 'amount', 'note', 'occurred_at']);
        const expected = optionalVersion(req);
        if (expected === undefined)
            throw new ApiError(428, 'VERSION_REQUIRED', 'If-Match is required.');
        const result = await c.rpc('record_saving_goal_mutation', { p_goal_id: savingMutationRoute[1], p_kind: oneOf(v, 'kind', ['DEPOSIT', 'WITHDRAWAL']), p_amount: money(v, 'amount'), p_note: nullableText(v, 'note', 500) ?? null, p_occurred_at: 'occurred_at' in v ? isoTimestamp(v, 'occurred_at') : null, p_expected_version: expected });
        return { status: 201, data: db(result) };
    }
    const savingGoalRoute = path.match(/^\/api\/v1\/saving-goals\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (req.method === 'PATCH' && savingGoalRoute) {
        const v = await body(req);
        exact(v, ['name', 'target_amount', 'target_date']);
        const expected = optionalVersion(req);
        if (expected === undefined)
            throw new ApiError(428, 'VERSION_REQUIRED', 'If-Match is required.');
        const goalRow = await c.from('saving_goals').update({ name: text(v, 'name'), target_amount: money(v, 'target_amount'), target_date: 'target_date' in v && v.target_date !== null ? isoDate(v, 'target_date') : null }).eq('id', savingGoalRoute[1]).eq('user_id', (await c.auth.getUser()).data.user!.id).eq('version', expected).is('deleted_at', null).select('*').single();
        if (goalRow.error)
            throw goalRow.error;
        if (!goalRow.data)
            throw new ApiError(409, 'VERSION_CONFLICT', 'Data telah berubah. Muat ulang lalu coba lagi.');
        return { status: 200, data: goal(goalRow.data) };
    }
    if (req.method === 'DELETE' && savingGoalRoute) {
        const expected = optionalVersion(req);
        if (expected === undefined)
            throw new ApiError(428, 'VERSION_REQUIRED', 'If-Match is required.');
        const deleted = await c.from('saving_goals').update({ deleted_at: new Date().toISOString() }).eq('id', savingGoalRoute[1]).eq('user_id', (await c.auth.getUser()).data.user!.id).eq('version', expected).is('deleted_at', null).select('id').single();
        if (deleted.error)
            throw deleted.error;
        if (!deleted.data)
            throw new ApiError(409, 'VERSION_CONFLICT', 'Data telah berubah. Muat ulang lalu coba lagi.');
        return { status: 200, data: { status: 'deleted' } };
    }
    if (key === 'GET /api/v1/debts')
        return { status: 200, data: (await list(c, 'debts')).map(debt) };
    if (key === 'POST /api/v1/debts') {
        const v = await body(req);
        exact(v, ['name', 'total_amount', 'tenor_months', 'paid_installments', 'start_date']);
        return { status: 201, data: debt(db(await c.rpc('create_debt', { p_name: text(v, 'name'), p_total_amount: money(v, 'total_amount'), p_tenor_months: integer(v, 'tenor_months', 1, 600), p_paid_installments: integer(v, 'paid_installments', 0, integer(v, 'tenor_months', 1, 600), 0), p_start_date: isoDate(v, 'start_date') }))) };
    }
    const debtPaymentRoute = path.match(/^\/api\/v1\/debts\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/payments$/i);
    if (req.method === 'GET' && debtPaymentRoute) {
        const result = await c.from('debt_payments').select('id,debt_id,account_id,amount,note,occurred_at,created_at').eq('debt_id', debtPaymentRoute[1]).order('occurred_at', { ascending: false });
        if (result.error)
            throw result.error;
        return { status: 200, data: result.data };
    }
    if (req.method === 'POST' && debtPaymentRoute)
        throw new ApiError(410, 'LEGACY_DEBT_PAYMENT_DISABLED', 'Gunakan pembayaran hutang dengan rekening sumber.');
    const debtRoute = path.match(/^\/api\/v1\/debts\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (req.method === 'PATCH' && debtRoute) {
        const v = await body(req);
        exact(v, ['name', 'total_amount', 'tenor_months', 'start_date']);
        const expected = optionalVersion(req);
        if (expected === undefined)
            throw new ApiError(428, 'VERSION_REQUIRED', 'If-Match is required.');
        const debtRow = db(await c.rpc('update_debt', { p_id: debtRoute[1], p_name: text(v, 'name'), p_total_amount: money(v, 'total_amount'), p_tenor_months: integer(v, 'tenor_months', 1, 600), p_start_date: isoDate(v, 'start_date'), p_expected_version: expected }));
        return { status: 200, data: debt(debtRow) };
    }
    if (req.method === 'DELETE' && debtRoute) {
        const expected = optionalVersion(req);
        if (expected === undefined)
            throw new ApiError(428, 'VERSION_REQUIRED', 'If-Match is required.');
        const deleted = await c.from('debts').update({ deleted_at: new Date().toISOString() }).eq('id', debtRoute[1]).eq('user_id', (await c.auth.getUser()).data.user!.id).eq('version', expected).is('deleted_at', null).select('id').single();
        if (deleted.error)
            throw deleted.error;
        if (!deleted.data)
            throw new ApiError(409, 'VERSION_CONFLICT', 'Data telah berubah. Muat ulang lalu coba lagi.');
        return { status: 200, data: { status: 'deleted' } };
    }
    if (key === 'GET /api/v1/budgets/current')
        return { status: 200, data: db(await c.rpc('get_current_budget')) };
    if (key === 'PUT /api/v1/budgets/current') {
        const v = await body(req);
        exact(v, ['total_limit']);
        db(await c.rpc('upsert_current_budget', { p_total_limit: money(v, 'total_limit'), p_expected_version: optionalVersion(req) ?? null }));
        return { status: 200, data: db(await c.rpc('get_current_budget')) };
    }
    if (key === 'POST /api/v1/transactions') {
        const v = await body(req);
        exact(v, ['type', 'amount', 'account_id', 'category_id', 'category_name', 'description', 'note', 'occurred_at', 'source']);
        const r = db(await c.rpc('create_money_transaction', { p_account_id: text(v, 'account_id', 36), p_type: oneOf(v, 'type', ['INCOME', 'EXPENSE']), p_amount: money(v, 'amount'), p_category_id: nullableText(v, 'category_id', 36) ?? null, p_category_name: nullableText(v, 'category_name', 100) ?? null, p_description: nullableText(v, 'description', 500) ?? null, p_note: nullableText(v, 'note', 500) ?? null, p_occurred_at: isoTimestamp(v, 'occurred_at', new Date().toISOString()), p_source: oneOf(v, 'source', ['MANUAL', 'PARSER', 'RECEIPT'], 'MANUAL') }));
        return { status: 201, data: transaction(r) };
    }
    if (key === 'POST /api/v1/parser') {
        const v = await body(req);
        exact(v, ['input']);
        const input = text(v, 'input', 500)!;
        const apiKey = Deno.env.get('ARKLABS_API_KEY');
        if (!apiKey)
            throw new ApiError(503, 'AI_NOT_CONFIGURED', 'AI provider is not configured.');
        const [accounts, categories] = await Promise.all([list(c, 'accounts'), list(c, 'categories')]);
        let response: Response;
        try {
            response = await fetch('https://api.arklabs.biz.id/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'catat', temperature: 0, stream: false, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: `Return JSON only for an Indonesian personal-finance parser. Supported intents: create_expense, create_income, create_account, set_balance, create_debt, pay_debt, create_goal, deposit_goal, withdraw_goal, update_last_amount, update_last_account, undo_last, get_summary, unknown. Shape: {"intent":string,"confidence":number,"fields":{"amount":number|null,"account_name":string|null,"account_kind":"CASH"|"BANK"|"E_WALLET"|"INVESTMENT"|null,"category_name":string|null,"description":string|null,"debt_name":string|null,"goal_name":string|null,"new_balance":number|null},"reason":string|null}. A named bank, e-wallet, cash account, or account balance not matching Available accounts must use create_account with account_name, account_kind, and new_balance. A balance correction matching an Available account must use set_balance. Available accounts: ${JSON.stringify(accounts.map((a: any) => a.name))}. Available categories: ${JSON.stringify(categories.map((x: any) => x.name))}. Never return IDs.` }, { role: 'user', content: input }] }) });
        }
        catch {
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider failed.');
        }
        if (!response.ok)
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider failed.');
        let parsed: unknown;
        try {
            const envelope = object(await response.json());
            const choices = envelope.choices;
            if (!Array.isArray(choices) || choices.length !== 1)
                throw new Error();
            const choice = object(choices[0]);
            const message = object(choice.message);
            parsed = extractProviderJson(message.content);
        }
        catch {
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider returned an invalid response.');
        }
        return { status: 200, data: validateParserProvider(parsed, accounts, categories) };
    }
    if (key === 'POST /api/v1/parser/image') {
        const v = await body(req);
        exact(v, ['image_base64']);
        const image = jpegBase64(v.image_base64);
        const apiKey = Deno.env.get('ARKLABS_API_KEY');
        if (!apiKey)
            throw new ApiError(503, 'AI_NOT_CONFIGURED', 'AI provider is not configured.');
        const [accounts, categories] = await Promise.all([list(c, 'accounts'), list(c, 'categories')]);
        let response: Response;
        try {
            response = await fetch('https://api.arklabs.biz.id/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'catat', temperature: 0, stream: false, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: `Return JSON only for an Indonesian personal-finance parser based on the image. Supported intents: create_expense, create_income, create_account, set_balance, create_debt, pay_debt, create_goal, deposit_goal, withdraw_goal, update_last_amount, update_last_account, undo_last, get_summary, unknown. Every schema key is required. Shape: {"intent":string,"confidence":number,"fields":{"amount":number|null,"account_name":string|null,"account_kind":"CASH"|"BANK"|"E_WALLET"|"INVESTMENT"|null,"category_name":string|null,"description":string|null,"debt_name":string|null,"goal_name":string|null,"new_balance":number|null},"reason":string|null}. For unknown, non-financial, or unreadable images return exactly {"intent":"unknown","confidence":0,"fields":{"amount":null,"account_name":null,"account_kind":null,"category_name":null,"description":null,"debt_name":null,"goal_name":null,"new_balance":null},"reason":null}. A named bank, e-wallet, cash account, or account balance not matching Available accounts must use create_account with account_name, account_kind, and new_balance. A balance correction matching an Available account must use set_balance. Available accounts: ${JSON.stringify(accounts.map((a: any) => a.name))}. Available categories: ${JSON.stringify(categories.map((x: any) => x.name))}. Never return IDs.` }, { role: 'user', content: [{ type: 'text', text: 'Parse the actionable personal-finance intent visible in this image.' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}`, detail: 'high' } }] }] }) });
        }
        catch {
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider failed.');
        }
        if (!response.ok)
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider failed.');
        let parsed: unknown;
        try {
            const envelope = object(await response.json());
            const choices = envelope.choices;
            if (!Array.isArray(choices) || choices.length !== 1)
                throw new Error();
            const message = object(object(choices[0]).message);
            parsed = extractProviderJson(message.content);
        }
        catch {
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider returned an invalid response.');
        }
        return { status: 200, data: validateParserProvider(parsed, accounts, categories) };
    }
    if (key === 'POST /api/v1/receipts/extractions')
        throw new ApiError(503, 'RECEIPT_EXTRACTION_BLOCKED', 'Receipt extraction is unavailable until a provider and private storage are configured.');
    if (key === 'POST /api/v1/me/push-tokens') {
        const v = await body(req);
        exact(v, ['token', 'platform']);
        const token = text(v, 'token', 200)!;
        if (!/^(?:Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/.test(token))
            throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: 'token', reason: 'invalid Expo push token' }]);
        const registered = await c.rpc('register_push_token', { p_token: token, p_platform: oneOf(v, 'platform', ['android', 'ios']) });
        if (registered.error)
            throw registered.error;
        return { status: 201, data: { status: 'registered' } };
    }
    if (key === 'DELETE /api/v1/me/push-tokens') {
        const v = await body(req);
        exact(v, ['token']);
        const unregistered = await c.rpc('unregister_push_token', { p_token: text(v, 'token', 200) });
        if (unregistered.error)
            throw unregistered.error;
        return { status: 200, data: { status: 'unregistered' } };
    }
    if (key === 'POST /api/v1/me/push-test') {
        const tokens = db(await c.rpc('get_my_push_tokens'));
        if (!Array.isArray(tokens) || !tokens.length)
            throw new ApiError(409, 'PUSH_TOKEN_NOT_REGISTERED', 'No push-enabled device is registered.');
        const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, body: JSON.stringify(tokens.map((to: string) => ({ to, title: 'Notifikasi aktif', body: 'Pengingat keuangan Catat Duekku siap digunakan.', sound: 'default', channelId: 'keuangan', data: { url: '/notifications' } }))) });
        if (!response.ok)
            throw new ApiError(503, 'PUSH_PROVIDER_UNAVAILABLE', 'Push provider is temporarily unavailable.', [], 2);
        return { status: 200, data: { status: 'sent', tickets: tokens.length } };
    }
    if (key === 'GET /api/v1/notifications')
        return { status: 200, data: db(await c.rpc('get_my_notifications', { p_limit: 100 })) };
    if (key === 'POST /api/v1/notifications/read-all') {
        const count = db(await c.rpc('mark_all_notifications_read'));
        return { status: 200, data: { status: 'read', count } };
    }
    const notificationRead = path.match(/^\/api\/v1\/notifications\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/read$/i);
    if (req.method === 'POST' && notificationRead) {
        const found = db(await c.rpc('mark_notification_read', { p_id: notificationRead[1] }));
        if (!found)
            throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Notification not found.');
        return { status: 200, data: { status: 'read' } };
    }
    if (key === 'DELETE /api/v1/me/data') {
        const v = await body(req);
        exact(v, ['confirmation']);
        if (v.confirmation !== 'RESET')
            throw new ApiError(422, 'RESET_CONFIRMATION_REQUIRED', 'Reset confirmation is required.', [{ field: 'confirmation', reason: 'must equal RESET' }]);
        const reset = db(await c.rpc('reset_my_data'));
        return { status: 200, data: { status: 'reset', reset_at: reset } };
    }
    if (key === 'GET /api/v1/summary')
        return { status: 200, data: db(await c.rpc('get_financial_summary')) };
    if (key === 'POST /api/v1/analytics/chat') {
        if (!idempotencyKey(req))
            throw new ApiError(400, 'INVALID_REQUEST', 'Idempotency-Key is required.');
        const v = await body(req);
        exact(v, ['question']);
        const question = text(v, 'question', 300)!;
        const apiKey = Deno.env.get('ARKLABS_API_KEY');
        if (!apiKey)
            throw new ApiError(503, 'AI_NOT_CONFIGURED', 'AI provider is not configured.');
        const [summary, analytics] = await Promise.all([c.rpc('get_financial_summary'), c.rpc('get_analytics_overview')]);
        const summaryData = db(summary) as any;
        const analyticsData = db(analytics) as any;
        let response: Response;
        try {
            response = await fetch('https://api.arklabs.biz.id/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'catat', temperature: 0, stream: false, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Jawab pertanyaan keuangan pengguna dalam Bahasa Indonesia secara singkat, jelas, suportif, dan dapat ditindaklanjuti. Gunakan hanya agregat aplikasi yang diberikan. Jangan mengarang angka atau mengaku melihat data yang tidak tersedia. Jika konteks tidak cukup, katakan dengan jujur. Jangan memberi kepastian hukum, pajak, kredit, atau investasi. Return JSON only: {"answer":string}.' }, { role: 'user', content: JSON.stringify({ question, context: { summary: { total_balance: summaryData.total_balance, total_income_month: summaryData.total_income_month, total_expense_month: summaryData.total_expense_month, percentage_change: summaryData.percentage_change, remaining_debt: summaryData.remaining_debt }, analytics: { period: analyticsData.period, month_label: analyticsData.month_label, monthly_buckets: analyticsData.monthly_buckets, kpis: analyticsData.kpis, category_slices: analyticsData.category_slices, quick_stats: analyticsData.quick_stats } } }) }] }) });
        }
        catch {
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider failed.');
        }
        if (!response.ok)
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider failed.');
        try {
            const envelope = object(await response.json());
            if (!Array.isArray(envelope.choices) || envelope.choices.length !== 1)
                throw new Error();
            const message = object(object(envelope.choices[0]).message);
            return { status: 200, data: validateChatProvider(extractProviderJson(message.content, 1000)) };
        }
        catch {
            throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider returned an invalid response.');
        }
    }
    if (key === 'GET /api/v1/analytics/overview') {
        if ((url.searchParams.get('period') ?? '7m') !== '7m')
            throw new ApiError(422, 'UNSUPPORTED_ANALYTICS_PERIOD', 'Only period 7m is supported.', [{ field: 'period', reason: 'must equal 7m' }]);
        return { status: 200, data: await analyticsInsight(db(await c.rpc('get_analytics_overview'))) };
    }
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
}
Deno.serve(async (req) => { const id = req.headers.get('x-request-id')?.slice(0, 128) || crypto.randomUUID(); let claimed: {
    method: string;
    path: string;
    key: string;
} | undefined; let client: SupabaseClient | undefined; try {
    if (req.headers.get('origin') && !origins.has(req.headers.get('origin')!))
        throw new ApiError(403, 'INVALID_REQUEST', 'Origin is not allowed.');
    if (req.method === 'OPTIONS')
        return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url);
    const match = url.pathname.match(/\/api\/v1(?:\/.*)?$/);
    if (!match)
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    const path = match[0].replace(/\/$/, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL'), anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey)
        throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.', [], 2);
    client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get('authorization') ?? '' } }, auth: { persistSession: false, autoRefreshToken: false } });
    const user = await client.auth.getUser();
    if (user.error || !user.data.user)
        throw new ApiError(401, 'AUTHENTICATION_INVALID', 'Authentication is invalid.');
    const rate = db(await client.rpc('consume_api_rate_limit', { p_route: routeKey(req.method, path) }));
    if (!rate.allowed)
        throw new ApiError(429, 'RATE_LIMITED', 'Rate limit exceeded.', [], rate.retry_after);
    const key = req.method === 'POST' ? idempotencyKey(req) : null;
    if (key) {
        const raw = await req.clone().text();
        let canonical = raw;
        try {
            canonical = canonicalJson(JSON.parse(raw));
        }
        catch { }
        const requestHash = await hash(`${req.method}:${path}:${canonical}`);
        const claim = db(await client.rpc('claim_idempotency', { p_method: req.method, p_path: path, p_key: key, p_hash: requestHash }));
        if (claim.state === 'complete')
            return reply(req, id, claim.status, claim.response);
        claimed = { method: req.method, path, key };
    }
    const result = await execute(req, client, path, url);
    if (claimed)
        db(await client.rpc('finalize_idempotency', { p_method: claimed.method, p_path: claimed.path, p_key: claimed.key, p_status: result.status, p_response: result.data }));
    return reply(req, id, result.status, result.data);
}
catch (e) {
    if (claimed && client)
        await client.rpc('release_idempotency', { p_method: claimed.method, p_path: claimed.path, p_key: claimed.key });
    const message = e instanceof Error ? e.message : '';
    const mapped = e instanceof ApiError ? e : message === 'RATE_LIMITED' ? new ApiError(429, 'RATE_LIMITED', 'Rate limit exceeded.', [], 60) : message === 'IDEMPOTENCY_KEY_REUSED' ? new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency key was reused.') : message === 'IDEMPOTENCY_IN_PROGRESS' ? new ApiError(409, 'RESOURCE_CONFLICT', 'Request with this key is in progress.', [], 2) : message === 'VERSION_CONFLICT' ? new ApiError(412, 'VERSION_CONFLICT', 'Resource version has changed.') : message === 'ACCOUNT_NOT_FOUND' ? new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Account not found.') : message === 'CATEGORY_NOT_FOUND' ? new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found.') : message.includes('accounts_user_name_active_idx') ? new ApiError(409, 'ACCOUNT_NAME_EXISTS', 'Account name already exists.') : message.includes('categories_user_name_type_active_idx') ? new ApiError(409, 'CATEGORY_NAME_EXISTS', 'Category name already exists.') : new ApiError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable.', [], 2);
    console.error(JSON.stringify({ request_id: id, status: mapped.status, code: mapped.code }));
    return reply(req, id, mapped.status, undefined, mapped);
} });
