create function public.protect_virtual_savings_locks() returns trigger language plpgsql security definer set search_path='' as $$
declare locked bigint;
begin
 if new.balance>=old.balance then return new; end if;
 select coalesce(sum(locked_amount),0) into locked from public.saving_virtual_locks where account_id=old.id;
 if new.balance<locked then raise exception 'SAVINGS_LOCK_PROTECTED' using errcode='P0001'; end if;
 return new;
end $$;
create trigger accounts_protect_savings before update of balance on public.accounts for each row execute function public.protect_virtual_savings_locks();
revoke execute on function public.protect_virtual_savings_locks() from public,anon,authenticated;
