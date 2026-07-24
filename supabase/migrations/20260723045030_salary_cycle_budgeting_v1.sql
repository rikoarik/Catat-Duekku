create table public.budget_cycles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null check(char_length(btrim(name)) between 1 and 100), start_date date not null, end_date date not null, timezone text not null, planned_income bigint not null check(planned_income between 1 and 9000000000000000), minimum_balance bigint not null default 0 check(minimum_balance between 0 and 9000000000000000), savings_target bigint not null default 0 check(savings_target between 0 and 9000000000000000), status text not null default 'ACTIVE' check(status in('ACTIVE','CLOSED')), version integer not null default 1 check(version>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id), check(end_date>start_date and end_date<=start_date+62), check(minimum_balance+savings_target<=planned_income)
);
create unique index budget_cycles_one_active_idx on public.budget_cycles(user_id) where status='ACTIVE';
create index budget_cycles_user_dates_idx on public.budget_cycles(user_id,start_date desc,end_date);
create trigger budget_cycles_updated before update on public.budget_cycles for each row execute function public.set_updated_at();

create table public.budget_allocations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, cycle_id uuid not null, category_id uuid not null, kind text not null check(kind in('CATEGORY','OBLIGATION')), label text not null check(char_length(btrim(label)) between 1 and 100), allocated_amount bigint not null check(allocated_amount between 1 and 9000000000000000), due_date date, sort_order integer not null default 0, version integer not null default 1 check(version>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, unique(id,user_id), foreign key(cycle_id,user_id) references public.budget_cycles(id,user_id) on delete cascade, foreign key(category_id,user_id) references public.categories(id,user_id), check(kind='OBLIGATION' or due_date is null)
);
create unique index budget_allocations_cycle_category_active_idx on public.budget_allocations(cycle_id,category_id) where deleted_at is null;
create index budget_allocations_cycle_active_idx on public.budget_allocations(cycle_id,sort_order) where deleted_at is null;
create index budget_allocations_category_user_idx on public.budget_allocations(category_id,user_id) where deleted_at is null;
create trigger budget_allocations_updated before update on public.budget_allocations for each row execute function public.set_updated_at();

create table public.budget_allocation_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, cycle_id uuid not null, event_type text not null check(event_type in('CREATED','REVISED','TRANSFERRED')), source_allocation_id uuid, destination_allocation_id uuid, amount bigint check(amount is null or amount>0), before_state jsonb, after_state jsonb, note text check(note is null or char_length(note)<=500), occurred_at timestamptz not null default now(), foreign key(cycle_id,user_id) references public.budget_cycles(id,user_id) on delete cascade
);
create index budget_events_cycle_time_idx on public.budget_allocation_events(cycle_id,occurred_at desc);
create index transactions_budget_usage_idx on public.transactions(user_id,category_id,occurred_at) where deleted_at is null and type='EXPENSE';

alter table public.budget_cycles enable row level security;
alter table public.budget_allocations enable row level security;
alter table public.budget_allocation_events enable row level security;
create policy budget_cycles_read on public.budget_cycles for select to authenticated using((select auth.uid())=user_id);
create policy budget_allocations_read on public.budget_allocations for select to authenticated using((select auth.uid())=user_id);
create policy budget_events_read on public.budget_allocation_events for select to authenticated using((select auth.uid())=user_id);
revoke all on public.budget_cycles,public.budget_allocations,public.budget_allocation_events from anon,authenticated;
grant select on public.budget_cycles,public.budget_allocations,public.budget_allocation_events to authenticated;

create function public.setup_budget_cycle(p_name text,p_start_date date,p_end_date date,p_planned_income bigint,p_minimum_balance bigint,p_savings_target bigint,p_allocations jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); z text; c public.budget_cycles; x jsonb; cat public.categories; allocated bigint:=0; a public.budget_allocations;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 select timezone into z from public.profiles where user_id=u;
 if p_end_date<=p_start_date or p_end_date>p_start_date+62 then raise exception 'INVALID_BUDGET_PERIOD' using errcode='P0001'; end if;
 if p_planned_income<1 or p_minimum_balance<0 or p_savings_target<0 then raise exception 'INVALID_MONEY' using errcode='P0001'; end if;
 if exists(select 1 from public.budget_cycles where user_id=u and status='ACTIVE') then raise exception 'ACTIVE_BUDGET_EXISTS' using errcode='P0001'; end if;
 if jsonb_typeof(p_allocations)<>'array' then raise exception 'INVALID_ALLOCATIONS' using errcode='P0001'; end if;
 select coalesce(sum((e->>'amount')::bigint),0) into allocated from jsonb_array_elements(p_allocations)e;
 if allocated+p_minimum_balance+p_savings_target>p_planned_income then raise exception 'ALLOCATION_EXCEEDS_AVAILABLE_PLAN' using errcode='P0001'; end if;
 insert into public.budget_cycles(user_id,name,start_date,end_date,timezone,planned_income,minimum_balance,savings_target) values(u,btrim(p_name),p_start_date,p_end_date,z,p_planned_income,p_minimum_balance,p_savings_target) returning * into c;
 for x in select * from jsonb_array_elements(p_allocations) loop
  select * into cat from public.categories where id=(x->>'category_id')::uuid and user_id=u and type='EXPENSE' and deleted_at is null;
  if not found then raise exception 'CATEGORY_NOT_FOUND' using errcode='P0001'; end if;
  insert into public.budget_allocations(user_id,cycle_id,category_id,kind,label,allocated_amount,due_date,sort_order) values(u,c.id,cat.id,case when x->>'kind'='OBLIGATION' then 'OBLIGATION' else 'CATEGORY' end,coalesce(nullif(btrim(x->>'label'),''),cat.name),(x->>'amount')::bigint,case when x->>'due_date' is null or x->>'due_date'='' then null else (x->>'due_date')::date end,coalesce((x->>'sort_order')::integer,0)) returning * into a;
  insert into public.budget_allocation_events(user_id,cycle_id,event_type,destination_allocation_id,after_state) values(u,c.id,'CREATED',a.id,to_jsonb(a));
 end loop;
 return c.id;
end $$;

create function public.get_budget_cycle_summary(p_cycle_id uuid default null) returns jsonb language sql security definer set search_path='' stable as $$
with c as(select * from public.budget_cycles where user_id=(select auth.uid()) and (id=p_cycle_id or p_cycle_id is null and status='ACTIVE') order by status='ACTIVE' desc,start_date desc limit 1),
a as(select ba.*,ct.name category_name,ct.color from public.budget_allocations ba join c on c.id=ba.cycle_id join public.categories ct on ct.id=ba.category_id where ba.deleted_at is null),
u as(select a.id,coalesce(sum(-t.amount),0)::bigint used from a left join c on true left join public.transactions t on t.user_id=c.user_id and t.category_id=a.category_id and t.type='EXPENSE' and t.deleted_at is null and (t.occurred_at at time zone c.timezone)::date>=c.start_date and (t.occurred_at at time zone c.timezone)::date<c.end_date group by a.id),
tx as(select coalesce(sum(case when t.type='INCOME' then t.amount else 0 end),0)::bigint actual_income,coalesce(sum(case when t.type='EXPENSE' then -t.amount else 0 end),0)::bigint actual_expense from c left join public.transactions t on t.user_id=c.user_id and t.deleted_at is null and (t.occurred_at at time zone c.timezone)::date>=c.start_date and (t.occurred_at at time zone c.timezone)::date<c.end_date),
bal as(select coalesce(sum(ac.balance),0)::bigint balance from c left join public.accounts ac on ac.user_id=c.user_id and ac.deleted_at is null and ac.kind<>'INVESTMENT'),
calc as(select c.*,tx.*,bal.balance,coalesce((select sum(allocated_amount) from a),0)::bigint allocated,coalesce((select sum(greatest(a.allocated_amount-u.used,0)) from a join u using(id) where a.kind='OBLIGATION'),0)::bigint obligations_left,coalesce((select sum(greatest(a.allocated_amount-u.used,0)) from a join u using(id) where a.kind='CATEGORY'),0)::bigint flexible_left from c,tx,bal)
select case when not exists(select 1 from c) then null else jsonb_build_object('cycle',(select to_jsonb(c) from c),'totals',jsonb_build_object('actual_income',actual_income,'actual_expense',actual_expense,'allocated',allocated,'unallocated_plan',greatest(planned_income-minimum_balance-savings_target-allocated,0),'remaining_obligations',obligations_left,'remaining_flexible',flexible_left,'safe_to_spend',least(greatest(flexible_left+planned_income-minimum_balance-savings_target-allocated,0),greatest(balance-minimum_balance-savings_target-obligations_left,0)),'daily_safe_limit',floor(least(greatest(flexible_left+planned_income-minimum_balance-savings_target-allocated,0),greatest(balance-minimum_balance-savings_target-obligations_left,0))/greatest(end_date-greatest(current_date,start_date),1))),'allocations',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'kind',a.kind,'category_id',a.category_id,'category_name',a.category_name,'color',a.color,'label',a.label,'allocated_amount',a.allocated_amount,'used_amount',u.used,'remaining_amount',greatest(a.allocated_amount-u.used,0),'overspent_amount',greatest(u.used-a.allocated_amount,0),'percent_used',round(100.0*u.used/a.allocated_amount),'due_date',a.due_date,'version',a.version) order by a.sort_order),'[]') from a join u using(id))) end from calc $$;

revoke execute on function public.setup_budget_cycle(text,date,date,bigint,bigint,bigint,jsonb),public.get_budget_cycle_summary(uuid) from public,anon;
grant execute on function public.setup_budget_cycle(text,date,date,bigint,bigint,bigint,jsonb),public.get_budget_cycle_summary(uuid) to authenticated;
