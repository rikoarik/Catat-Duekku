create or replace function public.create_money_transaction(p_account_id uuid,p_type public.transaction_type,p_amount bigint,p_category_id uuid,p_category_name text,p_description text,p_note text,p_occurred_at timestamptz,p_source public.transaction_source) returns public.transactions
language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid());a public.accounts;c public.categories;t public.transactions;signed bigint;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001';end if;
 select * into a from public.accounts where id=p_account_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'ACCOUNT_NOT_FOUND' using errcode='P0001';end if;
 if p_category_id is not null then
  select * into c from public.categories where id=p_category_id and user_id=u and deleted_at is null and type::text=p_type::text;
 elsif nullif(btrim(p_category_name),'') is not null then
  select * into c from public.categories where user_id=u and deleted_at is null and type::text=p_type::text and lower(name)=lower(btrim(p_category_name)) order by created_at limit 1;
 end if;
 if (p_category_id is not null or nullif(btrim(p_category_name),'') is not null) and c.id is null then raise exception 'CATEGORY_NOT_FOUND' using errcode='P0001';end if;
 signed:=case when p_type='EXPENSE' then -p_amount else p_amount end;
 if p_amount<1 or a.balance+signed not between -9000000000000000 and 9000000000000000 then raise exception 'INVALID_MONEY' using errcode='P0001';end if;
 update public.accounts set balance=balance+signed where id=a.id;
 insert into public.transactions(user_id,account_id,category_id,category_name,type,amount,description,note,occurred_at,source,resulting_balance) values(u,a.id,c.id,c.name,p_type,signed,p_description,p_note,p_occurred_at,p_source,a.balance+signed) returning * into t;
 return t;
end $$;

revoke execute on function public.create_money_transaction(uuid,public.transaction_type,bigint,uuid,text,text,text,timestamptz,public.transaction_source) from public,anon;
grant execute on function public.create_money_transaction(uuid,public.transaction_type,bigint,uuid,text,text,text,timestamptz,public.transaction_source) to authenticated;
