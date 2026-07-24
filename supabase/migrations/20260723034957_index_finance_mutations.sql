drop index public.saving_goal_mutations_goal_occurred_idx;
drop index public.debt_payments_debt_occurred_idx;
create index saving_goal_mutations_goal_user_occurred_idx on public.saving_goal_mutations (goal_id, user_id, occurred_at desc);
create index debt_payments_debt_user_occurred_idx on public.debt_payments (debt_id, user_id, occurred_at desc);
