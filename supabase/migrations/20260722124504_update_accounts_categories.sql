create function public.update_account(p_id uuid, p_name text, p_expected_version integer)
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
  if p_expected_version is null or p_expected_version < 1 then raise exception 'VERSION_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_account from public.accounts where id = p_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_account.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'P0001'; end if;
  update public.accounts set name = v_name where id = p_id returning * into v_account;
  return v_account;
end;
$$;

create function public.update_category(p_id uuid, p_name text, p_expected_version integer)
returns public.categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(p_name);
  v_category public.categories;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = 'P0001'; end if;
  if v_name is null or char_length(v_name) not between 1 and 100 then raise exception 'INVALID_NAME' using errcode = 'P0001'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception 'VERSION_REQUIRED' using errcode = 'P0001'; end if;
  select * into v_category from public.categories where id = p_id and user_id = v_user_id and deleted_at is null for update;
  if not found then raise exception 'CATEGORY_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_category.version <> p_expected_version then raise exception 'VERSION_CONFLICT' using errcode = 'P0001'; end if;
  update public.categories set name = v_name where id = p_id returning * into v_category;
  return v_category;
end;
$$;

revoke execute on function public.update_account(uuid, text, integer) from public, anon;
revoke execute on function public.update_category(uuid, text, integer) from public, anon;
grant execute on function public.update_account(uuid, text, integer) to authenticated;
grant execute on function public.update_category(uuid, text, integer) to authenticated;
