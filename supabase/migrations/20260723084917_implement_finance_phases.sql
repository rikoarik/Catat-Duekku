alter table public.transactions add column operation_key text;
create unique index transactions_user_operation_key_idx on public.transactions(user_id,operation_key) where operation_key is not null;

create function public.get_parser_finance_preview(p_account_id uuid,p_amount bigint,p_type public.transaction_type) returns jsonb language plpgsql security definer set search_path='' stable as $$
declare u uuid:=auth.uid(); a public.accounts; locked bigint; safe bigint; goals jsonb; debts jsonb;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_amount<1 then raise exception 'INVALID_MONEY' using errcode='P0001'; end if;
 select * into a from public.accounts where id=p_account_id and user_id=u and deleted_at is null;
 if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode='P0001'; end if;
 select coalesce(sum(locked_amount),0) into locked from public.saving_virtual_locks where account_id=a.id;
 safe:=greatest(a.balance-locked,0);
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'kind','GOAL','maximum',g.target_amount-g.saved_amount,'recommended',least(g.target_amount-g.saved_amount,greatest(p_amount/2,0))) order by case g.priority when 'CRITICAL' then 1 when 'HIGH' then 2 when 'NORMAL' then 3 else 4 end,g.target_date nulls last,g.created_at,g.id),'[]') into goals from public.saving_goals g where g.user_id=u and g.deleted_at is null and g.lifecycle_status='ACTIVE' and g.funding_mode is not null and g.saved_amount<g.target_amount;
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'kind','DEBT','maximum',d.total_amount-d.paid_amount,'recommended',least(d.total_amount-d.paid_amount,greatest(p_amount/4,0))) order by d.due_date nulls last,d.created_at,d.id),'[]') into debts from public.debts d where d.user_id=u and d.deleted_at is null and d.paid_amount<d.total_amount;
 return jsonb_build_object('balance',a.balance,'protected_amount',locked,'safe_available',safe,'protected_shortfall',case when p_type='EXPENSE' then greatest(p_amount-safe,0) else 0 end,'goals',goals,'debts',debts,'free_remainder',p_amount);
end $$;

create function public.create_parser_expense(p_account_id uuid,p_amount bigint,p_category_name text,p_description text,p_override_protected boolean,p_operation_key text) returns public.transactions language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a public.accounts; t public.transactions; l record; needed bigint; take bigint; category_id uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_amount<1 or p_operation_key is null or char_length(p_operation_key)<8 then raise exception 'INVALID_MONEY' using errcode='P0001'; end if;
 select * into t from public.transactions where user_id=u and operation_key=p_operation_key;
 if found then return t; end if;
 select * into a from public.accounts where id=p_account_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode='P0001'; end if;
 select greatest(p_amount-(a.balance-coalesce(sum(v.locked_amount),0)),0) into needed from public.saving_virtual_locks v where v.account_id=a.id;
 if needed>0 and not p_override_protected then raise exception 'PROTECTED_FUNDS_CONFIRMATION_REQUIRED' using errcode='P0001'; end if;
 for l in select v.id lock_id,v.goal_id,v.locked_amount,g.saved_amount,g.name from public.saving_virtual_locks v join public.saving_goals g on g.id=v.goal_id where v.account_id=a.id and v.user_id=u order by case g.priority when 'LOW' then 1 when 'NORMAL' then 2 when 'HIGH' then 3 else 4 end,g.target_date desc nulls first,g.created_at desc,g.id for update of v,g loop
  exit when needed=0; take:=least(needed,l.locked_amount);
  if take=l.locked_amount then delete from public.saving_virtual_locks where id=l.lock_id; else update public.saving_virtual_locks set locked_amount=locked_amount-take where id=l.lock_id; end if;
   update public.saving_goals set saved_amount=saved_amount-take,lifecycle_status='ACTIVE' where id=l.goal_id;
  insert into public.saving_goal_mutations(user_id,goal_id,account_id,operation_key,kind,amount,note) values(u,l.goal_id,a.id,p_operation_key||'-'||l.goal_id,'WITHDRAWAL',take,'Override dana terlindungi untuk pengeluaran');
  needed:=needed-take;
 end loop;
 if needed>0 then raise exception 'INSUFFICIENT_PROTECTED_FUNDS' using errcode='P0001'; end if;
 select id into category_id from public.categories where user_id=u and deleted_at is null and type='EXPENSE' and lower(name)=lower(btrim(p_category_name)) order by created_at limit 1;
 t:=public.create_money_transaction(p_account_id,'EXPENSE',p_amount,category_id,null,p_description,null,now(),'PARSER');
 update public.transactions set operation_key=p_operation_key where id=t.id returning * into t;
 return t;
end $$;

create function public.record_salary_income(p_account_id uuid,p_amount bigint,p_category_name text,p_description text,p_operation_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t public.transactions; c public.budget_cycles; plan public.budget_income_plans; safe bigint; planned bigint; category_id uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_amount<1 or p_operation_key is null or char_length(p_operation_key)<8 then raise exception 'INVALID_MONEY' using errcode='P0001'; end if;
 select * into t from public.transactions where user_id=u and operation_key=p_operation_key;
 if found then return jsonb_build_object('transaction_id',t.id,'planned_amount',0,'safe_amount',0); end if;
 select id into category_id from public.categories where user_id=u and deleted_at is null and type='INCOME' and lower(name)=lower(btrim(p_category_name)) order by created_at limit 1;
 t:=public.create_money_transaction(p_account_id,'INCOME',p_amount,category_id,null,p_description,null,now(),'PARSER');
 update public.transactions set operation_key=p_operation_key where id=t.id returning * into t;
 select * into c from public.budget_cycles where user_id=u and status='ACTIVE' order by start_date desc limit 1 for update;
 if found then
  select * into plan from public.budget_income_plans where cycle_id=c.id and status='EXPECTED' order by abs(expected_amount-p_amount),expected_date,id limit 1 for update;
  if found then update public.budget_income_plans set status='RECEIVED' where id=plan.id; end if;
 end if;
 select greatest(a.balance-coalesce((select sum(v.locked_amount) from public.saving_virtual_locks v where v.account_id=a.id),0)-coalesce(c.minimum_balance,0),0) into safe from public.accounts a where a.id=p_account_id;
 planned:=least(p_amount,coalesce(c.savings_target,0));
 return jsonb_build_object('transaction_id',t.id,'planned_amount',planned,'safe_amount',least(p_amount,safe));
end $$;

create function public.apply_salary_savings(p_account_id uuid,p_amount bigint,p_choice text,p_operation_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); remaining bigint:=p_amount; g public.saving_goals; take bigint; applied bigint:=0;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_choice not in('PLANNED','SAFE','SKIP') or p_amount<0 then raise exception 'INVALID_SAVINGS_CHOICE' using errcode='P0001'; end if;
 if p_choice='SKIP' then return jsonb_build_object('applied',0); end if;
 for g in select * from public.saving_goals where user_id=u and deleted_at is null and lifecycle_status='ACTIVE' and funding_mode is not null and saved_amount<target_amount order by case priority when 'CRITICAL' then 1 when 'HIGH' then 2 when 'NORMAL' then 3 else 4 end,target_date nulls last,created_at,id for update loop
  exit when remaining=0; take:=least(remaining,g.target_amount-g.saved_amount);
  perform public.record_saving_goal_mutation_v3(g.id,p_account_id,'DEPOSIT',take,'Alokasi setelah pemasukan',g.version,p_operation_key||'-'||g.id);
  remaining:=remaining-take; applied:=applied+take;
 end loop;
 return jsonb_build_object('applied',applied,'remainder',remaining);
end $$;

create function public.apply_windfall_split(p_account_id uuid,p_amount bigint,p_category_name text,p_description text,p_allocations jsonb,p_operation_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); x jsonb; total bigint:=0; value bigint; g public.saving_goals; d public.debts; t public.transactions; category_id uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_amount<1 or jsonb_typeof(p_allocations)<>'array' or p_operation_key is null or char_length(p_operation_key)<8 then raise exception 'INVALID_WINDFALL_SPLIT' using errcode='P0001'; end if;
 select * into t from public.transactions where user_id=u and operation_key=p_operation_key;
 if found then return jsonb_build_object('transaction_id',t.id,'allocated',0,'free_remainder',p_amount); end if;
 select coalesce(sum((e->>'amount')::bigint),0) into total from jsonb_array_elements(p_allocations)e;
 if total>p_amount or total<0 then raise exception 'INVALID_WINDFALL_SPLIT' using errcode='P0001'; end if;
 select id into category_id from public.categories where user_id=u and deleted_at is null and type='INCOME' and lower(name)=lower(btrim(p_category_name)) order by created_at limit 1;
 t:=public.create_money_transaction(p_account_id,'INCOME',p_amount,category_id,null,p_description,null,now(),'PARSER');
 update public.transactions set operation_key=p_operation_key where id=t.id returning * into t;
 for x in select * from jsonb_array_elements(p_allocations) loop
  value:=(x->>'amount')::bigint; if value<1 then continue; end if;
  if x->>'kind'='GOAL' then select * into g from public.saving_goals where id=(x->>'id')::uuid and user_id=u and deleted_at is null and lifecycle_status='ACTIVE' and funding_mode is not null for update; if not found or value>g.target_amount-g.saved_amount then raise exception 'INVALID_GOAL_ALLOCATION' using errcode='P0001'; end if; perform public.record_saving_goal_mutation_v3(g.id,p_account_id,'DEPOSIT',value,'Pembagian pemasukan tak terduga',g.version,p_operation_key||'-goal-'||g.id);
  elsif x->>'kind'='DEBT' then select * into d from public.debts where id=(x->>'id')::uuid and user_id=u and deleted_at is null for update; if not found or value>d.total_amount-d.paid_amount then raise exception 'INVALID_DEBT_ALLOCATION' using errcode='P0001'; end if; perform public.record_debt_payment_v2(d.id,p_account_id,value,'Pembagian pemasukan tak terduga',now(),d.version,p_operation_key||'-debt-'||d.id);
  else raise exception 'INVALID_WINDFALL_SPLIT' using errcode='P0001'; end if;
 end loop;
 return jsonb_build_object('transaction_id',t.id,'allocated',total,'free_remainder',p_amount-total);
end $$;

revoke execute on function public.get_parser_finance_preview(uuid,bigint,public.transaction_type),public.create_parser_expense(uuid,bigint,text,text,boolean,text),public.record_salary_income(uuid,bigint,text,text,text),public.apply_salary_savings(uuid,bigint,text,text),public.apply_windfall_split(uuid,bigint,text,text,jsonb,text) from public,anon;
grant execute on function public.get_parser_finance_preview(uuid,bigint,public.transaction_type),public.create_parser_expense(uuid,bigint,text,text,boolean,text),public.record_salary_income(uuid,bigint,text,text,text),public.apply_salary_savings(uuid,bigint,text,text),public.apply_windfall_split(uuid,bigint,text,text,jsonb,text) to authenticated;
