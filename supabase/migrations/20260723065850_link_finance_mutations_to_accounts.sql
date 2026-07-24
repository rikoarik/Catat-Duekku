alter table public.saving_goal_mutations add column account_id uuid, add column operation_key text;
alter table public.debt_payments add column account_id uuid, add column operation_key text;
alter table public.saving_goal_mutations add foreign key(account_id,user_id) references public.accounts(id,user_id);
alter table public.debt_payments add foreign key(account_id,user_id) references public.accounts(id,user_id);
create unique index saving_goal_mutations_operation_idx on public.saving_goal_mutations(user_id,operation_key) where operation_key is not null;
create unique index debt_payments_operation_idx on public.debt_payments(user_id,operation_key) where operation_key is not null;
create index saving_goal_mutations_account_user_idx on public.saving_goal_mutations(account_id,user_id) where account_id is not null;
create index debt_payments_account_user_idx on public.debt_payments(account_id,user_id) where account_id is not null;

create function public.record_saving_goal_mutation_v2(p_goal_id uuid,p_account_id uuid,p_kind public.saving_mutation_kind,p_amount bigint,p_note text,p_occurred_at timestamptz,p_expected_version integer,p_operation_key text) returns public.saving_goal_mutations language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); g public.saving_goals; a public.accounts; m public.saving_goal_mutations; next_goal bigint; delta bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_amount not between 1 and 9000000000000000 or p_expected_version<1 or nullif(btrim(p_operation_key),'') is null or char_length(p_operation_key)>200 then raise exception 'INVALID_MUTATION' using errcode='P0001'; end if;
 select * into m from public.saving_goal_mutations where user_id=u and operation_key=p_operation_key; if found then return m; end if;
 select * into a from public.accounts where id=p_account_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode='P0001'; end if;
 select * into g from public.saving_goals where id=p_goal_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'GOAL_NOT_FOUND' using errcode='P0001'; end if;
 if g.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='P0001'; end if;
 next_goal:=case when p_kind='DEPOSIT' then g.saved_amount+p_amount else g.saved_amount-p_amount end;
 delta:=case when p_kind='DEPOSIT' then -p_amount else p_amount end;
 if next_goal<0 or next_goal>9000000000000000 then raise exception 'INVALID_GOAL_BALANCE' using errcode='P0001'; end if;
 if a.balance+delta<0 then raise exception 'INSUFFICIENT_BALANCE' using errcode='P0001'; end if;
 if a.balance+delta>9000000000000000 then raise exception 'BALANCE_LIMIT_EXCEEDED' using errcode='P0001'; end if;
 update public.accounts set balance=balance+delta where id=a.id;
 insert into public.saving_goal_mutations(user_id,goal_id,account_id,operation_key,kind,amount,note,occurred_at) values(u,g.id,a.id,p_operation_key,p_kind,p_amount,nullif(btrim(p_note),''),coalesce(p_occurred_at,now())) returning * into m;
 update public.saving_goals set saved_amount=next_goal where id=g.id;
 return m;
end $$;

create function public.record_debt_payment_v2(p_debt_id uuid,p_account_id uuid,p_amount bigint,p_note text,p_occurred_at timestamptz,p_expected_version integer,p_operation_key text) returns public.debt_payments language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d public.debts; a public.accounts; p public.debt_payments; next_paid bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_amount not between 1 and 9000000000000000 or p_expected_version<1 or nullif(btrim(p_operation_key),'') is null or char_length(p_operation_key)>200 then raise exception 'INVALID_PAYMENT' using errcode='P0001'; end if;
 select * into p from public.debt_payments where user_id=u and operation_key=p_operation_key; if found then return p; end if;
 select * into a from public.accounts where id=p_account_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode='P0001'; end if;
 select * into d from public.debts where id=p_debt_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'DEBT_NOT_FOUND' using errcode='P0001'; end if;
 if d.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='P0001'; end if;
 next_paid:=d.paid_amount+p_amount;
 if next_paid>d.total_amount then raise exception 'PAYMENT_EXCEEDS_REMAINING' using errcode='P0001'; end if;
 if a.balance<p_amount then raise exception 'INSUFFICIENT_BALANCE' using errcode='P0001'; end if;
 update public.accounts set balance=balance-p_amount where id=a.id;
 insert into public.debt_payments(user_id,debt_id,account_id,operation_key,amount,note,occurred_at) values(u,d.id,a.id,p_operation_key,p_amount,nullif(btrim(p_note),''),coalesce(p_occurred_at,now())) returning * into p;
 update public.debts set paid_amount=next_paid where id=d.id;
 return p;
end $$;

revoke execute on function public.record_saving_goal_mutation_v2(uuid,uuid,public.saving_mutation_kind,bigint,text,timestamptz,integer,text),public.record_debt_payment_v2(uuid,uuid,bigint,text,timestamptz,integer,text) from public,anon;
grant execute on function public.record_saving_goal_mutation_v2(uuid,uuid,public.saving_mutation_kind,bigint,text,timestamptz,integer,text),public.record_debt_payment_v2(uuid,uuid,bigint,text,timestamptz,integer,text) to authenticated;
