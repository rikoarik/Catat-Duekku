# AI Requirements and Architecture

## Fitur AI wajib

### 1. Natural-language transaction input

Contoh:

```text
makan siang 25 ribu pakai bank
gaji masuk 3 juta
bayar Kredivo 200 ribu
```

Hasil berupa draft terstruktur:

- type;
- amount integer;
- category;
- account;
- description;
- occurredAt;
- confidence;
- needsConfirmation.

### 2. Receipt and screenshot reader

Ekstrak:

- merchant;
- total;
- date;
- suggested category;
- suggested account;
- description;
- confidence.

### 3. Auto-category

Rekomendasikan kategori dari merchant dan deskripsi. Pengguna dapat menggantinya.

### 4. Financial insight

Pertanyaan minimum:

- Pengeluaran terbesar bulan ini apa?
- Kenapa pengeluaran bulan ini naik?
- Berapa batas aman pengeluaran harian?
- Utang mana yang harus diprioritaskan?

## Architecture

```text
Expo / Telegram
      │
      ▼
Supabase Edge Functions
      ├── rule-based parser
      ├── OpenAI API adapter
      ├── Zod validation
      └── Supabase Postgres
```

Functions:

- `ai-parse-transaction`
- `ai-parse-receipt`
- `ai-finance-insight`

## Mandatory flow

```text
User input
→ rule-based parser
→ AI fallback when needed
→ validate structured output
→ show preview
→ user confirms or edits
→ save transaction
```

AI must never save a transaction directly.

## Cost control

- rule-based first;
- small model default;
- structured JSON;
- short prompts;
- no complete chat history;
- aggregates only for insight;
- resize receipt images;
- per-user rate limit;
- cache safe repeated results;
- maximum input length.

## Security

- `OPENAI_API_KEY` only in Supabase secrets;
- no AI key in Expo;
- no service-role key in Expo;
- redact sensitive logs;
- process receipt images temporarily;
- validate model output with Zod;
- manual input remains available when AI fails.
