\set ON_ERROR_STOP off
\pset tuples_only on
set client_min_messages = notice;

create schema t;
create function t.run_as(u uuid, q text) returns text language plpgsql as $$
declare r text;
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
  begin
    execute q into r;
    execute 'reset role';
    return coalesce(r, '(null)');
  exception when others then
    execute 'reset role';
    return 'ERROR: ' || sqlerrm;
  end;
end $$;
create function t.chk(label text, got text, want text) returns void language plpgsql as $$
begin
  if got like want then raise notice 'PASS  %  -> %', label, got;
  else raise notice 'FAIL  %  -> got [%] want [%]', label, got, want; end if;
end $$;

-- ids
\set own   '''a0000000-0000-0000-0000-000000000001'''
\set mer   '''a0000000-0000-0000-0000-000000000002'''
\set e1    '''a0000000-0000-0000-0000-000000000003'''
\set e2    '''a0000000-0000-0000-0000-000000000004'''
\set c1    '''a0000000-0000-0000-0000-000000000005'''
\set s1    '''a0000000-0000-0000-0000-000000000006'''
\set s2    '''a0000000-0000-0000-0000-000000000007'''
\set co1   '''a0000000-0000-0000-0000-000000000008'''
\set co2   '''a0000000-0000-0000-0000-000000000009'''
\set x1    '''a0000000-0000-0000-0000-00000000000a'''

-- setup as service role (bypasses guards the same way an Edge Function would)
select set_config('request.jwt.claim.role', 'service_role', false);
insert into auth.users(id, raw_user_meta_data) values
 (:own, '{"role":"customer","full_name":"Owner"}'), (:mer, '{"role":"merchant","full_name":"Merchant"}'),
 (:e1, '{"role":"employee","full_name":"Emp1"}'),   (:e2, '{"role":"employee","full_name":"Emp2"}'),
 (:c1, '{"role":"customer","full_name":"Cust"}'),   (:s1, '{"role":"customer","full_name":"StaffFin"}'),
 (:s2, '{"role":"customer","full_name":"StaffMer"}'),(:co1, '{"role":"company","full_name":"Co1"}'),
 (:co2, '{"role":"company","full_name":"Co2"}'),    (:x1, '{"role":"admin","full_name":"Attacker"}');
-- 0013 sign-up creates merchant/company rows itself; this fixture builds its own, so clear the automatic ones
delete from stores where merchant_id in (select id from merchants where owner_id = :mer);
delete from merchants where owner_id = :mer;
delete from companies where owner_id in (:co1, :co2);
insert into user_roles select :own, id from roles where name = 'admin';
insert into user_roles select :s1, id from roles where name = 'staff_financing';
insert into user_roles select :s2, id from roles where name = 'staff_merchants';
insert into companies(id, owner_id, name, status) values
 ('c0000000-0000-0000-0000-000000000001', :co1, 'Co One', 'active'),
 ('c0000000-0000-0000-0000-000000000002', :co2, 'Co Two', 'active');
insert into employees(id, user_id, company_id, eligibility, installment_limit) values
 ('e0000000-0000-0000-0000-000000000001', :e1, 'c0000000-0000-0000-0000-000000000001', 'eligible', 1000000),
 ('e0000000-0000-0000-0000-000000000002', :e2, 'c0000000-0000-0000-0000-000000000002', 'eligible', 1000000);
insert into merchants(id, owner_id, business_name) values ('f0000000-0000-0000-0000-000000000001', :mer, 'M');
insert into stores(id, merchant_id, name) values ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'S');
insert into products(id, store_id, name, cash_price, stock) values ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'P', 100000, 10);
select set_config('request.jwt.claim.role', '', false);

\echo === 1. Role assignment ===
select t.chk('attacker meta role=admin becomes customer only',
  (select string_agg(r.name, ',') from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = :x1), 'customer');
do $$ begin
  insert into user_roles select 'a0000000-0000-0000-0000-00000000000a', id from roles where name = 'admin';
  raise notice 'FAIL  second admin was allowed';
exception when others then raise notice 'PASS  second admin blocked -> %', sqlerrm; end $$;

\echo === 2. Merchant self-escalation ===
select t.run_as(:mer::uuid, $q$ with x as (update merchants set commission_percent = 1, status = 'active', rating = 5 returning 1) select count(*)::text from x $q$);
select t.chk('merchant cannot change own status/commission/rating',
  (select status || '/' || commission_percent || '/' || rating from merchants where owner_id = :mer), 'pending/5/0%');
select t.run_as(:mer::uuid, $q$ with x as (update products set featured = true, rating = 5 returning 1) select count(*)::text from x $q$);
select t.chk('merchant cannot feature/rate own product',
  (select featured || '/' || rating from products), 'false/0%');

\echo === 3. Commission auto + owner-only change ===
insert into orders(id, user_id, payment_method, recipient_name, phone, governorate, city, address, subtotal, total)
 values ('d0000000-0000-0000-0000-000000000001', :c1, 'cash_on_delivery', 'n', '1', 'g', 'c', 'a', 100000, 100000);
insert into order_items(order_id, product_id, merchant_id, quantity, unit_price)
 values ('d0000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 2, 50000);
select t.chk('5% default commission computed automatically',
  (select percent || '/' || gross || '/' || commission || '/' || net from commissions), '5/100000.00/5000.00/95000.00');
select t.run_as(:mer::uuid, $q$ select 'x' $q$);
select t.chk('owner sets commission 8', t.run_as(:own::uuid, $q$ with x as (update merchants set commission_percent = 8 returning 1) select count(*)::text from x $q$), '1');
select t.chk('commission 11 rejected', t.run_as(:own::uuid, $q$ with x as (update merchants set commission_percent = 11 returning 1) select count(*)::text from x $q$), 'ERROR%');
select t.chk('commission 0 rejected', t.run_as(:own::uuid, $q$ with x as (update merchants set commission_percent = 0 returning 1) select count(*)::text from x $q$), 'ERROR%');
insert into order_items(order_id, product_id, merchant_id, quantity, unit_price)
 values ('d0000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 1, 100000);
select t.chk('new item uses 8%, old row keeps 5% snapshot',
  (select string_agg(percent || ':' || commission, ',' order by percent) from commissions), '5:5000.00,8:8000.00');
select t.chk('commission change audited',
  (select count(*)::text from audit_logs where action = 'merchant_commission_changed'), '1');

\echo === 4. Orders / profile hardening ===
select t.chk('customer cannot insert an order directly',
  t.run_as(:c1::uuid, $q$ with x as (insert into orders(user_id,payment_method,recipient_name,phone,governorate,city,address,subtotal,total,status)
   values (auth.uid(),'cash_on_delivery','n','1','g','c','a',1,1,'delivered') returning 1) select count(*)::text from x $q$), 'ERROR%');
select t.run_as(:c1::uuid, $q$ with x as (update user_profiles set full_name = 'Z' returning 1) select count(*)::text from x $q$);
select t.chk('customer cannot self-verify or self-activate (write rejected)', t.run_as(:c1::uuid, $q$ update user_profiles set identity_status = 'verified', phone_verified = true, status = 'active' where id = auth.uid() returning 1 $q$), 'ERROR%permission denied%');
select t.chk('customer can edit name, statuses untouched',
  (select identity_status || '/' || phone_verified || '/' || status || '/' || full_name from user_profiles where id = :c1), 'none/false/pending/Z');

\echo === 5. Installment markup (default + per-user override) ===
select t.chk('guest/default quote 100000 x12', t.run_as(:e2::uuid, $q$ select deferred || '/' || monthly || '/' || last_installment from installment_quote(100000, 12) $q$), '122000/10167/10163');
select t.chk('customer cannot write pricing', t.run_as(:e1::uuid, $q$ with x as (insert into customer_pricing(user_id, markup_percent) values (auth.uid(), 0) returning 1) select count(*)::text from x $q$), 'ERROR%');
select t.chk('owner sets 15% for e1', t.run_as(:own::uuid, $q$ with x as (insert into customer_pricing(user_id, markup_percent, set_by) values ('a0000000-0000-0000-0000-000000000003', 15, auth.uid()) returning 1) select count(*)::text from x $q$), '1');
select t.chk('e1 quote now 15%', t.run_as(:e1::uuid, $q$ select deferred || '/' || markup from installment_quote(100000, 12) $q$), '115000/15.00');
select t.chk('e2 still default 22%', t.run_as(:e2::uuid, $q$ select markup::text from installment_quote(100000, 12) $q$), '22%');
select t.chk('e2 cannot read e1 markup', t.run_as(:e2::uuid, $q$ select effective_markup('a0000000-0000-0000-0000-000000000003')::text $q$), 'ERROR%');
select t.chk('e2 cannot quote for e1', t.run_as(:e2::uuid, $q$ select markup::text from installment_quote(100000, 12, 'a0000000-0000-0000-0000-000000000003') $q$), 'ERROR%');
select t.chk('e2 cannot see e1 pricing row', t.run_as(:e2::uuid, $q$ select count(*)::text from customer_pricing $q$), '0');
select t.chk('invalid duration rejected', t.run_as(:e1::uuid, $q$ select deferred::text from installment_quote(100000, 7) $q$), 'ERROR%');
select t.chk('internal _markup_for not callable', t.run_as(:e1::uuid, $q$ select _markup_for(auth.uid())::text $q$), 'ERROR%permission denied%');
select t.chk('pricing change audited', (select count(*)::text from audit_logs where action = 'customer_pricing_insert'), '1');

\echo === 6. Guarantees + branches ===
insert into branches(id, name, city, governorate, latitude, longitude) values
 ('b0000000-0000-0000-0000-000000000001', 'فرع تجريبي عدن', 'عدن', 'عدن', 12.7855, 45.0187),
 ('b0000000-0000-0000-0000-000000000002', 'فرع تجريبي صنعاء', 'صنعاء', 'أمانة العاصمة', 15.3694, 44.1910);
select set_config('t.c1', :c1::text, false);
select t.chk('guarantee types visible to customers', t.run_as(:c1::uuid, $q$ select count(*)::text from guarantee_types $q$), '5');
select t.chk('inactive old types hidden', t.run_as(:c1::uuid, $q$ select count(*)::text from guarantee_types where code = 'promissory_note' $q$), '0');
select t.chk('branches visible to customers', t.run_as(:c1::uuid, $q$ select count(*)::text from branches $q$), '2');
select t.chk('nearest branch to Aden', t.run_as(:c1::uuid, $q$ select name from nearest_branches(12.80, 45.00, 1) $q$), 'فرع تجريبي عدن');
select t.chk('nearest branch to Sanaa', t.run_as(:c1::uuid, $q$ select name from nearest_branches(15.35, 44.20, 1) $q$), 'فرع تجريبي صنعاء');

do $$ begin
  insert into financing_applications(employee_id, company_id, cash_price, deferred_price, months, branch_id)
  values ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 100000, 1, 12, 'b0000000-0000-0000-0000-000000000001');
  raise notice 'FAIL  application without guarantee accepted';
exception when others then raise notice 'PASS  guarantee mandatory -> %', sqlerrm; end $$;
do $$ begin
  insert into financing_applications(employee_id, company_id, cash_price, deferred_price, months, guarantee_type_id)
  values ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 100000, 1, 12,
          (select id from guarantee_types where code = 'salary_deduction'));
  raise notice 'FAIL  application without branch accepted';
exception when others then raise notice 'PASS  branch mandatory -> %', sqlerrm; end $$;
do $$ begin
  insert into financing_applications(applicant_user_id, cash_price, deferred_price, months, guarantee_type_id, branch_id)
  values (current_setting('t.c1')::uuid, 100000, 1, 12, (select id from guarantee_types where code = 'salary_deduction'),
          'b0000000-0000-0000-0000-000000000001');
  raise notice 'FAIL  customer got an employee-only guarantee';
exception when others then raise notice 'PASS  customer cannot use employee-only guarantee -> %', sqlerrm; end $$;
do $$ begin
  insert into financing_applications(employee_id, company_id, cash_price, deferred_price, months, guarantee_type_id, branch_id)
  values ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 100000, 1, 12,
          (select id from guarantee_types where code = 'gold'), 'b0000000-0000-0000-0000-000000000001');
  set constraints all immediate;
  raise notice 'FAIL  gold without details accepted';
exception when others then raise notice 'PASS  gold details required -> %', sqlerrm; end $$;
do $$ declare a uuid; begin
  insert into financing_applications(employee_id, company_id, cash_price, deferred_price, months, guarantee_type_id, branch_id)
  values ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 100000, 1, 12,
          (select id from guarantee_types where code = 'gold'), 'b0000000-0000-0000-0000-000000000001') returning id into a;
  insert into financing_guarantee_details(application_id, details) values (a, '{"weight_grams":0,"karat":"21","estimated_value":900000}');
  set constraints all immediate;
  raise notice 'FAIL  gold with zero weight accepted';
exception when others then raise notice 'PASS  gold weight must be positive -> %', sqlerrm; end $$;

-- customer (no employer): bank account guarantee, skips the company step; rolled back so counts below stay unchanged
do $$ declare s text; begin
  begin
    with a as (insert into financing_applications(applicant_user_id, cash_price, deferred_price, months, guarantee_type_id, branch_id)
      values (current_setting('t.c1')::uuid, 100000, 1, 12, (select id from guarantee_types where code = 'bank_account'),
              'b0000000-0000-0000-0000-000000000002') returning id)
    insert into financing_guarantee_details(application_id, details)
      select id, '{"bank_name":"X","account_number":"123","account_holder":"Cust"}' from a;
    set constraints all immediate;
    select status || '/' || review_stage || '/' || (company_id is null)::text || '/' || markup_percent_applied into s
      from financing_applications where applicant_user_id = current_setting('t.c1')::uuid;
    if s = 'awaiting_identity/admin/true/22.00' then raise notice 'PASS  customer application skips company step -> %', s;
    else raise notice 'FAIL  customer application -> %', s; end if;
    raise exception 'rollback';
  exception when others then
    if sqlerrm <> 'rollback' then raise notice 'FAIL  customer application errored -> %', sqlerrm; end if;
  end;
end $$;

begin;
insert into financing_applications(employee_id, company_id, cash_price, deferred_price, months, guarantee_type_id, branch_id)
 values ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 100000, 1, 12,
         (select id from guarantee_types where code = 'gold'), 'b0000000-0000-0000-0000-000000000001');
insert into financing_guarantee_details(application_id, details)
 select id, '{"weight_grams":20,"karat":"21","estimated_value":900000}' from financing_applications
 where employee_id = 'e0000000-0000-0000-0000-000000000001';
commit;
insert into financing_applications(employee_id, company_id, cash_price, deferred_price, months, guarantee_type_id, branch_id)
 values ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 100000, 1, 12,
         (select id from guarantee_types where code = 'salary_deduction'), 'b0000000-0000-0000-0000-000000000001');
select t.chk('applicant sees own guarantee details', t.run_as(:e1::uuid, $q$ select count(*)::text from financing_guarantee_details $q$), '1');
select t.chk('other employee cannot see them', t.run_as(:e2::uuid, $q$ select count(*)::text from financing_guarantee_details $q$), '0');
select t.chk('employer company cannot see bank/gold details', t.run_as(:co1::uuid, $q$ select count(*)::text from financing_guarantee_details $q$), '0');
select t.chk('financing staff can see details', t.run_as(:s1::uuid, $q$ select count(*)::text from financing_guarantee_details $q$), '1');
select t.chk('merchant cannot see details', t.run_as(:mer::uuid, $q$ select count(*)::text from financing_guarantee_details $q$), '0');
select t.chk('server recomputes price+markup (client value 1 ignored)',
  (select string_agg(markup_percent_applied || ':' || deferred_price || ':' || monthly_installment, ',' order by markup_percent_applied) from financing_applications),
  '15.00:115000.00:9583.00,22.00:122000.00:10167.00');
select t.chk('employee cannot create application directly',
  t.run_as(:e1::uuid, $q$ with x as (insert into financing_applications(employee_id, cash_price, deferred_price, months, guarantee_type_id)
   values ('e0000000-0000-0000-0000-000000000001', 1, 1, 6, 1) returning 1) select count(*)::text from x $q$), 'ERROR%');

\echo === 7. Tenant isolation ===
select t.chk('e1 sees only own application', t.run_as(:e1::uuid, $q$ select count(*)::text from financing_applications $q$), '1');
select t.chk('e2 sees only own application', t.run_as(:e2::uuid, $q$ select count(*)::text from financing_applications $q$), '1');
select t.chk('company1 sees only its employee app', t.run_as(:co1::uuid, $q$ select count(*)::text from financing_applications $q$), '1');
select t.chk('company1 sees only its employees', t.run_as(:co1::uuid, $q$ select count(*)::text from employees $q$), '1');
select t.chk('customer sees no applications', t.run_as(:c1::uuid, $q$ select count(*)::text from financing_applications $q$), '0');
select t.chk('customer cannot read other profiles', t.run_as(:c1::uuid, $q$ select count(*)::text from user_profiles $q$), '1');
select t.chk('customer cannot read audit logs', t.run_as(:c1::uuid, $q$ select count(*)::text from audit_logs $q$), '0');
select t.chk('customer cannot read otp table', t.run_as(:c1::uuid, $q$ select count(*)::text from otp_verifications $q$), '0');
select t.chk('merchant sees only own commissions', t.run_as(:mer::uuid, $q$ select count(*)::text from commissions $q$), '2');
select t.chk('merchant cannot read financing', t.run_as(:mer::uuid, $q$ select count(*)::text from financing_applications $q$), '0');
select t.chk('owner sees everything', t.run_as(:own::uuid, $q$ select count(*)::text from financing_applications $q$), '2');

\echo === 8. Staff permissions ===
select t.chk('financing staff sees applications', t.run_as(:s1::uuid, $q$ select count(*)::text from financing_applications $q$), '2');
select t.chk('merchant staff cannot see applications', t.run_as(:s2::uuid, $q$ select count(*)::text from financing_applications $q$), '0');
select t.chk('merchant staff sees merchants', t.run_as(:s2::uuid, $q$ select count(*)::text from merchants $q$), '1');
select t.chk('merchant staff can activate merchant', t.run_as(:s2::uuid, $q$ with x as (update merchants set status = 'active' returning 1) select count(*)::text from x $q$), '1');
select t.chk('merchant staff cannot change commission', t.run_as(:s2::uuid, $q$ with x as (update merchants set commission_percent = 1 returning 1) select count(*)::text from x $q$), '1');
select t.chk('...commission unchanged (still 8), status active', (select commission_percent || '/' || status from merchants), '8/active');
select t.chk('financing staff cannot see merchants', t.run_as(:s1::uuid, $q$ select count(*)::text from merchants $q$), '0');
select t.chk('non-owner cannot grant staff role', t.run_as(:e1::uuid, $q$ select grant_staff_role('a0000000-0000-0000-0000-00000000000a', 'staff_orders')::text $q$), 'ERROR%not allowed%');
select t.chk('staff cannot grant staff role', t.run_as(:s1::uuid, $q$ select grant_staff_role('a0000000-0000-0000-0000-00000000000a', 'staff_orders')::text $q$), 'ERROR%not allowed%');
select t.chk('owner grants staff_orders to x1', t.run_as(:own::uuid, $q$ select grant_staff_role('a0000000-0000-0000-0000-00000000000a', 'staff_orders')::text $q$), '%');
select t.chk('x1 now has orders.update', t.run_as(:x1::uuid, $q$ select has_permission('orders.update')::text $q$), 'true');
select t.chk('x1 lacks merchants.manage', t.run_as(:x1::uuid, $q$ select has_permission('merchants.manage')::text $q$), 'false');
select t.chk('x1 sees orders', t.run_as(:x1::uuid, $q$ select count(*)::text from orders $q$), '1');
select t.chk('owner revokes', t.run_as(:own::uuid, $q$ select revoke_staff_role('a0000000-0000-0000-0000-00000000000a', 'staff_orders')::text $q$), '%');
select t.chk('x1 loses access immediately', t.run_as(:x1::uuid, $q$ select count(*)::text from orders $q$), '0');
select t.chk('grant of non-staff role refused', t.run_as(:own::uuid, $q$ select grant_staff_role('a0000000-0000-0000-0000-00000000000a', 'merchant')::text $q$), 'ERROR%');

\echo === 9. Custom roles ===
select t.chk('owner creates accountant role', t.run_as(:own::uuid, $q$ select create_custom_role('staff_accountant', 'محاسب', array['reports.view','settlements.view'])::text $q$), '%');
select t.chk('bad slug refused', t.run_as(:own::uuid, $q$ select create_custom_role('admin', 'x', array['reports.view'])::text $q$), 'ERROR%');
select t.chk('unknown permission refused', t.run_as(:own::uuid, $q$ select create_custom_role('staff_xx', 'x', array['nope'])::text $q$), 'ERROR%');
select t.chk('non-owner cannot create role', t.run_as(:s1::uuid, $q$ select create_custom_role('staff_y', 'y', array['reports.view'])::text $q$), 'ERROR%not allowed%');
select t.chk('system role cannot be deleted', t.run_as(:own::uuid, $q$ select delete_custom_role('staff_financing')::text $q$), 'ERROR%');
select t.chk('holder of custom role gets its permissions', (
  select t.run_as(:own::uuid, $q$ select grant_staff_role('a0000000-0000-0000-0000-00000000000a', 'staff_accountant')::text $q$) || '|' ||
         t.run_as(:x1::uuid, $q$ select has_permission('settlements.view')::text $q$)), '%|true');
select t.chk('x1 sees commissions via settlements.view', t.run_as(:x1::uuid, $q$ select count(*)::text from commissions $q$), '2');
select t.run_as(:own::uuid, $q$ select set_role_permissions('staff_accountant', array['reports.view'])::text $q$);
select t.chk('set_role_permissions removes access', t.run_as(:x1::uuid, $q$ select count(*)::text from commissions $q$), '0');
select t.chk('delete custom role call', t.run_as(:own::uuid, $q$ select delete_custom_role('staff_accountant')::text $q$), '%');
select t.chk('deleting custom role strips it from holders', (select count(*)::text from user_roles ur join roles r on r.id = ur.role_id where r.name = 'staff_accountant'), '0');
select t.chk('financing.approve cannot be granted to a user', t.run_as(:own::uuid, $q$ select grant_user_permission('a0000000-0000-0000-0000-00000000000a', 'financing.approve')::text $q$), 'ERROR%');
select t.chk('role grants audited', (select (count(*) > 5)::text from audit_logs where action like '%role%'), 'true');

\echo === 10. Invoices ===
select t.chk('customer cannot issue invoice', t.run_as(:c1::uuid, $q$ select issue_invoice('d0000000-0000-0000-0000-000000000001')::text $q$), 'ERROR%not allowed%');
select t.chk('owner issues invoice', t.run_as(:own::uuid, $q$ select issue_invoice('d0000000-0000-0000-0000-000000000001')::text $q$), '1');
select t.chk('customer sees own invoice', t.run_as(:c1::uuid, $q$ select invoice_number from invoices $q$), 'INV-%');
select t.chk('other customer sees none', t.run_as(:e1::uuid, $q$ select count(*)::text from invoices $q$), '0');

\echo === 11. Public merchant listing hides commission ===
select t.chk('customer cannot read merchants table', t.run_as(:c1::uuid, $q$ select count(*)::text from merchants $q$), '0');
select t.chk('customer reads merchants_public', t.run_as(:c1::uuid, $q$ select count(*)::text from merchants_public $q$), '1');
select t.chk('merchants_public has no commission column', (select count(*)::text from information_schema.columns where table_name = 'merchants_public' and column_name in ('commission_percent','owner_id','sales_total')), '0');
select t.chk('merchant owner still sees own commission', t.run_as(:mer::uuid, $q$ select commission_percent::text from merchants $q$), '8');

\echo === 7. Product image uploads + delivery ===
update merchants set status = 'active' where id = 'f0000000-0000-0000-0000-000000000001';   -- as owner/service
select t.chk('bucket limits 5MB', (select file_size_limit::text from storage.buckets where id = 'product-images'), '5242880');
select t.chk('bucket allows only images', (select array_to_string(allowed_mime_types, ',') from storage.buckets where id = 'product-images'), 'image/jpeg,image/png,image/webp');
select t.chk('merchant uploads into own folder',
  t.run_as(:mer::uuid, $q$ insert into storage.objects(bucket_id, name) values ('product-images', 'f0000000-0000-0000-0000-000000000001/p1/a.jpg') returning name $q$), '%a.jpg');
select t.chk('merchant cannot upload into another folder',
  t.run_as(:mer::uuid, $q$ insert into storage.objects(bucket_id, name) values ('product-images', 'f0000000-0000-0000-0000-0000000000ff/p1/a.jpg') returning name $q$), 'ERROR%');
select t.chk('customer cannot upload',
  t.run_as(:c1::uuid, $q$ insert into storage.objects(bucket_id, name) values ('product-images', 'f0000000-0000-0000-0000-000000000001/p1/b.jpg') returning name $q$), 'ERROR%');
select t.chk('anyone can read product images', t.run_as(:c1::uuid, $q$ select count(*)::text from storage.objects where bucket_id = 'product-images' $q$), '1');
select t.chk('merchant adds image by uploaded path',
  t.run_as(:mer::uuid, $q$ insert into product_images(product_id, storage_path) values ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001/p1/a.jpg') returning 'ok' $q$), 'ok');
select t.chk('merchant cannot add image by URL',
  t.run_as(:mer::uuid, $q$ insert into product_images(product_id, url) values ('f2000000-0000-0000-0000-000000000001', 'https://evil.example/x.jpg') returning 'ok' $q$), 'ERROR%');
select t.chk('merchant cannot point to another merchant folder',
  t.run_as(:mer::uuid, $q$ insert into product_images(product_id, storage_path) values ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-0000000000ff/p1/a.jpg') returning 'ok' $q$), 'ERROR%');
select t.chk('customer cannot add product images',
  t.run_as(:c1::uuid, $q$ insert into product_images(product_id, storage_path) values ('f2000000-0000-0000-0000-000000000001', 'x/y.jpg') returning 'ok' $q$), 'ERROR%');
do $$ begin
  for i in 1..8 loop
    insert into product_images(product_id, storage_path) values ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001/p1/' || i || '.jpg');
  end loop;
  raise notice 'FAIL  more than 8 images accepted';
exception when others then raise notice 'PASS  max 8 images per product -> %', sqlerrm; end $$;

select t.chk('manual provider exists and API is off', (select api_enabled::text from shipping_providers where code = 'manual'), 'false');
select t.chk('merchant creates shipment for own order',
  t.run_as(:mer::uuid, $q$ insert into shipments(order_id, provider_id) select order_id, (select id from shipping_providers where code = 'manual') from order_items limit 1 returning status $q$), 'new');
select t.chk('customer cannot create shipment',
  t.run_as(:c1::uuid, $q$ insert into shipments(order_id) select id from orders limit 1 returning status $q$), 'ERROR%');

\echo === 8. Identity review workflow ===
\set v1 '''a0000000-0000-0000-0000-00000000000b'''
\set c2 '''a0000000-0000-0000-0000-00000000000c'''
select set_config('request.jwt.claim.role', 'service_role', false);
insert into auth.users(id, raw_user_meta_data) values
 (:v1, '{"role":"customer","full_name":"Verifier"}'), (:c2, '{"role":"customer","full_name":"Cust2"}');
insert into user_roles select :v1, id from roles where name = 'staff_verification';
update user_profiles set phone_verified = true where id in (:v1, :c1);
select set_config('request.jwt.claim.role', '', false);

select t.chk('c1 starts without identity', t.run_as(:c1::uuid, $q$ select identity_status || '/' || status from user_profiles where id = auth.uid() $q$), 'none/pending');
select t.chk('upload into own identity folder',
  t.run_as(:c1::uuid, $q$ insert into storage.objects(bucket_id, name) values ('identity-docs', 'a0000000-0000-0000-0000-000000000005/front.jpg') returning name $q$), '%front.jpg');
select t.chk('upload into someone else folder blocked',
  t.run_as(:c1::uuid, $q$ insert into storage.objects(bucket_id, name) values ('identity-docs', 'a0000000-0000-0000-0000-00000000000c/front.jpg') returning name $q$), 'ERROR%');
select t.chk('upload allowed without OTP (WhatsApp OTP removed)',
  t.run_as(:c2::uuid, $q$ insert into storage.objects(bucket_id, name) values ('identity-docs', 'a0000000-0000-0000-0000-00000000000c/front.jpg') returning name $q$), '%front.jpg');
select t.chk('reviewer cannot read identity files from storage',
  t.run_as(:v1::uuid, $q$ select count(*)::text from storage.objects where bucket_id = 'identity-docs' $q$), '0');
select t.chk('owner can read own identity files',
  t.run_as(:c1::uuid, $q$ select count(*)::text from storage.objects where bucket_id = 'identity-docs' $q$), '1');

select t.chk('submit rejects file paths of another user (no OTP needed)',
  t.run_as(:c2::uuid, $q$ select submit_identity('national_id', '{"front":"a0000000-0000-0000-0000-000000000005/f.jpg","back":"a0000000-0000-0000-0000-000000000005/b.jpg","selfie_with_id":"a0000000-0000-0000-0000-000000000005/s.jpg"}'::jsonb, true)::text $q$), 'ERROR%invalid file path%');
select t.chk('submit blocked without consent',
  t.run_as(:c1::uuid, $q$ select submit_identity('national_id', '{"front":"a0000000-0000-0000-0000-000000000005/f.jpg","back":"a0000000-0000-0000-0000-000000000005/b.jpg","selfie_with_id":"a0000000-0000-0000-0000-000000000005/s.jpg"}'::jsonb, false)::text $q$), 'ERROR%consent%');
select t.chk('national id needs all 3 photos',
  t.run_as(:c1::uuid, $q$ select submit_identity('national_id', '{"front":"a0000000-0000-0000-0000-000000000005/f.jpg"}'::jsonb, true)::text $q$), 'ERROR%missing file%');
select t.chk('files must live in own folder',
  t.run_as(:c1::uuid, $q$ select submit_identity('passport', '{"passport_photo":"a0000000-0000-0000-0000-00000000000c/p.jpg","selfie_with_passport":"a0000000-0000-0000-0000-000000000005/s.jpg"}'::jsonb, true)::text $q$), 'ERROR%invalid file path%');
select t.chk('passport needs exactly passport + selfie (extra file rejected)',
  t.run_as(:c1::uuid, $q$ select submit_identity('passport', '{"passport_photo":"a0000000-0000-0000-0000-000000000005/p.jpg","selfie_with_passport":"a0000000-0000-0000-0000-000000000005/s.jpg","front":"a0000000-0000-0000-0000-000000000005/f.jpg"}'::jsonb, true)::text $q$), 'ERROR%unexpected file%');

select t.chk('valid national id submitted',
  t.run_as(:c1::uuid, $q$ select submit_identity('national_id', '{"front":"a0000000-0000-0000-0000-000000000005/f.jpg","back":"a0000000-0000-0000-0000-000000000005/b.jpg","selfie_with_id":"a0000000-0000-0000-0000-000000000005/s.jpg"}'::jsonb, true)::text $q$), '%-%-%');
select t.chk('profile pending after submit', t.run_as(:c1::uuid, $q$ select identity_status from user_profiles where id = auth.uid() $q$), 'pending');
select t.chk('cannot submit twice while pending',
  t.run_as(:c1::uuid, $q$ select submit_identity('passport', '{"passport_photo":"a0000000-0000-0000-0000-000000000005/p.jpg","selfie_with_passport":"a0000000-0000-0000-0000-000000000005/s2.jpg"}'::jsonb, true)::text $q$), 'ERROR%already%');

select t.chk('user cannot self-verify', t.run_as(:c1::uuid, $q$ update user_profiles set identity_status = 'verified' where id = auth.uid() returning identity_status $q$), 'ERROR%permission denied%');
select t.chk('user cannot self-activate', t.run_as(:c1::uuid, $q$ update user_profiles set status = 'active' where id = auth.uid() returning status $q$), 'ERROR%permission denied%');
select t.chk('user cannot fake OTP flag', t.run_as(:c1::uuid, $q$ update user_profiles set phone_verified = true where id = auth.uid() returning 1 $q$), 'ERROR%permission denied%');
select t.chk('user can still edit own address', t.run_as(:c1::uuid, $q$ update user_profiles set city = 'Aden' where id = auth.uid() returning city $q$), 'Aden');
select t.chk('reviewer cannot directly write profile status', t.run_as(:v1::uuid, $q$ update user_profiles set status = 'active' where id = 'a0000000-0000-0000-0000-000000000005' returning 1 $q$), 'ERROR%permission denied%');
select t.chk('customer cannot review', t.run_as(:c1::uuid, $q$ select review_identity((select id from identity_submissions where user_id = auth.uid()), 'approved', null) $q$), 'ERROR%not allowed%');
select t.chk('merchant staff cannot review', t.run_as(:s2::uuid, $q$ select review_identity((select id from identity_submissions limit 1), 'approved', null) $q$), 'ERROR%not allowed%');
select t.chk('reviewer cannot see file access without logging: access logged',
  t.run_as(:v1::uuid, $q$ select (request_identity_file_access((select id from identity_submissions where user_id = 'a0000000-0000-0000-0000-000000000005')) ->> 'front') $q$), '%f.jpg');
select t.chk('file access was audited', (select count(*)::text from audit_logs where action = 'identity_file_access'), '1');
select t.chk('non-reviewer cannot request file access',
  t.run_as(:c2::uuid, $q$ select request_identity_file_access((select id from identity_submissions limit 1))::text $q$), 'ERROR%not allowed%');

select t.chk('reject needs a reason', t.run_as(:v1::uuid, $q$ select review_identity((select id from identity_submissions where user_id = 'a0000000-0000-0000-0000-000000000005' and status = 'submitted'), 'rejected', '  ') $q$), 'ERROR%reason%');
select t.chk('reject with reason', t.run_as(:v1::uuid, $q$ select review_identity((select id from identity_submissions where user_id = 'a0000000-0000-0000-0000-000000000005' and status = 'submitted'), 'rejected', 'الصورة غير واضحة') $q$), 'rejected');
select t.chk('user sees the rejection reason', t.run_as(:c1::uuid, $q$ select decision_reason from identity_submissions where status = 'rejected' $q$), 'الصورة غير واضحة');
select t.chk('user was notified of rejection', t.run_as(:c1::uuid, $q$ select count(*)::text from notifications where type = 'identity' $q$), '1');
select t.chk('rejected account still inactive', t.run_as(:c1::uuid, $q$ select identity_status || '/' || status from user_profiles where id = auth.uid() $q$), 'rejected/pending');
select t.chk('cannot review twice', t.run_as(:v1::uuid, $q$ select review_identity((select id from identity_submissions where user_id = 'a0000000-0000-0000-0000-000000000005'), 'approved', null) $q$), 'ERROR%already reviewed%');

select t.chk('resubmission after rejection allowed',
  t.run_as(:c1::uuid, $q$ select submit_identity('passport', '{"passport_photo":"a0000000-0000-0000-0000-000000000005/p.jpg","selfie_with_passport":"a0000000-0000-0000-0000-000000000005/s2.jpg"}'::jsonb, true)::text $q$), '%-%-%');
select t.chk('request changes with reason', t.run_as(:v1::uuid, $q$ select review_identity((select id from identity_submissions where user_id = 'a0000000-0000-0000-0000-000000000005' and status = 'submitted'), 'needs_changes', 'أعد تصوير الجواز بإضاءة أفضل') $q$), 'needs_changes');
select t.chk('resubmission after change request allowed',
  t.run_as(:c1::uuid, $q$ select submit_identity('passport', '{"passport_photo":"a0000000-0000-0000-0000-000000000005/p3.jpg","selfie_with_passport":"a0000000-0000-0000-0000-000000000005/s3.jpg"}'::jsonb, true)::text $q$), '%-%-%');

-- before approval: no buying
do $$ begin
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);
  insert into orders(user_id, payment_method, recipient_name, phone, governorate, city, address, subtotal, total)
  values ('a0000000-0000-0000-0000-000000000005', 'cash_on_delivery', 'x', '1', 'g', 'c', 'a', 1, 1);
  raise notice 'FAIL  unverified account created an order';
exception when others then
  if sqlerrm like '%not active%' then raise notice 'PASS  unverified account cannot order -> %', sqlerrm;
  else raise notice 'FAIL  unexpected error -> %', sqlerrm; end if;
end $$;

select t.chk('reviewer cannot review own identity', t.run_as(:v1::uuid, $q$ select submit_identity('passport', '{"passport_photo":"a0000000-0000-0000-0000-00000000000b/p.jpg","selfie_with_passport":"a0000000-0000-0000-0000-00000000000b/s.jpg"}'::jsonb, true)::text $q$), '%-%-%');
select t.chk('self-review blocked', t.run_as(:v1::uuid, $q$ select review_identity((select id from identity_submissions where user_id = auth.uid()), 'approved', null) $q$), 'ERROR%own identity%');

select t.chk('approve activates the account', t.run_as(:v1::uuid, $q$ select review_identity((select id from identity_submissions where user_id = 'a0000000-0000-0000-0000-000000000005' and status = 'submitted'), 'approved', null) $q$), 'verified');
select t.chk('profile verified + active', t.run_as(:c1::uuid, $q$ select identity_status || '/' || status from user_profiles where id = auth.uid() $q$), 'verified/active');
select t.chk('cannot resubmit once verified',
  t.run_as(:c1::uuid, $q$ select submit_identity('passport', '{"passport_photo":"a0000000-0000-0000-0000-000000000005/p9.jpg","selfie_with_passport":"a0000000-0000-0000-0000-000000000005/s9.jpg"}'::jsonb, true)::text $q$), 'ERROR%already%');
select t.chk('approval notified', t.run_as(:c1::uuid, $q$ select count(*)::text from notifications where type = 'identity' $q$), '3');
select t.chk('every decision audited', (select count(*)::text from audit_logs where action in ('identity_rejected','identity_needs_changes','identity_approved')), '3');

do $$ begin
  begin
    perform set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);
    insert into orders(user_id, payment_method, recipient_name, phone, governorate, city, address, subtotal, total)
    values ('a0000000-0000-0000-0000-000000000005', 'cash_on_delivery', 'x', '1', 'g', 'c', 'a', 1, 1);
    raise notice 'PASS  verified account can order';
    raise exception 'rollback';
  exception when others then
    if sqlerrm <> 'rollback' then raise notice 'FAIL  verified account blocked -> %', sqlerrm; end if;
  end;
end $$;

\echo === 9. Camera capture metadata ===
select set_config('request.jwt.claim.role', 'service_role', false);
update user_profiles set phone_verified = true where id = :c2;
select set_config('request.jwt.claim.role', '', false);
select t.chk('oversized capture metadata rejected',
  t.run_as(:c2::uuid, format($q$ select submit_identity('passport', '{"passport_photo":"a0000000-0000-0000-0000-00000000000c/p.jpg","selfie_with_passport":"a0000000-0000-0000-0000-00000000000c/s.jpg"}'::jsonb, true, jsonb_build_object('x', %L))::text $q$, repeat('a', 5000))), 'ERROR%metadata%');
select t.chk('national id with 3 camera photos + metadata accepted',
  t.run_as(:c2::uuid, $q$ select submit_identity('national_id', '{"front":"a0000000-0000-0000-0000-00000000000c/f.jpg","back":"a0000000-0000-0000-0000-00000000000c/b.jpg","selfie_with_id":"a0000000-0000-0000-0000-00000000000c/s.jpg"}'::jsonb, true, '{"method":"camera"}'::jsonb)::text $q$), '%-%-%');
select t.chk('capture metadata stored', (select capture_meta ->> 'method' from identity_submissions where user_id = :c2), 'camera');
select t.chk('old 4-photo national id format now rejected',
  t.run_as(:v1::uuid, $q$ select submit_identity('national_id', '{"front":"a0000000-0000-0000-0000-00000000000b/f.jpg","back":"a0000000-0000-0000-0000-00000000000b/b.jpg","card_with_face":"a0000000-0000-0000-0000-00000000000b/c.jpg","selfie":"a0000000-0000-0000-0000-00000000000b/s.jpg"}'::jsonb, true)::text $q$), 'ERROR%');

\echo === 10. Branch regions ===
insert into branches(bank, name, region) values ('الكريمي', 'فرع الخدمات السريعه', 'صنعاء'), ('الكريمي', 'فرع الخدمات السريعه', 'تعز');
select t.chk('same branch name allowed in two regions',
  (select count(*)::text from branches where name = 'فرع الخدمات السريعه'), '2');
do $$ begin
  insert into branches(bank, name, region) values ('الكريمي', 'فرع الخدمات السريعه', 'صنعاء');
  raise notice 'FAIL  duplicate name within one region accepted';
exception when unique_violation then raise notice 'PASS  duplicate name within the same region rejected'; end $$;
select t.chk('customers can filter branches by region',
  t.run_as(:c1::uuid, $q$ select count(*)::text from branches where region = 'تعز' $q$), '1');
select t.chk('nearest_branches returns the region',
  t.run_as(:c1::uuid, $q$ select coalesce(region, 'none') from nearest_branches(12.80, 45.00, 1) $q$), 'none');
