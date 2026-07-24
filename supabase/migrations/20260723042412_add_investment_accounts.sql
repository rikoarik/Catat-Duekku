alter type public.account_kind add value if not exists 'INVESTMENT';

drop function public.update_account(uuid, text, integer);
create function public.update_account(p_id uuid, p_name text, p_kind public.account_kind, p_is_default boolean, p_account_number text, p_icon text, p_expected_version integer)
returns public.accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(p_name);
  v_account public.accounts;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if v_name is null or char_length(v_name) not between 1 and 100 then raise exception 'INVALID_NAME' using errcode = 'P0001'; end if;
  if p_account_number is not null and char_length(p_account_number) > 64 then raise exception 'INVALID_ACCOUNT_NUMBER' using errcode = 'P0001'; end if;
  if p_icon is not null and char_length(p_icon) > 64 then raise exception 'INVALID_ICON' using errcode = 'P0001'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception 'VERSION_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_account from public.accounts where id = p_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_account.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'P0001'; end if;
  if p_is_default then update public.accounts set is_default = false where user_id = v_user_id and id <> p_id and is_default and deleted_at is null; end if;
  if v_account.is_default and not p_is_default then raise exception 'DEFAULT_ACCOUNT_REQUIRED' using errcode = 'P0001'; end if;
  update public.accounts set name = v_name, kind = p_kind, is_default = p_is_default, account_number = nullif(btrim(p_account_number), ''), icon = nullif(btrim(p_icon), '') where id = p_id returning * into v_account;
  return v_account;
end;
$$;

revoke execute on function public.update_account(uuid, text, public.account_kind, boolean, text, text, integer) from public, anon;
grant execute on function public.update_account(uuid, text, public.account_kind, boolean, text, text, integer) to authenticated;
