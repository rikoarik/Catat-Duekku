create function public.is_valid_timezone(p_timezone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
$$;

alter table public.profiles add constraint profiles_timezone_valid check (public.is_valid_timezone(timezone)) not valid;
alter table public.profiles validate constraint profiles_timezone_valid;

drop function public.consume_api_rate_limit(text);
create function public.consume_api_rate_limit(p_route text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := (select auth.uid());
  n integer;
  w timestamptz := date_trunc('minute', now());
  lim integer := case when p_route = 'POST /api/v1/parser' then 20 else 120 end;
begin
  if u is null then raise exception using errcode='P0001', message='AUTH_REQUIRED'; end if;
  insert into public.api_rate_limits(user_id, route, window_start) values (u, p_route, w)
  on conflict(user_id, route, window_start) do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into n;
  return jsonb_build_object('allowed', n <= lim, 'count', n, 'retry_after', greatest(1, ceil(extract(epoch from w + interval '1 minute' - now()))::integer));
end $$;

create or replace function public.claim_idempotency(p_method text,p_path text,p_key text,p_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid := (select auth.uid()); r public.idempotency_records;
begin
  if u is null then raise exception using errcode='P0001',message='AUTH_REQUIRED'; end if;
  delete from public.idempotency_records where expires_at <= now();
  insert into public.idempotency_records(user_id,method,path,key,request_hash) values(u,p_method,p_path,p_key,p_hash) on conflict do nothing;
  if found then return jsonb_build_object('state','claimed'); end if;
  select * into r from public.idempotency_records where user_id=u and method=p_method and path=p_path and key=p_key for update;
  if r.request_hash <> p_hash then raise exception using errcode='P0001',message='IDEMPOTENCY_KEY_REUSED'; end if;
  if r.state='complete' then return jsonb_build_object('state','complete','status',r.status,'response',r.response); end if;
  if r.claimed_at <= now() - interval '2 minutes' then
    update public.idempotency_records set claimed_at=now(),expires_at=now()+interval '24 hours' where user_id=u and method=p_method and path=p_path and key=p_key;
    return jsonb_build_object('state','claimed','reclaimed',true);
  end if;
  raise exception using errcode='P0001',message='IDEMPOTENCY_IN_PROGRESS';
end $$;

create function public.update_my_profile(p_full_name text,p_timezone text,p_theme_mode text,p_cloud_sync_enabled boolean,p_expected_version integer)
returns public.profiles language plpgsql security definer set search_path='' as $$
declare u uuid := (select auth.uid()); r public.profiles;
begin
  if u is null then raise exception using errcode='P0001',message='AUTH_REQUIRED'; end if;
  if p_timezone is not null and not public.is_valid_timezone(p_timezone) then raise exception using errcode='P0001',message='INVALID_TIMEZONE'; end if;
  update public.profiles set full_name=coalesce(p_full_name,full_name),timezone=coalesce(p_timezone,timezone),theme_mode=coalesce(p_theme_mode,theme_mode),cloud_sync_enabled=coalesce(p_cloud_sync_enabled,cloud_sync_enabled)
  where user_id=u and (p_expected_version is null or version=p_expected_version) returning * into r;
  if not found then raise exception using errcode='P0001',message='VERSION_CONFLICT'; end if;
  return r;
end $$;

create function public.get_current_budget() returns jsonb language sql security definer set search_path='' as $$
with p as (select timezone from public.profiles where user_id=(select auth.uid())), bounds as (
 select date_trunc('month',now() at time zone timezone) local_start, timezone from p
), b as (select mb.* from public.monthly_budgets mb,bounds where mb.user_id=(select auth.uid()) and mb.month=bounds.local_start::date), u as (
 select coalesce(-sum(t.amount) filter(where t.type='EXPENSE'),0)::bigint used from public.transactions t,bounds where t.user_id=(select auth.uid()) and t.deleted_at is null and t.occurred_at >= bounds.local_start at time zone bounds.timezone and t.occurred_at < (bounds.local_start+interval '1 month') at time zone bounds.timezone
) select case when not exists(select 1 from b) then null else (select to_jsonb(b)-'user_id'||jsonb_build_object('used_amount',u.used,'remaining_amount',greatest(0,b.total_limit-u.used),'percent_used',case when b.total_limit=0 then 0 else 100.0*u.used/b.total_limit end,'day_of_month',extract(day from now() at time zone bounds.timezone)::integer,'days_in_month',extract(day from bounds.local_start+interval '1 month - 1 day')::integer,'days_left',extract(day from bounds.local_start+interval '1 month - 1 day')::integer-extract(day from now() at time zone bounds.timezone)::integer) from b,u,bounds) end
$$;

create function public.get_financial_summary() returns jsonb language sql security definer set search_path='' as $$
with p as (select timezone from public.profiles where user_id=(select auth.uid())), b as (select date_trunc('month',now() at time zone timezone) s,timezone from p), tx as (select t.* from public.transactions t,b where t.user_id=(select auth.uid()) and t.deleted_at is null and t.occurred_at>=b.s at time zone b.timezone and t.occurred_at<(b.s+interval '1 month') at time zone b.timezone)
select jsonb_build_object('total_balance',(select coalesce(sum(balance),0) from public.accounts where user_id=(select auth.uid()) and deleted_at is null),'total_income_month',coalesce((select sum(amount) from tx where type='INCOME'),0),'total_expense_month',coalesce((select -sum(amount) from tx where type='EXPENSE'),0),'percentage_change',null,'remaining_debt',(select coalesce(sum(total_amount-paid_amount),0) from public.debts where user_id=(select auth.uid()) and deleted_at is null),'recent_transactions',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select id,type,amount,category_name,description,occurred_at from public.transactions where user_id=(select auth.uid()) and deleted_at is null order by occurred_at desc limit 5)x))
$$;

create function public.get_analytics_overview() returns jsonb language sql security definer set search_path='' as $$
with p as (select timezone from public.profiles where user_id=(select auth.uid())), b as (select date_trunc('month',now() at time zone timezone) current_month,timezone from p), months as (select generate_series(b.current_month-interval '6 months',b.current_month,interval '1 month') m,b.timezone from b), tx as (select t.*,t.occurred_at at time zone b.timezone local_at from public.transactions t,b where t.user_id=(select auth.uid()) and t.deleted_at is null and t.occurred_at>=b.current_month at time zone b.timezone-interval '6 months' and t.occurred_at<(b.current_month+interval '1 month') at time zone b.timezone), buckets as (select m.m,coalesce(sum(tx.amount) filter(where tx.type='INCOME'),0)::bigint income,coalesce(-sum(tx.amount) filter(where tx.type='EXPENSE'),0)::bigint expense from months m left join tx on date_trunc('month',tx.local_at)=m.m group by m.m order by m.m), current_tx as (select tx.* from tx,b where date_trunc('month',tx.local_at)=b.current_month), cats as (select coalesce(category_name,'Lainnya') label,-sum(amount)::bigint amount from current_tx where type='EXPENSE' group by 1 order by 2 desc limit 6), totals as (select coalesce(sum(amount) filter(where type='INCOME'),0)::bigint income,coalesce(-sum(amount) filter(where type='EXPENSE'),0)::bigint expense from current_tx), prev as (select income,expense from buckets order by m desc offset 1 limit 1)
select jsonb_build_object('period','7m','month_label',to_char(b.current_month,'YYYY-MM'),'monthly_buckets',(select jsonb_agg(jsonb_build_object('month',to_char(m,'YYYY-MM'),'label',to_char(m,'Mon'),'income',income,'expense',expense,'net_savings',income-expense) order by m) from buckets),'kpis',jsonb_build_object('income',totals.income,'expense',totals.expense,'net_savings',totals.income-totals.expense,'income_change_percent',case when prev.income=0 then null else round(100.0*(totals.income-prev.income)/prev.income,2) end,'expense_change_percent',case when prev.expense=0 then null else round(100.0*(totals.expense-prev.expense)/prev.expense,2) end),'category_slices',(select coalesce(jsonb_agg(jsonb_build_object('label',label,'amount',amount,'percentage',case when totals.expense=0 then 0 else round(100.0*amount/totals.expense)::integer end,'color',coalesce((select color from public.categories where user_id=(select auth.uid()) and name=cats.label and type='EXPENSE' and deleted_at is null limit 1),'#FF6B6B'))),'[]') from cats),'quick_stats',jsonb_build_object('busiest_weekday',(select to_char(local_at,'FMDay') from current_tx where type='EXPENSE' group by 1 order by -sum(amount) desc limit 1),'largest_category',(select label from cats limit 1),'quietest_week',(select extract(day from local_at)::integer/7+1 from current_tx where type='EXPENSE' group by 1 order by -sum(amount) asc limit 1),'expense_transaction_count',(select count(*) from current_tx where type='EXPENSE')),'insight',case when totals.expense>totals.income then 'Pengeluaran bulan ini melebihi pemasukan.' when totals.income>0 then 'Pemasukan bulan ini lebih besar daripada pengeluaran.' else null end) from b,totals,prev
$$;

revoke execute on function public.is_valid_timezone(text),public.update_my_profile(text,text,text,boolean,integer),public.get_current_budget(),public.get_financial_summary(),public.get_analytics_overview() from public,anon;
grant execute on function public.update_my_profile(text,text,text,boolean,integer),public.get_current_budget(),public.get_financial_summary(),public.get_analytics_overview() to authenticated;
revoke update on public.profiles from authenticated;
