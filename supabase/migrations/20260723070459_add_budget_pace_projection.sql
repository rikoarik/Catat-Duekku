create function public.get_budget_pace(p_cycle_id uuid) returns jsonb language sql security definer set search_path='' stable as $$
with c as(
 select *,least(greatest((now() at time zone timezone)::date-start_date,1),end_date-start_date)::numeric elapsed_days,(end_date-start_date)::numeric total_days
 from public.budget_cycles where id=p_cycle_id and user_id=(select auth.uid())
), a as(
 select ba.id,ba.label,ba.kind,ba.allocated_amount,c.start_date,c.end_date,c.elapsed_days,c.total_days
 from public.budget_allocations ba join c on c.id=ba.cycle_id where ba.deleted_at is null
), usage as(
 select a.*,coalesce(sum(-t.amount),0)::bigint used_amount
 from a left join c on true left join public.transactions t on t.user_id=(select auth.uid()) and t.category_id=(select category_id from public.budget_allocations where id=a.id) and t.type='EXPENSE' and t.deleted_at is null and (t.occurred_at at time zone (select timezone from c))::date>=a.start_date and (t.occurred_at at time zone (select timezone from c))::date<a.end_date
 group by a.id,a.label,a.kind,a.allocated_amount,a.start_date,a.end_date,a.elapsed_days,a.total_days
), pace as(
 select *,round(100*elapsed_days/total_days)::integer expected_percent,round(100.0*used_amount/allocated_amount)::integer actual_percent,case when used_amount>0 then start_date+ceil(allocated_amount/(used_amount/elapsed_days))::integer else null end projected_exhaustion_date
 from usage
)
select coalesce(jsonb_agg(jsonb_build_object('allocation_id',id,'label',label,'kind',kind,'expected_percent',expected_percent,'actual_percent',actual_percent,'pace_status',case when used_amount>allocated_amount then 'OVERSPENT' when actual_percent>expected_percent+15 then 'AT_RISK' else 'ON_TRACK' end,'projected_exhaustion_date',projected_exhaustion_date,'days_early',case when projected_exhaustion_date is not null then greatest(end_date-projected_exhaustion_date,0) else 0 end) order by actual_percent-expected_percent desc),'[]'::jsonb) from pace
$$;
revoke execute on function public.get_budget_pace(uuid) from public,anon;
grant execute on function public.get_budget_pace(uuid) to authenticated;
