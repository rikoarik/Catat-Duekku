create index budget_allocations_cycle_user_idx on public.budget_allocations(cycle_id,user_id);
create index budget_allocations_user_idx on public.budget_allocations(user_id);
create index budget_events_cycle_user_time_idx on public.budget_allocation_events(cycle_id,user_id,occurred_at desc);
create index budget_events_user_idx on public.budget_allocation_events(user_id);
