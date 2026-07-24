create table public.notification_deliveries (
  id bigint generated always as identity primary key,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  token text not null references public.push_tokens(token) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'accepted', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  expo_ticket_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, token)
);

create index notification_deliveries_pending_idx on public.notification_deliveries (next_attempt_at, id) where status in ('pending', 'failed');
alter table public.notification_deliveries enable row level security;
revoke all on table public.notification_deliveries from public, anon, authenticated;

create function public.enqueue_notification_deliveries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_deliveries (notification_id, token)
  select new.id, token from public.push_tokens where user_id = new.user_id
  on conflict do nothing;
  return new;
end;
$$;

create trigger enqueue_notification_push
after insert on public.notifications
for each row execute function public.enqueue_notification_deliveries();

create function public.claim_notification_deliveries(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then raise exception 'limit must be between 1 and 100' using errcode = '22023'; end if;
  with claimed as (
    select d.id
    from public.notification_deliveries d
    where d.status in ('pending', 'failed') and d.next_attempt_at <= now() and d.attempt_count < 5
    order by d.next_attempt_at, d.id
    for update skip locked
    limit p_limit
  ), updated as (
    update public.notification_deliveries d
    set status = 'processing', attempt_count = attempt_count + 1, updated_at = now()
    from claimed
    where d.id = claimed.id
    returning d.id, d.token, d.notification_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'token', u.token, 'title', n.title, 'message', n.message, 'url', case when n.url in ('/notifications', '/transactions', '/budget') then n.url else '/notifications' end) order by u.id), '[]'::jsonb)
  into v_result
  from updated u join public.notifications n on n.id = u.notification_id;
  return v_result;
end;
$$;

create function public.complete_notification_delivery(p_id bigint, p_ticket_id text default null, p_error text default null, p_permanent boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_deliveries
  set status = case when p_error is null then 'accepted' else 'failed' end,
      expo_ticket_id = p_ticket_id,
      last_error = left(p_error, 500),
      next_attempt_at = case when p_error is null or p_permanent then next_attempt_at else now() + make_interval(secs => least(3600, 30 * power(2, attempt_count - 1)::integer)) end,
      attempt_count = case when p_permanent then 5 else attempt_count end,
      updated_at = now()
  where id = p_id and status = 'processing';
end;
$$;

revoke execute on function public.enqueue_notification_deliveries() from public, anon, authenticated;
revoke execute on function public.claim_notification_deliveries(integer) from public, anon, authenticated;
revoke execute on function public.complete_notification_delivery(bigint, text, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(integer) to service_role;
grant execute on function public.complete_notification_delivery(bigint, text, text, boolean) to service_role;
