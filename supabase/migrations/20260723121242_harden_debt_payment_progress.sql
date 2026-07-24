update public.debts
set paid_installments = case when paid_amount >= total_amount then tenor_months else least(tenor_months, (paid_amount / monthly_amount)::integer) end,
    due_date = (start_date + make_interval(months => tenor_months))::date
where paid_installments <> case when paid_amount >= total_amount then tenor_months else least(tenor_months, (paid_amount / monthly_amount)::integer) end
   or due_date is distinct from (start_date + make_interval(months => tenor_months))::date;

alter table public.debts alter column due_date set not null;
alter table public.debts add constraint debts_paid_progress_consistent check (paid_installments = case when paid_amount >= total_amount then tenor_months else least(tenor_months, (paid_amount / monthly_amount)::integer) end) not valid;
alter table public.debts add constraint debts_due_date_consistent check (due_date = (start_date + make_interval(months => tenor_months))::date) not valid;
alter table public.debts validate constraint debts_paid_progress_consistent;
alter table public.debts validate constraint debts_due_date_consistent;

create or replace function public.record_debt_payment_v2(p_debt_id uuid,p_account_id uuid,p_amount bigint,p_note text,p_occurred_at timestamptz,p_expected_version integer,p_operation_key text) returns public.debt_payments language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();d public.debts;a public.accounts;p public.debt_payments;next_paid bigint;next_installments integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001';end if;
 if p_amount not between 1 and 9000000000000000 or p_expected_version<1 or nullif(btrim(p_operation_key),'') is null or char_length(p_operation_key)>200 then raise exception 'INVALID_PAYMENT' using errcode='P0001';end if;
 select * into p from public.debt_payments where user_id=u and operation_key=p_operation_key;if found then return p;end if;
 select * into a from public.accounts where id=p_account_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode='P0001';end if;
 select * into d from public.debts where id=p_debt_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'DEBT_NOT_FOUND' using errcode='P0001';end if;
 if d.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='P0001';end if;
 next_paid:=d.paid_amount+p_amount;
 if next_paid>d.total_amount then raise exception 'PAYMENT_EXCEEDS_REMAINING' using errcode='P0001';end if;
 if a.balance<p_amount then raise exception 'INSUFFICIENT_BALANCE' using errcode='P0001';end if;
 next_installments:=case when next_paid>=d.total_amount then d.tenor_months else least(d.tenor_months,(next_paid/d.monthly_amount)::integer) end;
 update public.accounts set balance=balance-p_amount where id=a.id;
 insert into public.debt_payments(user_id,debt_id,account_id,operation_key,amount,note,occurred_at) values(u,d.id,a.id,p_operation_key,p_amount,nullif(btrim(p_note),''),coalesce(p_occurred_at,now())) returning * into p;
 update public.debts set paid_amount=next_paid,paid_installments=next_installments where id=d.id;
 return p;
end $$;

create function public.update_debt(p_id uuid,p_name text,p_total_amount bigint,p_tenor_months integer,p_start_date date,p_expected_version integer) returns public.debts language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();d public.debts;monthly bigint;installments integer;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001';end if;
 if nullif(btrim(p_name),'') is null or char_length(p_name)>100 or p_total_amount not between 1 and 9000000000000000 or p_tenor_months not between 1 and 600 or p_start_date is null or p_expected_version<1 then raise exception 'INVALID_DEBT' using errcode='P0001';end if;
 select * into d from public.debts where id=p_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'DEBT_NOT_FOUND' using errcode='P0001';end if;
 if d.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='P0001';end if;
 if p_total_amount<d.paid_amount then raise exception 'TOTAL_BELOW_PAID' using errcode='P0001';end if;
 monthly:=ceil(p_total_amount::numeric/p_tenor_months)::bigint;
 installments:=case when d.paid_amount>=p_total_amount then p_tenor_months else least(p_tenor_months,(d.paid_amount/monthly)::integer) end;
 update public.debts set name=btrim(p_name),total_amount=p_total_amount,tenor_months=p_tenor_months,monthly_amount=monthly,paid_installments=installments,start_date=p_start_date,due_date=(p_start_date+make_interval(months=>p_tenor_months))::date where id=d.id returning * into d;
 return d;
end $$;

revoke execute on function public.record_debt_payment(uuid,bigint,text,timestamptz,integer) from public,anon,authenticated;
revoke execute on function public.record_debt_payment_v2(uuid,uuid,bigint,text,timestamptz,integer,text),public.update_debt(uuid,text,bigint,integer,date,integer) from public,anon;
grant execute on function public.record_debt_payment_v2(uuid,uuid,bigint,text,timestamptz,integer,text),public.update_debt(uuid,text,bigint,integer,date,integer) to authenticated;
