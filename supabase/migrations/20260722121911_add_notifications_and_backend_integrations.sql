create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('Penting', 'Keuangan', 'Sistem')),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  action text check (char_length(action) <= 100),
  url text check (char_length(url) <= 500),
  read_at timestamptz,
  dedupe_key text check (char_length(dedupe_key) <= 200),
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create unique index notifications_user_dedupe_idx on public.notifications (user_id, dedupe_key) where dedupe_key is not null;
alter table public.notifications enable row level security;
revoke all on table public.notifications from anon, authenticated;

create function public.get_my_notifications(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then raise exception 'limit must be between 1 and 100' using errcode = '22023'; end if;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'title', n.title, 'message', n.message, 'action', n.action, 'url', n.url, 'created_at', n.created_at, 'read', n.read_at is not null) order by n.created_at desc) from (select * from public.notifications where user_id = v_user_id order by created_at desc limit p_limit) n), '[]'::jsonb),
    'unread_count', (select count(*) from public.notifications where user_id = v_user_id and read_at is null)
  );
end;
$$;

create function public.mark_notification_read(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '28000'; end if;
  update public.notifications set read_at = coalesce(read_at, now()) where id = p_id and user_id = v_user_id;
  return found;
end;
$$;

create function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '28000'; end if;
  update public.notifications set read_at = now() where user_id = v_user_id and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.get_unread_notification_count()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select count(*) into v_count from public.notifications where user_id = v_user_id and read_at is null;
  return v_count;
end;
$$;

create function public.notify_money_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timezone text := coalesce((select timezone from public.profiles where user_id = new.user_id), 'Asia/Jakarta');
  v_month date := date_trunc('month', now() at time zone v_timezone)::date;
  v_budget bigint;
  v_used bigint;
begin
  insert into public.notifications (user_id, kind, title, message, action, url)
  values (new.user_id, 'Keuangan', case when new.type = 'EXPENSE' then 'Pengeluaran tercatat' else 'Pemasukan tercatat' end, concat(case when new.type = 'EXPENSE' then 'Pengeluaran' else 'Pemasukan' end, ' Rp ', trim(to_char(abs(new.amount), 'FM999G999G999G999G999G999')), ' berhasil dicatat.'), 'Lihat transaksi', '/transactions');
  if new.type = 'EXPENSE' and new.occurred_at >= v_month::timestamp at time zone v_timezone and new.occurred_at < (v_month + interval '1 month')::timestamp at time zone v_timezone then
    select total_limit into v_budget from public.monthly_budgets where user_id = new.user_id and month = v_month;
    if v_budget is not null then
      select coalesce(-sum(amount), 0) into v_used from public.transactions where user_id = new.user_id and type = 'EXPENSE' and deleted_at is null and occurred_at >= v_month::timestamp at time zone v_timezone and occurred_at < (v_month + interval '1 month')::timestamp at time zone v_timezone;
      if v_used * 100 >= v_budget * 80 then
        insert into public.notifications (user_id, kind, title, message, action, url, dedupe_key)
        values (new.user_id, 'Penting', 'Anggaran hampir habis', concat('Pengeluaran bulan ini telah mencapai ', floor(v_used * 100.0 / v_budget), '% dari anggaran.'), 'Lihat anggaran', '/budget', concat('budget-80:', v_month))
        on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger transaction_notifications after insert on public.transactions for each row execute function public.notify_money_transaction();

create or replace function public.reset_my_data() returns timestamptz language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); t timestamptz:=now(); begin
 if u is null then raise exception using errcode='P0001',message='AUTH_REQUIRED'; end if; delete from public.notifications where user_id=u; delete from public.transactions where user_id=u; delete from public.monthly_budgets where user_id=u; delete from public.debts where user_id=u; delete from public.saving_goals where user_id=u; delete from public.categories where user_id=u; delete from public.accounts where user_id=u; perform public.insert_defaults(u); return t; end $$;

revoke execute on function public.get_my_notifications(integer) from public, anon, authenticated;
revoke execute on function public.mark_notification_read(uuid) from public, anon, authenticated;
revoke execute on function public.mark_all_notifications_read() from public, anon, authenticated;
revoke execute on function public.get_unread_notification_count() from public, anon, authenticated;
revoke execute on function public.notify_money_transaction() from public, anon, authenticated;
grant execute on function public.get_my_notifications(integer) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;
