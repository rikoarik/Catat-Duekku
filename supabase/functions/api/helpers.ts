export type Json = Record<string, unknown>;
export type Detail = {
    field: string;
    reason: string;
};
export class ApiError extends Error {
    constructor(public status: number, public code: string, message: string, public details: Detail[] = [], public retryAfter?: number) { super(message); }
}
export const routeKey = (method: string, pathname: string) => `${method.toUpperCase()} ${pathname.replace(/\/$/, '') || '/'}`;
export function object(value: unknown): Json {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new ApiError(400, 'INVALID_JSON', 'Request body must be a JSON object.');
    return value as Json;
}
export function exact(value: Json, keys: readonly string[]) {
    const unknown = Object.keys(value).filter((key) => !keys.includes(key));
    if (unknown.length)
        throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', unknown.map((field) => ({ field, reason: 'unknown field' })));
}
export function text(body: Json, key: string, max = 100, required = true): string | undefined {
    const value = body[key];
    if (value == null && !required)
        return undefined;
    if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > max)
        throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: key, reason: `must contain 1 to ${max} characters` }]);
    return value.trim();
}
export function nullableText(body: Json, key: string, max: number): string | null | undefined {
    if (!(key in body))
        return undefined;
    if (body[key] === null)
        return null;
    return text(body, key, max);
}
export function money(body: Json, key: string, allowZero = false): number {
    const value = body[key];
    if (!Number.isSafeInteger(value) || (value as number) > 9000000000000000 || (allowZero ? (value as number) < 0 : (value as number) <= 0))
        throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: key, reason: allowZero ? 'must be a non-negative safe integer rupiah amount' : 'must be a positive safe integer rupiah amount' }]);
    return value as number;
}
export function integer(body: Json, key: string, min: number, max: number, fallback?: number) {
    const value = body[key] ?? fallback;
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max)
        throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: key, reason: `must be an integer from ${min} to ${max}` }]);
    return value as number;
}
export function oneOf<T extends string>(body: Json, key: string, values: readonly T[], fallback?: T): T {
    const value = body[key] ?? fallback;
    if (typeof value !== 'string' || !values.includes(value as T))
        throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: key, reason: 'unsupported value' }]);
    return value as T;
}
export function optionalVersion(req: Request): number | undefined {
    const raw = req.headers.get('if-match');
    if (raw == null)
        return undefined;
    if (!/^"(?:0|[1-9]\d*)"$/.test(raw))
        throw new ApiError(400, 'INVALID_REQUEST', 'If-Match must be a quoted integer.');
    const value = Number(raw.slice(1, -1));
    if (!Number.isSafeInteger(value))
        throw new ApiError(400, 'INVALID_REQUEST', 'If-Match is invalid.');
    return value;
}
export function idempotencyKey(req: Request) {
    const value = req.headers.get('idempotency-key');
    if (value != null && (!/^[ -~]{8,128}$/.test(value)))
        throw new ApiError(400, 'INVALID_REQUEST', 'Idempotency-Key is invalid.');
    return value;
}
export const canonicalJson = (value: unknown): string => value && typeof value === 'object' ? Array.isArray(value) ? `[${value.map(canonicalJson).join(',')}]` : `{${Object.entries(value as Json).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}` : JSON.stringify(value);
export function isoDate(body: Json, key: string) { const value = text(body, key, 10)!; if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)
    throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: key, reason: 'must be an ISO calendar date' }]); return value; }
export function isoTimestamp(body: Json, key: string, fallback?: string) { const value = body[key] ?? fallback; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value)))
    throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: key, reason: 'must be an ISO timestamp with timezone' }]); return value; }
export function jpegBase64(value: unknown, maxBytes = 750000) { if (typeof value !== 'string' || value.length < 4 || value.length > Math.ceil(maxBytes / 3) * 4 || value.length % 4 !== 0 || !/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value))
    throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: 'image_base64', reason: `must be JPEG base64 up to ${maxBytes} bytes` }]); const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0; if (value.length / 4 * 3 - padding > maxBytes)
    throw new ApiError(422, 'VALIDATION_FAILED', 'Request validation failed.', [{ field: 'image_base64', reason: `must be JPEG base64 up to ${maxBytes} bytes` }]); return value; }
export function extractProviderJson(value: unknown, maxLength = 5000): unknown {
    if (typeof value !== 'string' || value.length > maxLength)
        throw new Error('Invalid provider JSON.');
    const fenced = value.match(/^\s*```json\s*\n([\s\S]*?)\n```\s*$/i);
    const json = fenced?.[1] ?? value;
    if (json.length > maxLength)
        throw new Error('Invalid provider JSON.');
    return JSON.parse(json);
}
export function validateInsightProvider(value: unknown) { try {
    const v = object(value);
    exact(v, ['insight']);
    return { insight: text(v, 'insight', 500)! };
}
catch {
    throw new Error('Invalid insight provider response.');
} }
export function validateChatProvider(value: unknown) { try {
    const v = object(value);
    exact(v, ['answer']);
    return { answer: text(v, 'answer', 500)! };
}
catch {
    throw new Error('Invalid chat provider response.');
} }
export function validateParserProvider(value: unknown, accounts: {
    id: string;
    name: string;
}[], categories: {
    name: string;
}[]) { try {
    const v = object(value);
    exact(v, ['intent', 'confidence', 'fields', 'reason']);
    const intent = oneOf(v, 'intent', ['create_expense', 'create_income', 'create_account', 'set_balance', 'create_debt', 'pay_debt', 'create_goal', 'deposit_goal', 'withdraw_goal', 'update_last_amount', 'update_last_account', 'undo_last', 'get_summary', 'unknown'] as const);
    if (typeof v.confidence !== 'number' || !Number.isFinite(v.confidence) || v.confidence < 0 || v.confidence > 1)
        throw new Error();
    const f = object(v.fields);
    exact(f, ['amount', 'account_name', 'account_kind', 'category_name', 'description', 'debt_name', 'goal_name', 'new_balance']);
    const optional = (key: string, max: number) => { const x = f[key]; if (x === null || x === undefined)
        return null; if (typeof x !== 'string' || [...x].length < 1 || [...x].length > max)
        throw new Error(); return x; };
    const amount = (key: string) => { const x = f[key]; if (x === null || x === undefined)
        return null; if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 9000000000000000)
        throw new Error(); return Math.round(x); };
    const accountName = optional('account_name', 100);
    const categoryName = optional('category_name', 100);
    const accountKind = f.account_kind === null || f.account_kind === undefined ? null : oneOf(f, 'account_kind', ['CASH', 'BANK', 'E_WALLET', 'INVESTMENT'] as const);
    const ownedAccount = accountName ? accounts.find(a => a.name.toLocaleLowerCase('id') === accountName.toLocaleLowerCase('id')) : undefined;
    const ownedCategory = categoryName ? categories.find(c => c.name.toLocaleLowerCase('id') === categoryName.toLocaleLowerCase('id')) : undefined;
    const reason = v.reason === null || v.reason === undefined ? null : typeof v.reason === 'string' && [...v.reason].length <= 500 ? v.reason : (() => { throw new Error(); })();
    return { intent, confidence: v.confidence, needs_confirmation: true, fields: { amount: amount('amount'), account_id: ownedAccount?.id ?? null, account_name: intent === 'create_account' ? accountName : ownedAccount?.name ?? null, account_kind: intent === 'create_account' ? accountKind : null, category_name: ownedCategory?.name ?? null, description: optional('description', 500), debt_name: optional('debt_name', 100), goal_name: optional('goal_name', 100), new_balance: amount('new_balance') }, reason };
}
catch (e) {
    if (e instanceof ApiError && e.status === 502)
        throw e;
    throw new ApiError(502, 'AI_PROVIDER_FAILED', 'AI provider returned an invalid response.');
} }
