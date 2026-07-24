revoke execute on function public.create_money_transaction(uuid,public.transaction_type,bigint,uuid,text,text,text,timestamptz,public.transaction_source) from public,anon;
grant execute on function public.create_money_transaction(uuid,public.transaction_type,bigint,uuid,text,text,text,timestamptz,public.transaction_source) to authenticated;
