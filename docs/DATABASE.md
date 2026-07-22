# Database

## Tables

### profiles

- id = auth user id;
- name;
- timezone;
- created_at;
- updated_at.

### accounts

- id;
- user_id;
- name;
- type;
- opening_balance bigint;
- active;
- timestamps;
- deleted_at.

### categories

- id;
- user_id;
- name;
- type;
- active;
- timestamps;
- deleted_at.

### transactions

- id;
- user_id;
- occurred_at;
- type;
- amount bigint;
- category_id;
- account_id;
- description;
- source;
- external_ref;
- timestamps;
- deleted_at.

### debts

- id;
- user_id;
- name;
- due_date;
- total_amount bigint;
- paid_amount bigint;
- status;
- notes;
- timestamps;
- deleted_at.

### telegram_links

- user_id unique;
- telegram_user_id unique;
- username;
- linked_at;
- revoked_at.

### telegram_link_codes

- user_id;
- token_hash;
- expires_at;
- consumed_at.

### processed_events

- user_id;
- source;
- external_id;
- result jsonb;
- created_at.

Unique `(source, external_id)`.

## RLS

Semua user table:

```sql
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

Profile:

```sql
id = auth.uid()
```

## Money

Gunakan bigint integer rupiah.

## Atomic debt payment

Postgres function:

- memastikan debt milik `auth.uid()`;
- mengecek amount;
- mengunci debt row;
- membuat transaksi;
- memperbarui paid amount/status;
- mengembalikan hasil;
- seluruhnya satu transaction.
