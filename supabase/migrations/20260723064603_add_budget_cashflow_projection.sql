create table public.budget_cycle_accounts (
 cycle_id uuid not null,
 user_id uuid not null,
 account_id uuid not null,
 opening_balance bigint not null,
 created_at timestamptz not null default now(),
 primary key(cycle_id,account_id),
 foreign key(cycle_id,user_id) references public.budget_cycles(id,user_id) on delete cascade,
 foreign key(account_id,user_id) references public.accounts(id,user_id)
);
create index budget_cycle_accounts_user_idx on public.budget_cycle_accounts(user_id);
create index budget_cycle_accounts_account_user_idx on public.budget_cycle_accounts(account_id,user_id);
alter table public.budget_cycle_accounts enable row level security;
create policy budget_cycle_accounts_read on public.budget_cycle_accounts for select to authenticated using((select auth.uid())=user_id);
revoke all on public.budget_cycle_accounts from anon,authenticated;
grant select on public.budget_cycle_accounts to authenticated;

create table public.budget_income_plans (
 id uuid primary key default gen_random_uuid(),
 cycle_id uuid not null,
 user_id uuid not null,
 name text not null check(char_length(btrim(name)) between 1 and 100),
 expected_amount bigint not null check(expected_amount between 1 and 9000000000000000),
 expected_date date not null,
 status text not null default 'EXPECTED' check(status in('EXPECTED','RECEIVED','CANCELLED')),
 created_at timestamptz not null default now(),
 foreign key(cycle_id,user_id) references public.budget_cycles(id,user_id) on delete cascade
);
create index budget_income_plans_cycle_user_idx on public.budget_income_plans(cycle_id,user_id,expected_date);
create index budget_income_plans_user_idx on public.budget_income_plans(user_id);
alter table public.budget_income_plans enable row level security;
create policy budget_income_plans_read on public.budget_income_plans for select to authenticated using((select auth.uid())=user_id);
revoke all on public.budget_income_plans from anon,authenticated;
grant select on public.budget_income_plans to authenticated;

create function public.setup_budget_cycle_v2(p_name text,p_start_date date,p_end_date date,p_planned_income bigint,p_expected_income_date date,p_minimum_balance bigint,p_savings_target bigint,p_account_ids uuid[],p_allocations jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); z text; c public.budget_cycles; x jsonb; cat public.categories; allocated bigint:=0; a public.budget_allocations; account_count integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 select timezone into z from public.profiles where user_id=u;
 if p_end_date<=p_start_date or p_end_date>p_start_date+62 or p_expected_income_date<p_start_date or p_expected_income_date>p_end_date then raise exception 'INVALID_BUDGET_PERIOD' using errcode='P0001'; end if;
 if p_planned_income<1 or p_minimum_balance<0 or p_savings_target<0 then raise exception 'INVALID_MONEY' using errcode='P0001'; end if;
 if exists(select 1 from public.budget_cycles where user_id=u and status='ACTIVE') then raise exception 'ACTIVE_BUDGET_EXISTS' using errcode='P0001'; end if;
 select count(*) into account_count from public.accounts where user_id=u and id=any(p_account_ids) and deleted_at is null and kind<>'INVESTMENT';
 if account_count=0 or account_count<>cardinality(p_account_ids) then raise exception 'INVALID_BUDGET_ACCOUNTS' using errcode='P0001'; end if;
 if jsonb_typeof(p_allocations)<>'array' then raise exception 'INVALID_ALLOCATIONS' using errcode='P0001'; end if;
 select coalesce(sum((e->>'amount')::bigint),0) into allocated from jsonb_array_elements(p_allocations)e;
 if allocated+p_minimum_balance+p_savings_target>p_planned_income then raise exception 'ALLOCATION_EXCEEDS_AVAILABLE_PLAN' using errcode='P0001'; end if;
 insert into public.budget_cycles(user_id,name,start_date,end_date,timezone,planned_income,minimum_balance,savings_target) values(u,btrim(p_name),p_start_date,p_end_date,z,p_planned_income,p_minimum_balance,p_savings_target) returning * into c;
 insert into public.budget_cycle_accounts(cycle_id,user_id,account_id,opening_balance) select c.id,u,id,balance from public.accounts where user_id=u and id=any(p_account_ids) and deleted_at is null;
 insert into public.budget_income_plans(cycle_id,user_id,name,expected_amount,expected_date) values(c.id,u,'Pemasukan berikutnya',p_planned_income,p_expected_income_date);
 for x in select * from jsonb_array_elements(p_allocations) loop
  select * into cat from public.categories where id=(x->>'category_id')::uuid and user_id=u and type='EXPENSE' and deleted_at is null;
  if not found then raise exception 'CATEGORY_NOT_FOUND' using errcode='P0001'; end if;
  insert into public.budget_allocations(user_id,cycle_id,category_id,kind,label,allocated_amount,due_date,sort_order) values(u,c.id,cat.id,case when x->>'kind'='OBLIGATION' then 'OBLIGATION' else 'CATEGORY' end,coalesce(nullif(btrim(x->>'label'),''),cat.name),(x->>'amount')::bigint,case when x->>'due_date' is null or x->>'due_date'='' then null else (x->>'due_date')::date end,coalesce((x->>'sort_order')::integer,0)) returning * into a;
  insert into public.budget_allocation_events(user_id,cycle_id,event_type,destination_allocation_id,after_state) values(u,c.id,'CREATED',a.id,to_jsonb(a));
 end loop;
 return c.id;
end $$;

create or replace function public.get_budget_cycle_summary(p_cycle_id uuid default null) returns jsonb language sql security definer set search_path='' stable as $$
with c as(select * from public.budget_cycles where user_id=(select auth.uid()) and (id=p_cycle_id or p_cycle_id is null and status='ACTIVE') order by status='ACTIVE' desc,start_date desc limit 1),
a as(select ba.*,ct.name category_name,ct.color from public.budget_allocations ba join c on c.id=ba.cycle_id join public.categories ct on ct.id=ba.category_id where ba.deleted_at is null),
u as(select a.id,coalesce(sum(-t.amount),0)::bigint used from a left join c on true left join public.transactions t on t.user_id=c.user_id and t.category_id=a.category_id and t.type='EXPENSE' and t.deleted_at is null and (t.occurred_at at time zone c.timezone)::date>=c.start_date and (t.occurred_at at time zone c.timezone)::date<c.end_date group by a.id),
tx as(select coalesce(sum(case when t.type='INCOME' then t.amount else 0 end),0)::bigint actual_income,coalesce(sum(case when t.type='EXPENSE' then -t.amount else 0 end),0)::bigint actual_expense from c left join public.transactions t on t.user_id=c.user_id and t.deleted_at is null and (t.occurred_at at time zone c.timezone)::date>=c.start_date and (t.occurred_at at time zone c.timezone)::date<c.end_date),
bal as(select coalesce(sum(ac.balance),0)::bigint balance from c join public.budget_cycle_accounts bca on bca.cycle_id=c.id join public.accounts ac on ac.id=bca.account_id and ac.deleted_at is null),
inc as(select coalesce(sum(case when bip.status='EXPECTED' then bip.expected_amount else 0 end),0)::bigint expected_income from c left join public.budget_income_plans bip on bip.cycle_id=c.id),
calc as(select c.*,tx.*,bal.balance,inc.expected_income,coalesce((select sum(allocated_amount) from a),0)::bigint allocated,coalesce((select sum(greatest(a.allocated_amount-u.used,0)) from a join u using(id) where a.kind='OBLIGATION'),0)::bigint obligations_left,coalesce((select sum(greatest(a.allocated_amount-u.used,0)) from a join u using(id) where a.kind='CATEGORY'),0)::bigint flexible_left from c,tx,bal,inc),
limits as(select *,greatest(balance-minimum_balance-savings_target-obligations_left,0)::bigint cash_safe,greatest(flexible_left,0)::bigint plan_safe from calc)
select case when not exists(select 1 from c) then null else jsonb_build_object('cycle',(select to_jsonb(c) from c),'totals',jsonb_build_object('operational_balance',balance,'actual_income',actual_income,'expected_income',expected_income,'actual_expense',actual_expense,'allocated',allocated,'unallocated_plan',greatest(planned_income-minimum_balance-savings_target-allocated,0),'remaining_obligations',obligations_left,'remaining_flexible',flexible_left,'safe_to_spend',least(plan_safe,cash_safe),'projected_safe_to_spend',least(plan_safe,greatest(balance+expected_income-minimum_balance-savings_target-obligations_left,0)),'daily_safe_limit',floor(least(plan_safe,cash_safe)/greatest(end_date-greatest((now() at time zone timezone)::date,start_date),1))),'accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',ac.id,'name',ac.name,'kind',ac.kind,'balance',ac.balance) order by ac.name),'[]') from public.budget_cycle_accounts bca join public.accounts ac on ac.id=bca.account_id where bca.cycle_id=(select id from c)),'income_plans',(select coalesce(jsonb_agg(jsonb_build_object('id',bip.id,'name',bip.name,'expected_amount',bip.expected_amount,'expected_date',bip.expected_date,'status',bip.status) order by bip.expected_date),'[]') from public.budget_income_plans bip where bip.cycle_id=(select id from c)),'allocations',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'kind',a.kind,'category_id',a.category_id,'category_name',a.category_name,'color',a.color,'label',a.label,'allocated_amount',a.allocated_amount,'used_amount',u.used,'remaining_amount',greatest(a.allocated_amount-u.used,0),'overspent_amount',greatest(u.used-a.allocated_amount,0),'percent_used',round(100.0*u.used/a.allocated_amount),'due_date',a.due_date,'version',a.version) order by a.sort_order),'[]') from a join u using(id))) end from limits $$;

revoke execute on function public.setup_budget_cycle_v2(text,date,date,bigint,date,bigint,bigint,uuid[],jsonb) from public,anon;
grant execute on function public.setup_budget_cycle_v2(text,date,date,bigint,date,bigint,bigint,uuid[],jsonb) to authenticated;
