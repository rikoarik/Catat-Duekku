create function public.delete_account(p_id uuid, p_expected_version integer default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_account public.accounts;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_account from public.accounts where id = p_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_expected_version is not null and v_account.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'P0001'; end if;
  if v_account.is_default then raise exception 'DEFAULT_ACCOUNT_DELETE_BLOCKED' using errcode = 'P0001'; end if;
  if v_account.balance <> 0 then raise exception 'ACCOUNT_BALANCE_NOT_ZERO' using errcode = 'P0001'; end if;
  if (select count(*) from public.accounts where user_id = v_user_id and deleted_at is null) <= 1 then raise exception 'LAST_ACCOUNT_DELETE_BLOCKED' using errcode = 'P0001'; end if;
  if exists (select 1 from public.transactions where user_id = v_user_id and account_id = p_id and deleted_at is null) then raise exception 'ACCOUNT_IN_USE' using errcode = 'P0001'; end if;
  update public.accounts set deleted_at = now() where id = p_id;
end;
$$;

create function public.delete_category(p_id uuid, p_expected_version integer default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_category public.categories;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_category from public.categories where id = p_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'CATEGORY_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_expected_version is not null and v_category.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'P0001'; end if;
  update public.categories set deleted_at = now() where id = p_id;
end;
$$;

revoke execute on function public.delete_account(uuid, integer) from public, anon, authenticated;
revoke execute on function public.delete_category(uuid, integer) from public, anon, authenticated;
grant execute on function public.delete_account(uuid, integer) to authenticated;
grant execute on function public.delete_category(uuid, integer) to authenticated;
