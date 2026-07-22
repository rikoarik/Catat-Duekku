create extension if not exists pgcrypto;

create type public.transaction_type as enum ('INCOME', 'EXPENSE');
create type public.transaction_source as enum ('MANUAL', 'PARSER', 'RECEIPT');
create type public.account_kind as enum ('CASH', 'BANK', 'E_WALLET');
create type public.category_type as enum ('INCOME', 'EXPENSE');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Pengguna' check (char_length(btrim(full_name)) between 1 and 100),
  timezone text not null default 'Asia/Jakarta' check (char_length(timezone) between 1 and 64),
  theme_mode text not null default 'system' check (theme_mode in ('system', 'light', 'dark')),
  cloud_sync_enabled boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100), kind public.account_kind not null default 'BANK',
  balance bigint not null default 0 check (balance between -9000000000000000 and 9000000000000000),
  is_default boolean not null default false, account_number text check (char_length(account_number) <= 64), icon text check (char_length(icon) <= 64),
  version integer not null default 1 check (version > 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (id, user_id)
);
create unique index accounts_user_name_active_idx on public.accounts (user_id, lower(name)) where deleted_at is null;
create unique index accounts_one_default_idx on public.accounts (user_id) where is_default and deleted_at is null;
create table public.categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100), type public.category_type not null default 'EXPENSE',
  icon text check (char_length(icon) <= 64), color text check (color ~ '^#[0-9A-Fa-f]{6}$'), is_default boolean not null default false,
  version integer not null default 1 check (version > 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (id, user_id)
);
create unique index categories_user_name_type_active_idx on public.categories (user_id, lower(name), type) where deleted_at is null;
create table public.saving_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100), target_amount bigint not null check (target_amount between 1 and 9000000000000000),
  saved_amount bigint not null default 0 check (saved_amount between 0 and 9000000000000000), target_date date,
  version integer not null default 1 check (version > 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (id, user_id)
);
create table public.debts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100), total_amount bigint not null check (total_amount between 1 and 9000000000000000),
  paid_amount bigint not null default 0 check (paid_amount >= 0 and paid_amount <= total_amount), tenor_months integer not null check (tenor_months between 1 and 600),
  paid_installments integer not null default 0 check (paid_installments >= 0 and paid_installments <= tenor_months), monthly_amount bigint not null check (monthly_amount > 0),
  start_date date not null, due_date date, version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique (id, user_id)
);
create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date), total_limit bigint not null check (total_limit between 1 and 9000000000000000),
  version integer not null default 1 check (version > 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, month)
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null, category_id uuid, type public.transaction_type not null, amount bigint not null check (amount <> 0 and amount between -9000000000000000 and 9000000000000000),
  category_name text check (char_length(category_name) <= 100), description text check (char_length(description) <= 500), note text check (char_length(note) <= 500),
  occurred_at timestamptz not null default now(), source public.transaction_source not null default 'MANUAL', resulting_balance bigint not null,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  foreign key (account_id, user_id) references public.accounts(id, user_id), foreign key (category_id, user_id) references public.categories(id, user_id),
  check ((type = 'EXPENSE' and amount < 0) or (type = 'INCOME' and amount > 0))
);
create index transactions_user_occurred_idx on public.transactions (user_id, occurred_at desc) where deleted_at is null;
create table public.idempotency_records (
  user_id uuid not null references auth.users(id) on delete cascade, method text not null, path text not null,
  key text not null check (char_length(key) between 8 and 128), request_hash text not null, state text not null default 'processing' check (state in ('processing','complete')),
  status integer, response jsonb, claimed_at timestamptz not null default now(), expires_at timestamptz not null default now() + interval '24 hours',
  primary key (user_id, method, path, key)
);
create table public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade, route text not null, window_start timestamptz not null, request_count integer not null default 1,
  primary key (user_id, route, window_start)
);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=now(); new.version=old.version+1; return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger accounts_updated before update on public.accounts for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();
create trigger goals_updated before update on public.saving_goals for each row execute function public.set_updated_at();
create trigger debts_updated before update on public.debts for each row execute function public.set_updated_at();
create trigger budgets_updated before update on public.monthly_budgets for each row execute function public.set_updated_at();

create function public.insert_defaults(p_user uuid) returns void language plpgsql security definer set search_path='' as $$ begin
  insert into public.accounts(user_id,name,kind,is_default) values(p_user,'Cash','CASH',true),(p_user,'Bank','BANK',false),(p_user,'E-Wallet','E_WALLET',false);
  insert into public.categories(user_id,name,type,icon,color,is_default) values
  (p_user,'Makan & Harian','EXPENSE','receipt','#FF6B6B',true),(p_user,'Transportasi','EXPENSE','car','#FF6B6B',true),(p_user,'Belanja','EXPENSE','bag','#FF6B6B',true),
  (p_user,'Hiburan','EXPENSE','game','#FF6B6B',true),(p_user,'Tagihan','EXPENSE','document','#FF6B6B',true),(p_user,'Lainnya','EXPENSE','category','#FF6B6B',true),
  (p_user,'Gaji','INCOME','wallet','#22C55E',true),(p_user,'Bonus','INCOME','gift','#22C55E',true),(p_user,'Refund','INCOME','refresh','#22C55E',true),
  (p_user,'Freelance','INCOME','briefcase','#22C55E',true),(p_user,'Lainnya','INCOME','category','#22C55E',true);
end $$;
create function public.provision_user() returns trigger language plpgsql security definer set search_path='' as $$ begin
  insert into public.profiles(user_id,full_name) values(new.id,coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),'Pengguna'));
  perform public.insert_defaults(new.id); return new;
end $$;
create trigger auth_user_provisioned after insert on auth.users for each row execute function public.provision_user();

create function public.consume_api_rate_limit(p_route text) returns integer language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); n integer; w timestamptz:=date_trunc('minute',now()); lim integer:=case when p_route='POST /api/v1/parser' then 20 else 120 end;
begin if u is null then raise exception using errcode='P0001',message='AUTH_REQUIRED'; end if;
  insert into public.api_rate_limits(user_id,route,window_start) values(u,p_route,w) on conflict(user_id,route,window_start) do update set request_count=public.api_rate_limits.request_count+1 returning request_count into n;
  if n>lim then raise exception using errcode='P0001',message='RATE_LIMITED'; end if; return n;
end $$;
create function public.claim_idempotency(p_method text,p_path text,p_key text,p_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); r public.idempotency_records;
begin if u is null then raise exception using errcode='P0001',message='AUTH_REQUIRED'; end if;
  delete from public.idempotency_records where expires_at<=now();
  insert into public.idempotency_records(user_id,method,path,key,request_hash) values(u,p_method,p_path,p_key,p_hash) on conflict do nothing;
  if found then return jsonb_build_object('state','claimed'); end if;
  select * into r from public.idempotency_records where user_id=u and method=p_method and path=p_path and key=p_key;
  if r.request_hash<>p_hash then raise exception using errcode='P0001',message='IDEMPOTENCY_KEY_REUSED'; end if;
  if r.state='complete' then return jsonb_build_object('state','complete','status',r.status,'response',r.response); end if;
  raise exception using errcode='P0001',message='IDEMPOTENCY_IN_PROGRESS';
end $$;
create function public.finalize_idempotency(p_method text,p_path text,p_key text,p_status integer,p_response jsonb) returns void language plpgsql security definer set search_path='' as $$ begin
  update public.idempotency_records set state='complete',status=p_status,response=p_response where user_id=(select auth.uid()) and method=p_method and path=p_path and key=p_key and state='processing';
end $$;
create function public.release_idempotency(p_method text,p_path text,p_key text) returns void language plpgsql security definer set search_path='' as $$ begin
  delete from public.idempotency_records where user_id=(select auth.uid()) and method=p_method and path=p_path and key=p_key and state='processing';
end $$;

create function public.create_account(p_name text,p_kind public.account_kind,p_opening_balance bigint,p_is_default boolean,p_account_number text,p_icon text) returns public.accounts
language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); a public.accounts; begin
 if u is null then raise exception using errcode='P0001',message='AUTH_REQUIRED'; end if;
 if p_is_default then update public.accounts set is_default=false where user_id=u and is_default and deleted_at is null; end if;
 insert into public.accounts(user_id,name,kind,balance,is_default,account_number,icon) values(u,p_name,p_kind,p_opening_balance,p_is_default,p_account_number,p_icon) returning * into a;
 if p_opening_balance>0 then insert into public.transactions(user_id,account_id,type,amount,description,source,resulting_balance) values(u,a.id,'INCOME',p_opening_balance,'Opening balance','MANUAL',p_opening_balance); end if; return a;
end $$;
create function public.create_category(p_name text,p_type public.category_type,p_icon text,p_color text) returns public.categories language sql security definer set search_path='' as $$
 insert into public.categories(user_id,name,type,icon,color) values((select auth.uid()),p_name,p_type,p_icon,p_color) returning * $$;
create function public.create_saving_goal(p_name text,p_target_amount bigint,p_target_date date) returns public.saving_goals language sql security definer set search_path='' as $$
 insert into public.saving_goals(user_id,name,target_amount,target_date) values((select auth.uid()),p_name,p_target_amount,p_target_date) returning * $$;
create function public.create_debt(p_name text,p_total_amount bigint,p_tenor_months integer,p_paid_installments integer,p_start_date date) returns public.debts language sql security definer set search_path='' as $$
 insert into public.debts(user_id,name,total_amount,paid_amount,tenor_months,paid_installments,monthly_amount,start_date,due_date)
 values((select auth.uid()),p_name,p_total_amount,least(p_total_amount,ceil(p_total_amount::numeric/p_tenor_months)::bigint*p_paid_installments),p_tenor_months,p_paid_installments,ceil(p_total_amount::numeric/p_tenor_months)::bigint,p_start_date,(p_start_date+(p_tenor_months||' months')::interval)::date) returning * $$;
create function public.upsert_current_budget(p_total_limit bigint,p_expected_version integer) returns public.monthly_budgets language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); m date:=date_trunc('month',now() at time zone coalesce((select timezone from public.profiles where user_id=u),'Asia/Jakarta'))::date; b public.monthly_budgets;
begin select * into b from public.monthly_budgets where user_id=u and month=m for update;
 if found then if p_expected_version is not null and b.version<>p_expected_version then raise exception using errcode='P0001',message='VERSION_CONFLICT'; end if; update public.monthly_budgets set total_limit=p_total_limit where id=b.id returning * into b;
 else if p_expected_version is not null and p_expected_version<>0 then raise exception using errcode='P0001',message='VERSION_CONFLICT'; end if; insert into public.monthly_budgets(user_id,month,total_limit) values(u,m,p_total_limit) returning * into b; end if; return b;
end $$;
create function public.create_money_transaction(p_account_id uuid,p_type public.transaction_type,p_amount bigint,p_category_id uuid,p_category_name text,p_description text,p_note text,p_occurred_at timestamptz,p_source public.transaction_source) returns public.transactions
language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); a public.accounts; c public.categories; t public.transactions; signed bigint;
begin select * into a from public.accounts where id=p_account_id and user_id=u and deleted_at is null for update; if not found then raise exception using errcode='P0001',message='ACCOUNT_NOT_FOUND'; end if;
 if p_category_id is not null then select * into c from public.categories where id=p_category_id and user_id=u and deleted_at is null and type=p_type; if not found then raise exception using errcode='P0001',message='CATEGORY_NOT_FOUND'; end if; end if;
 signed:=case when p_type='EXPENSE' then -p_amount else p_amount end; if a.balance+signed not between -9000000000000000 and 9000000000000000 then raise exception using errcode='P0001',message='INVALID_MONEY'; end if;
 update public.accounts set balance=balance+signed where id=a.id;
 insert into public.transactions(user_id,account_id,category_id,category_name,type,amount,description,note,occurred_at,source,resulting_balance) values(u,a.id,p_category_id,coalesce(c.name,p_category_name),p_type,signed,p_description,p_note,p_occurred_at,p_source,a.balance+signed) returning * into t; return t;
end $$;
create function public.reset_my_data() returns timestamptz language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); t timestamptz:=now(); begin
 if u is null then raise exception using errcode='P0001',message='AUTH_REQUIRED'; end if; delete from public.transactions where user_id=u; delete from public.monthly_budgets where user_id=u; delete from public.debts where user_id=u; delete from public.saving_goals where user_id=u; delete from public.categories where user_id=u; delete from public.accounts where user_id=u; perform public.insert_defaults(u); return t; end $$;

alter table public.profiles enable row level security; alter table public.accounts enable row level security; alter table public.categories enable row level security; alter table public.saving_goals enable row level security; alter table public.debts enable row level security; alter table public.monthly_budgets enable row level security; alter table public.transactions enable row level security; alter table public.idempotency_records enable row level security; alter table public.api_rate_limits enable row level security;
do $$ declare t text; begin foreach t in array array['profiles','accounts','categories','saving_goals','debts','monthly_budgets','transactions'] loop execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid())=user_id)',t||'_read',t); end loop; end $$;
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on all tables in schema public from anon,authenticated; grant usage on schema public to authenticated;
grant select on public.profiles,public.accounts,public.categories,public.saving_goals,public.debts,public.monthly_budgets,public.transactions to authenticated;
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.consume_api_rate_limit(text),public.claim_idempotency(text,text,text,text),public.finalize_idempotency(text,text,text,integer,jsonb),public.release_idempotency(text,text,text),public.create_account(text,public.account_kind,bigint,boolean,text,text),public.create_category(text,public.category_type,text,text),public.create_saving_goal(text,bigint,date),public.create_debt(text,bigint,integer,integer,date),public.upsert_current_budget(bigint,integer),public.create_money_transaction(uuid,public.transaction_type,bigint,uuid,text,text,text,timestamptz,public.transaction_source),public.reset_my_data() to authenticated;
