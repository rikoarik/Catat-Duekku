import { edgeApi, type ParserResponse } from '@/core/lib/edge-api';

export type ParserIntent = ParserResponse['intent'];

export interface ParseResult {
  intent: ParserIntent;
  confidence: number;
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
  reason?: string;
}

export async function parseInput(input: string): Promise<ParseResult> {
  const value = input.trim();
  if (!value) throw new Error('Input tidak boleh kosong.');
  const { data } = await edgeApi.parseInput(value);
  const fields = data.fields;
  return {
    intent: data.intent,
    confidence: data.confidence,
    fields: {
      amount: fields.amount ?? undefined,
      accountId: fields.account_id ?? undefined,
      accountName: fields.account_name ?? undefined,
      categoryName: fields.category_name ?? undefined,
      description: fields.description ?? undefined,
      debtName: fields.debt_name ?? undefined,
      goalName: fields.goal_name ?? undefined,
      newBalance: fields.new_balance ?? undefined,
    },
    reason: data.reason ?? undefined,
  };
}
