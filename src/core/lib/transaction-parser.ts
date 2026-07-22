/**
 * Hybrid transaction parser for Catat Duekku.
 * Per PRD §4.1 and §6: user types natural Indonesian, we extract intent + fields.
 *
 * Strategy:
 * 1. Try a deterministic regex-based parser first (free, fast, no network).
 * 2. If confidence is low OR pattern is complex, optionally call an AI provider
 *    configured via EXPO_PUBLIC_AI_BASE_URL / EXPO_PUBLIC_AI_KEY / EXPO_PUBLIC_AI_MODEL.
 * 3. Caller can pass `useAi: false` to skip AI entirely (e.g. for /saldo, /utang).
 */
import type { TransactionType } from '@/types/transaction';
import { financeStore } from './finance-store';

export type ParserIntent =
  | 'create_expense'
  | 'create_income'
  | 'set_balance'
  | 'create_debt'
  | 'pay_debt'
  | 'create_goal'
  | 'deposit_goal'
  | 'withdraw_goal'
  | 'update_last_amount'
  | 'update_last_account'
  | 'undo_last'
  | 'get_summary'
  | 'unknown';

export interface ParseResult {
  intent: ParserIntent;
  confidence: number; // 0..1
  fields: {
    amount?: number;
    accountId?: string;
    accountName?: string;
    categoryName?: string;
    description?: string;
    debtName?: string;
    goalName?: string;
    newBalance?: number;
  };
  reason?: string; // when confidence low / unknown
}

const NUMBER_PATTERN = '(?:\\d{1,3}(?:[.,]\\d{3})+|\\d+)(?:[.,]\\d+)?';
const NUMBER_WORDS: Record<string, number> = {
  ribu: 1_000,
  rb: 1_000,
  k: 1_000,
  juta: 1_000_000,
  jt: 1_000_000,
  miliar: 1_000_000_000,
  m: 1_000_000,
};

function parseIdNumber(raw: string): number {
  // "25.000" / "25,000" / "25rb" / "25 ribu" / "1,5jt"
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const multiplierMatch = cleaned.match(/(rb|ribu|k|jt|juta|miliar|m)\b/);
  let multiplier = 1;
  if (multiplierMatch) {
    multiplier = NUMBER_WORDS[multiplierMatch[1]] ?? 1;
  }
  const digitsMatch = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  if (!digitsMatch) return NaN;
  const numeric = parseFloat(digitsMatch[1].replace(',', '.'));
  if (Number.isNaN(numeric)) return NaN;
  // If user wrote "1,5" treat as decimal (1.5jt -> 1.5M). Otherwise integer.
  const isDecimal = digitsMatch[1].includes(',');
  const base = isDecimal ? numeric : Math.round(numeric);
  return Math.round(base * multiplier);
}

function findAccount(text: string): { id?: string; name?: string } | undefined {
  const lower = text.toLowerCase();
  for (const account of financeStore.getAccounts()) {
    if (lower.includes(account.name.toLowerCase())) {
      return { id: account.id, name: account.name };
    }
  }
  if (/(cash|tunai)/.test(lower)) return { name: 'Cash' };
  if (/(bank|bca|mandiri|bri|seabank)/.test(lower)) return { name: 'Bank' };
  if (/(gopay|ovo|dana|shopeepay|e-?wallet|dompet)/.test(lower)) return { name: 'E-Wallet' };
  return undefined;
}

const DEFAULT_CATEGORIES = {
  expense: ['Makan & Harian', 'Transportasi', 'Belanja', 'Hiburan', 'Tagihan', 'Lainnya'],
  income: ['Gaji', 'Bonus', 'Refund', 'Freelance', 'Lainnya'],
};

function guessCategory(text: string, type: 'expense' | 'income'): string {
  const lower = text.toLowerCase();
  const expenseMap: Array<[RegExp, string]> = [
    [/makan|ngopi|kopi|sarapan|makan siang|makan malam|jajan/, 'Makan & Harian'],
    [/bensin|grab|gojek|ojol|transport|kereta|bus|tol/, 'Transportasi'],
    [/belanja|shop|beli|toko|mall|marketplace/, 'Belanja'],
    [/nonton|game|hiburan|karaoke|streaming|netflix|spotify/, 'Hiburan'],
    [/listrik|pln|internet|wifi|kos|sewa|air|pulsa|kuota/, 'Tagihan'],
  ];
  const incomeMap: Array<[RegExp, string]> = [
    [/gaji|salary|gajian/, 'Gaji'],
    [/bonus|thr/, 'Bonus'],
    [/refund|kembali/, 'Refund'],
    [/freelance|proyek|project/, 'Freelance'],
  ];
  const list = type === 'expense' ? expenseMap : incomeMap;
  for (const [pattern, name] of list) {
    if (pattern.test(lower)) return name;
  }
  return type === 'expense' ? DEFAULT_CATEGORIES.expense[5] : DEFAULT_CATEGORIES.income[4];
}

const CORRECTION_TRIGGERS = /^(salah|bukan|eh\b|koreksi)/i;
const AMOUNT_ONLY = new RegExp(`^(\\d{1,3}(?:[.,]\\d{3})+|\\d+)\\s*(rb|ribu|jt|juta|k|m)?\\b`, 'i');
const ACCOUNT_ONLY = /^pakai\s+(.+)$/i;

export function parseLocal(input: string): ParseResult {
  const text = input.trim();
  if (!text) return { intent: 'unknown', confidence: 0, fields: {}, reason: 'Input kosong.' };

  // ── Shortcuts ────────────────────────────────────────────────
  if (/^(batal|undo|cancel)$/i.test(text)) {
    return { intent: 'undo_last', confidence: 1, fields: {} };
  }
  if (/ringkasan|uangku|cash berapa|saldo|utang tersisa|bulan ini keluar/i.test(text)) {
    return { intent: 'get_summary', confidence: 0.9, fields: {} };
  }

  // ── Last-action correction: "salah 35 ribu" ──────────────────
  if (CORRECTION_TRIGGERS.test(text)) {
    const trimmed = text.replace(CORRECTION_TRIGGERS, '').trim();
    const amountMatch = trimmed.match(AMOUNT_ONLY);
    if (amountMatch) {
      const amount = parseIdNumber(amountMatch[0]);
      return {
        intent: 'update_last_amount',
        confidence: 0.85,
        fields: { amount },
      };
    }
    const accountMatch = trimmed.match(ACCOUNT_ONLY);
    if (accountMatch) {
      const account = findAccount(accountMatch[1]);
      if (account?.id) {
        return {
          intent: 'update_last_account',
          confidence: 0.85,
          fields: { accountId: account.id, accountName: account.name },
        };
      }
    }
  }

  // ── Balance adjustment: "cash sekarang 450 ribu" ────────────
  const balanceMatch = text.match(
    new RegExp(`^(cash|tunai|bank|e-?wallet|dompet|[a-zA-Z]+)\\s+(sekarang|jadi|skg|tgl ini)?\\s*(${NUMBER_PATTERN})\\s*(rb|ribu|jt|juta|k|m)?`, 'i')
  );
  if (balanceMatch && /(sekarang|jadi|skg|tgl ini|cuma|hanya)/i.test(text)) {
    const accountHint = balanceMatch[1];
    const account = findAccount(accountHint);
    if (account?.name) {
      const amount = parseIdNumber(`${balanceMatch[3]} ${balanceMatch[4] ?? ''}`);
      if (!Number.isNaN(amount)) {
        return {
          intent: 'set_balance',
          confidence: 0.9,
          fields: { accountName: account.name, newBalance: amount },
        };
      }
    }
  }

  // ── Pay debt: "bayar kredivo 300 ribu dari bank" ─────────────
  const payDebtMatch = text.match(
    new RegExp(`^bayar\\s+([\\w\\s]+?)\\s+(${NUMBER_PATTERN})\\s*(rb|ribu|jt|juta|k|m)?\\b`, 'i')
  );
  if (payDebtMatch) {
    const debtName = payDebtMatch[1].trim();
    const amount = parseIdNumber(`${payDebtMatch[2]} ${payDebtMatch[3] ?? ''}`);
    const account = findAccount(text);
    return {
      intent: 'pay_debt',
      confidence: 0.85,
      fields: {
        amount,
        debtName,
        accountId: account?.id,
        accountName: account?.name,
      },
    };
  }

  // ── Create debt: "punya utang kredivo 1 juta" ────────────────
  const createDebtMatch = text.match(
    new RegExp(`(punya|ada|buat|tambah)\\s+utang\\s+([\\w\\s]+?)\\s+(${NUMBER_PATTERN})\\s*(rb|ribu|jt|juta|k|m)?`, 'i')
  );
  if (createDebtMatch) {
    const debtName = createDebtMatch[2].trim();
    const amount = parseIdNumber(`${createDebtMatch[3]} ${createDebtMatch[4] ?? ''}`);
    return {
      intent: 'create_debt',
      confidence: 0.85,
      fields: { amount, debtName },
    };
  }

  // ── Goal deposit/withdraw: "nabung 200 ribu ke laptop" ──────
  const depositMatch = text.match(
    new RegExp(`^nabung\\s+(${NUMBER_PATTERN})\\s*(rb|ribu|jt|juta|k|m)?\\s+ke\\s+([\\w\\s]+)`, 'i')
  );
  if (depositMatch) {
    const amount = parseIdNumber(`${depositMatch[1]} ${depositMatch[2] ?? ''}`);
    const goalName = depositMatch[3].trim();
    const account = findAccount(text);
    return {
      intent: 'deposit_goal',
      confidence: 0.85,
      fields: {
        amount,
        goalName,
        accountId: account?.id,
        accountName: account?.name,
      },
    };
  }
  const withdrawMatch = text.match(
    new RegExp(`^ambil\\s+(${NUMBER_PATTERN})\\s*(rb|ribu|jt|juta|k|m)?\\s+dari\\s+tabungan\\s+([\\w\\s]+)`, 'i')
  );
  if (withdrawMatch) {
    const amount = parseIdNumber(`${withdrawMatch[1]} ${withdrawMatch[2] ?? ''}`);
    const goalName = withdrawMatch[3].trim();
    const account = findAccount(text);
    return {
      intent: 'withdraw_goal',
      confidence: 0.85,
      fields: {
        amount,
        goalName,
        accountId: account?.id,
        accountName: account?.name,
      },
    };
  }
  const createGoalMatch = text.match(
    new RegExp(`(buat| bikin)\\s+(target\\s+)?tabungan\\s+([\\w\\s]+?)\\s+(${NUMBER_PATTERN})\\s*(rb|ribu|jt|juta|k|m)?`, 'i')
  );
  if (createGoalMatch) {
    const goalName = createGoalMatch[3].trim();
    const amount = parseIdNumber(`${createGoalMatch[4]} ${createGoalMatch[5] ?? ''}`);
    return {
      intent: 'create_goal',
      confidence: 0.85,
      fields: { amount, goalName },
    };
  }

  // ── Income vs expense ───────────────────────────────────────
  const incomeMarkers = /(gaji|gajian|masuk|terima|cair|freelance|bonus|refund|dapat)/i;
  const expenseMarkers = /(makan|ngopi|kopi|bensin|grab|beli|bayar|belanja|jajan|transport|kos|listrik|pln|topup|pulsa|kuota)/i;
  const isIncome = incomeMarkers.test(text) && !expenseMarkers.test(text);
  const type: TransactionType = isIncome ? 'INCOME' : 'EXPENSE';

  // ── Amount extraction ────────────────────────────────────────
  const amountMatch = text.match(
    new RegExp(`(${NUMBER_PATTERN})\\s*(rb|ribu|jt|juta|k|m)?`, 'i')
  );
  if (!amountMatch) {
    return {
      intent: type === 'INCOME' ? 'create_income' : 'create_expense',
      confidence: 0.3,
      fields: {},
      reason: 'Nominal tidak ditemukan.',
    };
  }
  const amount = parseIdNumber(`${amountMatch[1]} ${amountMatch[2] ?? ''}`);
  if (Number.isNaN(amount) || amount <= 0) {
    return {
      intent: type === 'INCOME' ? 'create_income' : 'create_expense',
      confidence: 0.2,
      fields: {},
      reason: 'Nominal tidak valid.',
    };
  }

  const account = findAccount(text);
  const description = text
    .replace(new RegExp(`${NUMBER_PATTERN}\\s*(rb|ribu|jt|juta|k|m)?`, 'i'), '')
    .replace(/pakai|dari|via|di\s+/gi, '')
    .trim();

  return {
    intent: type === 'INCOME' ? 'create_income' : 'create_expense',
    confidence: 0.8,
    fields: {
      amount,
      accountId: account?.id,
      accountName: account?.name,
      categoryName: guessCategory(text, type === 'INCOME' ? 'income' : 'expense'),
      description: description || undefined,
    },
  };
}

/**
 * Optional AI-backed parse. Falls back to local result if env missing or call fails.
 * Provider: OpenAI-compatible (ArkLabs in your case).
 */
export async function parseWithAi(
  input: string,
  fallback: ParseResult,
  useAi: boolean
): Promise<ParseResult> {
  if (!useAi) return fallback;
  const baseUrl = process.env.EXPO_PUBLIC_AI_BASE_URL;
  const apiKey = process.env.EXPO_PUBLIC_AI_KEY;
  const model = process.env.EXPO_PUBLIC_AI_MODEL ?? 'catat';
  if (!baseUrl || !apiKey) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 300,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              'Ekstrak transaksi keuangan pengguna Bahasa Indonesia. Balas hanya JSON valid tanpa markdown. Field: intent (create_expense|create_income|set_balance|pay_debt|create_debt|create_goal|deposit_goal|withdraw_goal|update_last_amount|update_last_account|undo_last|get_summary|unknown), amount (number), account_name, category_name, description, debt_name, goal_name, new_balance, confidence (0..1).',
          },
          { role: 'user', content: input },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return fallback;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return fallback;
    const parsed = JSON.parse(content);
    return {
      intent: parsed.intent ?? fallback.intent,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : fallback.confidence,
      fields: {
        amount: parsed.amount,
        accountName: parsed.account_name,
        categoryName: parsed.category_name,
        description: parsed.description,
        debtName: parsed.debt_name,
        goalName: parsed.goal_name,
        newBalance: parsed.new_balance,
      },
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Public API: parses input with optional AI fallback.
 */
export async function parseInput(input: string, useAi = true): Promise<ParseResult> {
  const local = parseLocal(input);
  if (local.confidence >= 0.8) return local;
  return parseWithAi(input, local, useAi);
}
