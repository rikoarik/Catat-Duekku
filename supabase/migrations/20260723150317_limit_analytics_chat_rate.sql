create or replace function public.consume_api_rate_limit(p_route text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := (select auth.uid());
  n integer;
  w timestamptz := date_trunc('minute', now());
  lim integer := case when p_route in ('POST /api/v1/parser', 'POST /api/v1/parser/image', 'POST /api/v1/analytics/chat') then 20 else 120 end;
begin
  if u is null then raise exception using errcode='P0001', message='AUTH_REQUIRED'; end if;
  insert into public.api_rate_limits(user_id, route, window_start) values (u, p_route, w)
  on conflict(user_id, route, window_start) do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into n;
  return jsonb_build_object('allowed', n <= lim, 'count', n, 'retry_after', greatest(1, ceil(extract(epoch from w + interval '1 minute' - now()))::integer));
end $$;
