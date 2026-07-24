create type public.saving_mutation_kind as enum ('DEPOSIT', 'WITHDRAWAL');

create table public.saving_goal_mutations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  kind public.saving_mutation_kind not null,
  amount bigint not null check (amount between 1 and 9000000000000000),
  note text check (char_length(note) <= 500),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.saving_goals(id, user_id)
);

create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null,
  amount bigint not null check (amount between 1 and 9000000000000000),
  note text check (char_length(note) <= 500),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (debt_id, user_id) references public.debts(id, user_id)
);

create index saving_goal_mutations_goal_occurred_idx on public.saving_goal_mutations (goal_id, occurred_at desc);
create index saving_goal_mutations_user_idx on public.saving_goal_mutations (user_id);
create index debt_payments_debt_occurred_idx on public.debt_payments (debt_id, occurred_at desc);
create index debt_payments_user_idx on public.debt_payments (user_id);

alter table public.saving_goal_mutations enable row level security;
alter table public.debt_payments enable row level security;

create policy saving_goal_mutations_read on public.saving_goal_mutations for select to authenticated using ((select auth.uid()) = user_id);
create policy debt_payments_read on public.debt_payments for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.saving_goal_mutations, public.debt_payments to authenticated;

create function public.record_saving_goal_mutation(p_goal_id uuid, p_kind public.saving_mutation_kind, p_amount bigint, p_note text, p_occurred_at timestamptz, p_expected_version integer)
returns public.saving_goal_mutations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.saving_goals;
  v_mutation public.saving_goal_mutations;
  v_next_amount bigint;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_amount is null or p_amount not between 1 and 9000000000000000 then raise exception 'INVALID_MONEY' using errcode = 'P0001'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception 'VERSION_REQUIRED' using errcode = 'P0001'; end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'INVALID_NOTE' using errcode = 'P0001'; end if;
  select * into v_goal from public.saving_goals where id = p_goal_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'GOAL_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_goal.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'P0001'; end if;
  v_next_amount := case when p_kind = 'DEPOSIT' then v_goal.saved_amount + p_amount else v_goal.saved_amount - p_amount end;
  if v_next_amount < 0 or v_next_amount > 9000000000000000 then raise exception 'INVALID_GOAL_BALANCE' using errcode = 'P0001'; end if;
  insert into public.saving_goal_mutations(user_id, goal_id, kind, amount, note, occurred_at)
  values (v_user_id, p_goal_id, p_kind, p_amount, nullif(btrim(p_note), ''), coalesce(p_occurred_at, now())) returning * into v_mutation;
  update public.saving_goals set saved_amount = v_next_amount where id = p_goal_id;
  return v_mutation;
end;
$$;

create function public.record_debt_payment(p_debt_id uuid, p_amount bigint, p_note text, p_occurred_at timestamptz, p_expected_version integer)
returns public.debt_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_debt public.debts;
  v_payment public.debt_payments;
  v_next_amount bigint;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_amount is null or p_amount not between 1 and 9000000000000000 then raise exception 'INVALID_MONEY' using errcode = 'P0001'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception 'VERSION_REQUIRED' using errcode = 'P0001'; end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'INVALID_NOTE' using errcode = 'P0001'; end if;
  select * into v_debt from public.debts where id = p_debt_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'DEBT_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_debt.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'P0001'; end if;
  v_next_amount := v_debt.paid_amount + p_amount;
  if v_next_amount > v_debt.total_amount then raise exception 'PAYMENT_EXCEEDS_REMAINING' using errcode = 'P0001'; end if;
  insert into public.debt_payments(user_id, debt_id, amount, note, occurred_at)
  values (v_user_id, p_debt_id, p_amount, nullif(btrim(p_note), ''), coalesce(p_occurred_at, now())) returning * into v_payment;
  update public.debts set paid_amount = v_next_amount where id = p_debt_id;
  return v_payment;
end;
$$;

revoke execute on function public.record_saving_goal_mutation(uuid, public.saving_mutation_kind, bigint, text, timestamptz, integer) from public, anon;
revoke execute on function public.record_debt_payment(uuid, bigint, text, timestamptz, integer) from public, anon;
grant execute on function public.record_saving_goal_mutation(uuid, public.saving_mutation_kind, bigint, text, timestamptz, integer) to authenticated;
grant execute on function public.record_debt_payment(uuid, bigint, text, timestamptz, integer) to authenticated;

create or replace function public.reset_my_data() returns timestamptz language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); t timestamptz:=now(); begin
 if u is null then raise exception using errcode='P0001',message='AUTH_REQUIRED'; end if; delete from public.notifications where user_id=u; delete from public.saving_goal_mutations where user_id=u; delete from public.debt_payments where user_id=u; delete from public.transactions where user_id=u; delete from public.monthly_budgets where user_id=u; delete from public.debts where user_id=u; delete from public.saving_goals where user_id=u; delete from public.categories where user_id=u; delete from public.accounts where user_id=u; perform public.insert_defaults(u); return t; end $$;
