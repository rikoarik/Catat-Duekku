revoke execute on function public.consume_api_rate_limit(text) from public, anon;
grant execute on function public.consume_api_rate_limit(text) to authenticated;

create index if not exists debts_user_id_idx on public.debts (user_id);
create index if not exists saving_goals_user_id_idx on public.saving_goals (user_id);
create index if not exists transactions_account_user_idx on public.transactions (account_id, user_id);
create index if not exists transactions_category_user_idx on public.transactions (category_id, user_id);
