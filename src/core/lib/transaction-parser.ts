import { edgeApi, type ParserResponse } from '@/core/lib/edge-api';

export type ParserIntent = ParserResponse['intent'];

export interface ParseResult {
  intent: ParserIntent;
  confidence: number;
  needsConfirmation: boolean;
  fields: {
    amount?: number;
    accountId?: string;
    accountName?: string;
    sourceAccountId?: string;
    sourceAccountName?: string;
    destinationAccountId?: string;
    destinationAccountName?: string;
    accountKind?: ParserResponse['fields']['account_kind'] extends infer T ? Exclude<T, null | undefined> : never;
    categoryName?: string;
    description?: string;
    debtName?: string;
    goalName?: string;
    newBalance?: number;
  };
  reason?: string;
}

export async function parseInput(input: string): Promise<ParseResult> {
  const value = input.trim();
  if (!value) throw new Error('Input tidak boleh kosong.');
  if (/\b(?:transfer|pindah(?:kan)?|kirim)\b/i.test(value)) {
    const accounts = (await edgeApi.accounts()).data;
    const normalized = value.toLocaleLowerCase('id');
    const direction = normalized.match(/\b(?:dari|asal)\b([\s\S]+?)\b(?:ke|menuju|masuk ke)\b([\s\S]+)/i) ?? normalized.match(/([\s\S]+?)\b(?:ke|menuju|masuk ke)\b([\s\S]+)/i);
    const findAccount = (part: string) => accounts.filter((account) => part.includes(account.name.toLocaleLowerCase('id')) || part.includes(account.kind.toLocaleLowerCase('id').replace('_', ' '))).sort((a, b) => b.name.length - a.name.length)[0];
    const source = direction ? findAccount(direction[1]) : undefined;
    const destination = direction ? findAccount(direction[2]) : undefined;
    const amountMatch = normalized.match(/(?:rp\s*)?([\d]+(?:[.,][\d]+)*)\s*(juta|jt|ribu|rb|k)?/i);
    const base = amountMatch ? Number(amountMatch[1].replace(/\./g, '').replace(',', '.')) : 0;
    const multiplier = /^(ribu|rb|k)$/i.test(amountMatch?.[2] ?? '') ? 1_000 : /^(juta|jt)$/i.test(amountMatch?.[2] ?? '') ? 1_000_000 : 1;
    if (!source || !destination || source.id === destination.id || !Number.isFinite(base) || base <= 0) throw new Error(`Transfer belum lengkap. Tulis nominal dan nama akun, contoh: transfer 100 ribu dari ${accounts[0]?.name ?? 'Cash'} ke ${accounts[1]?.name ?? 'Bank'}.`);
    return { intent: 'transfer_account', confidence: 1, needsConfirmation: true, fields: { amount: Math.round(base * multiplier), sourceAccountId: source.id, sourceAccountName: source.name, destinationAccountId: destination.id, destinationAccountName: destination.name } };
  }
  const { data } = await edgeApi.parseInput(value);
  const fields = data.fields;
  return {
    intent: data.intent,
    confidence: data.confidence,
    needsConfirmation: data.needs_confirmation,
    fields: {
      amount: fields.amount ?? undefined,
      accountId: fields.account_id ?? undefined,
      accountName: fields.account_name ?? undefined,
      sourceAccountId: fields.source_account_id ?? undefined,
      sourceAccountName: fields.source_account_name ?? undefined,
      destinationAccountId: fields.destination_account_id ?? undefined,
      destinationAccountName: fields.destination_account_name ?? undefined,
      accountKind: fields.account_kind ?? undefined,
      categoryName: fields.category_name ?? undefined,
      description: fields.description ?? undefined,
      debtName: fields.debt_name ?? undefined,
      goalName: fields.goal_name ?? undefined,
      newBalance: fields.new_balance ?? undefined,
    },
    reason: data.reason ?? undefined,
  };
}
