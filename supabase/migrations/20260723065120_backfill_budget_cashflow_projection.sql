insert into public.budget_cycle_accounts(cycle_id,user_id,account_id,opening_balance)
select c.id,c.user_id,a.id,a.balance from public.budget_cycles c join public.accounts a on a.user_id=c.user_id and a.deleted_at is null and a.kind<>'INVESTMENT'
where c.status='ACTIVE' and not exists(select 1 from public.budget_cycle_accounts bca where bca.cycle_id=c.id)
on conflict do nothing;
insert into public.budget_income_plans(cycle_id,user_id,name,expected_amount,expected_date)
select c.id,c.user_id,'Pemasukan berikutnya',c.planned_income,c.end_date from public.budget_cycles c
where c.status='ACTIVE' and not exists(select 1 from public.budget_income_plans bip where bip.cycle_id=c.id);
