create function public.transfer_budget_allocation(p_source_id uuid,p_destination_id uuid,p_amount bigint,p_source_version integer,p_destination_version integer,p_note text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s public.budget_allocations; d public.budget_allocations; e uuid;
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 if p_source_id=p_destination_id or p_amount<1 or char_length(coalesce(p_note,''))>500 then raise exception 'INVALID_TRANSFER' using errcode='P0001'; end if;
 select * into s from public.budget_allocations where id=p_source_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'SOURCE_NOT_FOUND' using errcode='P0001'; end if;
 select * into d from public.budget_allocations where id=p_destination_id and user_id=u and deleted_at is null for update;
 if not found then raise exception 'DESTINATION_NOT_FOUND' using errcode='P0001'; end if;
 if s.cycle_id<>d.cycle_id then raise exception 'DIFFERENT_BUDGET_CYCLE' using errcode='P0001'; end if;
 if s.version<>p_source_version or d.version<>p_destination_version then raise exception 'VERSION_CONFLICT' using errcode='P0001'; end if;
 if s.allocated_amount<=p_amount then raise exception 'INSUFFICIENT_ALLOCATION' using errcode='P0001'; end if;
 update public.budget_allocations set allocated_amount=allocated_amount-p_amount,version=version+1 where id=s.id;
 update public.budget_allocations set allocated_amount=allocated_amount+p_amount,version=version+1 where id=d.id;
 insert into public.budget_allocation_events(user_id,cycle_id,event_type,source_allocation_id,destination_allocation_id,amount,before_state,after_state,note) values(u,s.cycle_id,'TRANSFERRED',s.id,d.id,p_amount,jsonb_build_object('source',to_jsonb(s),'destination',to_jsonb(d)),jsonb_build_object('source',jsonb_build_object('id',s.id,'label',s.label,'allocated_amount',s.allocated_amount-p_amount,'version',s.version+1),'destination',jsonb_build_object('id',d.id,'label',d.label,'allocated_amount',d.allocated_amount+p_amount,'version',d.version+1)),nullif(btrim(p_note),'')) returning id into e;
 return e;
end $$;

create function public.get_budget_allocation_history(p_cycle_id uuid) returns jsonb language sql security definer set search_path='' stable as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'event_type',e.event_type,'source_allocation_id',e.source_allocation_id,'source_label',e.before_state->'source'->>'label','destination_allocation_id',e.destination_allocation_id,'destination_label',coalesce(e.before_state->'destination'->>'label',e.after_state->>'label'),'amount',e.amount,'note',e.note,'occurred_at',e.occurred_at) order by e.occurred_at desc),'[]'::jsonb)
 from public.budget_allocation_events e where e.user_id=(select auth.uid()) and e.cycle_id=p_cycle_id
$$;

revoke execute on function public.transfer_budget_allocation(uuid,uuid,bigint,integer,integer,text),public.get_budget_allocation_history(uuid) from public,anon;
grant execute on function public.transfer_budget_allocation(uuid,uuid,bigint,integer,integer,text),public.get_budget_allocation_history(uuid) to authenticated;
