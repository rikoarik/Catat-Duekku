begin;
select plan(9);

select has_function('public','update_my_profile',array['text','text','text','boolean','integer'],'profile patch RPC exists');
select function_privs_are('public','update_my_profile',array['text','text','text','boolean','integer'],'authenticated',array['EXECUTE'],'profile RPC is narrowly granted');
select table_privs_are('public','profiles','authenticated',array['SELECT'],'profiles has no direct update grant');
select function_privs_are('public','get_current_budget',array[]::text[],'authenticated',array['EXECUTE'],'budget aggregate is granted');
select function_privs_are('public','get_financial_summary',array[]::text[],'authenticated',array['EXECUTE'],'summary aggregate is granted');
select function_privs_are('public','get_analytics_overview',array[]::text[],'authenticated',array['EXECUTE'],'analytics aggregate is granted');
select ok(public.is_valid_timezone('Asia/Jakarta'),'known timezone accepted');
select ok(not public.is_valid_timezone('Etc/Definitely_Not_A_Zone'),'unknown timezone rejected');
select col_has_check('public','debts','paid_installments','paid installments are constrained');

select * from finish();
rollback;
