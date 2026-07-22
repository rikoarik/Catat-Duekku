create function public.set_account_balance(p_id uuid, p_balance bigint, p_expected_version integer)
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.accounts;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if p_balance is null or p_balance not between 0 and 9000000000000000 then raise exception 'INVALID_MONEY' using errcode = 'P0001'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception 'VERSION_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_account from public.accounts where id = p_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_account.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'P0001'; end if;
  if v_account.balance = p_balance then return v_account; end if;
  update public.accounts set balance = p_balance where id = p_id returning * into v_account;
  return v_account;
end;
$$;

revoke execute on function public.set_account_balance(uuid, bigint, integer) from public, anon;
grant execute on function public.set_account_balance(uuid, bigint, integer) to authenticated;
