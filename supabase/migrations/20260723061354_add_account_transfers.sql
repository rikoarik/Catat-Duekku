create table public.account_transfers (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 source_account_id uuid not null,
 destination_account_id uuid not null,
 amount bigint not null check(amount between 1 and 9000000000000000),
 note text check(note is null or char_length(note)<=500),
 occurred_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 foreign key(source_account_id,user_id) references public.accounts(id,user_id),
 foreign key(destination_account_id,user_id) references public.accounts(id,user_id),
 check(source_account_id<>destination_account_id)
);
create index account_transfers_user_time_idx on public.account_transfers(user_id,occurred_at desc);
create index account_transfers_source_user_idx on public.account_transfers(source_account_id,user_id);
create index account_transfers_destination_user_idx on public.account_transfers(destination_account_id,user_id);
alter table public.account_transfers enable row level security;
create policy account_transfers_read on public.account_transfers for select to authenticated using((select auth.uid())=user_id);
revoke all on public.account_transfers from anon,authenticated;
grant select on public.account_transfers to authenticated;

create function public.transfer_between_accounts(p_source_id uuid,p_destination_id uuid,p_amount bigint,p_note text default null,p_occurred_at timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s public.accounts; d public.accounts; transfer_id uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_source_id=p_destination_id or p_amount<1 or p_amount>9000000000000000 or char_length(coalesce(p_note,''))>500 then raise exception 'INVALID_TRANSFER' using errcode='P0001'; end if;
 perform 1 from public.accounts where id in(p_source_id,p_destination_id) and user_id=u and deleted_at is null order by id for update;
 select * into s from public.accounts where id=p_source_id and user_id=u and deleted_at is null;
 if not found then raise exception 'SOURCE_NOT_FOUND' using errcode='P0001'; end if;
 select * into d from public.accounts where id=p_destination_id and user_id=u and deleted_at is null;
 if not found then raise exception 'DESTINATION_NOT_FOUND' using errcode='P0001'; end if;
 if s.balance<p_amount then raise exception 'INSUFFICIENT_BALANCE' using errcode='P0001'; end if;
 if d.balance>9000000000000000-p_amount then raise exception 'BALANCE_LIMIT_EXCEEDED' using errcode='P0001'; end if;
 update public.accounts set balance=balance-p_amount where id=s.id;
 update public.accounts set balance=balance+p_amount where id=d.id;
 insert into public.account_transfers(user_id,source_account_id,destination_account_id,amount,note,occurred_at) values(u,s.id,d.id,p_amount,nullif(btrim(p_note),''),coalesce(p_occurred_at,now())) returning id into transfer_id;
 return transfer_id;
end $$;
revoke execute on function public.transfer_between_accounts(uuid,uuid,bigint,text,timestamptz) from public,anon;
grant execute on function public.transfer_between_accounts(uuid,uuid,bigint,text,timestamptz) to authenticated;
