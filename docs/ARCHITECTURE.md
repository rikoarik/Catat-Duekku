# Architecture

```text
Expo Android/iOS/Web
        │
        ├── Supabase Auth
        ├── Supabase Postgres + RLS
        └── Supabase Edge Functions
                    ├── Telegram Bot API
                    └── OpenAI API
```

No separate Vercel backend in V1.

## Repository

```text
apps/app/
packages/domain/
packages/ui/
packages/ai-contracts/
supabase/migrations/
supabase/functions/
  telegram-webhook/
  create-telegram-link/
  ai-parse-transaction/
  ai-parse-receipt/
  ai-finance-insight/
  export-data/
```

## Rules

- Postgres is source of truth.
- AI creates drafts and explanations only.
- AI output is Zod validated.
- AI result requires explicit confirmation.
- All user tables use RLS.
- Money uses integer rupiah.
- Telegram and AI keys stay in Supabase secrets.
- Debt payment uses an atomic Postgres function.
- Spreadsheet is import/export only.
