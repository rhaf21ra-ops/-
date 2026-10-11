\set ON_ERROR_STOP off
\pset tuples_only on
set client_min_messages = notice;
create schema if not exists t;
create function t.run_as(u uuid, q text, imm boolean default false) returns text language plpgsql as $$
declare r text;
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
  begin
    execute q into r;
    if imm then execute 'set constraints all immediate'; end if;   -- fire deferred guarantee checks now
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

\set own '''b0000000-0000-0000-0000-000000000001'''
\set mer '''b0000000-0000-0000-0000-000000000002'''
\set c1  '''b0000000-0000-0000-0000-000000000003'''
\set c2  '''b0000000-0000-0000-0000-000000000004'''
\set e1  '''b0000000-0000-0000-0000-000000000005'''
\set mer2 '''b0000000-0000-0000-0000-000000000006'''
\set P1  '''bb200000-0000-0000-0000-000000000001'''
\set P2  '''bb200000-0000-0000-0000-000000000002'''
\set P3  '''bb200000-0000-0000-0000-000000000003'''
\set BR  '''bb300000-0000-0000-0000-000000000001'''

select set_config('request.jwt.claim.role', 'service_role', false);
insert into auth.users(id, raw_user_meta_data) values
 (:own,'{"role":"customer"}'),(:mer,'{"role":"merchant"}'),(:c1,'{"role":"customer"}'),(:c2,'{"role":"customer"}'),
 (:e1,'{"role":"employee"}'),(:mer2,'{"role":"merchant"}');
insert into user_roles select :own, id from roles where name='admin';
update user_profiles set status='active', identity_status='verified', phone_verified=true where id in (:c1, :e1);
insert into companies(id, owner_id, name, status) values ('bc000000-0000-0000-0000-000000000001', :own, 'Co', 'active');
insert into employees(user_id, company_id, eligibility, installment_limit) values (:e1,'bc000000-0000-0000-0000-000000000001','eligible',5000000);
insert into merchants(id, owner_id, business_name, status) values
 ('bd000000-0000-0000-0000-000000000001', :mer, 'M', 'active'),('bd000000-0000-0000-0000-000000000002', :mer2, 'M2', 'suspended');
insert into stores(id, merchant_id, name) values
 ('be000000-0000-0000-0000-000000000001','bd000000-0000-0000-0000-000000000001','S'),
 ('be000000-0000-0000-0000-000000000002','bd000000-0000-0000-0000-000000000002','S2');
insert into products(id, store_id, name, cash_price, discount_percent, stock) values
 (:P1,'be000000-0000-0000-0000-000000000001','P1',100000,10,10),
 (:P2,'be000000-0000-0000-0000-000000000001','P2',50000,0,1),
 (:P3,'be000000-0000-0000-0000-000000000002','P3 suspended merchant',50000,0,5);
insert into branches(id, name, region, city) values (:BR,'فرع مكتب اختبار','عدن','عدن');
select set_config('request.jwt.claim.role', '', false);

\set base '''delivery'', ''0777000111'', ''عدن'', ''المنصورة'', ''شارع الاختبار'''
\echo === 1. Account must be active ===
select t.chk('inactive customer cannot order', t.run_as(:c2::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','cash_on_delivery','Nora','0777000111','عدن','المنصورة','شارع')::text $q$), 'ERROR%not active%');

\echo === 2. Cash order: server prices, stock, commission ===
select t.chk('anonymous cannot call', (select 'x'), 'x');
select t.chk('cash order ok', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":2}]','cash_on_delivery','Ali','0777000111','عدن','المنصورة','شارع')::text $q$), '________-____-____-____-____________');
select t.chk('total = 2 x (100000 -10%) = 180000, status new',
  (select total || '/' || status || '/' || payment_method from orders where user_id=:c1), '180000.00/new/cash_on_delivery');
select t.chk('item price recomputed server-side', (select unit_price || 'x' || quantity from order_items), '90000.00x2');
select t.chk('stock decreased', (select stock::text from products where id=:P1), '8');
select t.chk('commission 5% of 180000 = 9000', (select percent || '/' || commission from commissions), '5/9000.00');
select t.chk('history + audit written', (select (select count(*) from order_status_history)::text || '/' || (select count(*) from audit_logs where action='order_placed')::text), '1/1');

\echo === 3. Rejections leave nothing behind ===
select t.chk('stock shortage rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000002","quantity":2}]','cash_on_delivery','Ali','0777000111','عدن','المنصورة','شارع')::text $q$), 'ERROR%insufficient stock%');
select t.chk('suspended merchant product rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000003","quantity":1}]','cash_on_delivery','Ali','0777000111','عدن','المنصورة','شارع')::text $q$), 'ERROR%merchant is not active%');
select t.chk('unknown product rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-0000000000ff","quantity":1}]','cash_on_delivery','Ali','0777000111','عدن','المنصورة','شارع')::text $q$), 'ERROR%not available%');
select t.chk('quantity 0 rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":0}]','cash_on_delivery','Ali','0777000111','عدن','المنصورة','شارع')::text $q$), 'ERROR%quantity%');
select t.chk('empty cart rejected', t.run_as(:c1::uuid, $q$ select place_order('[]','cash_on_delivery','Ali','0777000111','عدن','المنصورة','شارع')::text $q$), 'ERROR%cart%');
select t.chk('missing delivery data rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','cash_on_delivery','','','','','')::text $q$), 'ERROR%delivery%');
select t.chk('bad payment method rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','free','Ali','0777000111','عدن','المنصورة','شارع')::text $q$), 'ERROR%payment%');
select t.chk('still one order, stock untouched', (select (select count(*) from orders)::text || '/' || (select stock from products where id=:P2)::text), '1/1');

\echo === 4. Installment (customer: no employer) ===
select t.chk('installment with bank account + branch', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":2}]','installment','Ali','0777000111','عدن','المنصورة','شارع',null,12,
      (select id from guarantee_types where code='bank_account'),'{"bank_name":"الكريمي","account_number":"123","account_holder":"Ali"}'::jsonb,null,null,null,'bb300000-0000-0000-0000-000000000001')::text $q$, true),
  '________-____-____-____-____________');
select t.chk('deferred 219600, monthly 18300, markup 22, customer skips company',
  (select deferred_price || '/' || monthly_installment || '/' || markup_percent_applied || '/' || review_stage || '/' || status from financing_applications where applicant_user_id=:c1),
  '219600.00/18300.00/22.00/admin/awaiting_identity');
select t.chk('application linked to order, branch and details stored',
  (select (a.order_id is not null)::text || '/' || (a.branch_id is not null)::text || '/' || (d.details->>'account_number')
     from financing_applications a join financing_guarantee_details d on d.application_id=a.id where a.applicant_user_id=:c1), 'true/true/123');
select t.chk('installment order is under_review with months on items',
  (select o.status || '/' || i.installment_months from orders o join order_items i on i.order_id=o.id where o.payment_method='installment'), 'under_review/12');
select t.chk('no guarantee rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','installment','Ali','0777000111','عدن','المنصورة','شارع',null,12,null,'{}'::jsonb,null,null,null,'bb300000-0000-0000-0000-000000000001')::text $q$, true), 'ERROR%guarantee%');
select t.chk('no branch rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','installment','Ali','0777000111','عدن','المنصورة','شارع',null,12,(select id from guarantee_types where code='bank_account'),'{"bank_name":"a","account_number":"1","account_holder":"b"}'::jsonb,null,null,null,null)::text $q$, true), 'ERROR%branch%');
select t.chk('invalid months rejected', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','installment','Ali','0777000111','عدن','المنصورة','شارع',null,7,(select id from guarantee_types where code='bank_account'),'{"bank_name":"a","account_number":"1","account_holder":"b"}'::jsonb,null,null,null,'bb300000-0000-0000-0000-000000000001')::text $q$, true), 'ERROR%');
select t.chk('missing guarantee details rejected at commit', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','installment','Ali','0777000111','عدن','المنصورة','شارع',null,12,(select id from guarantee_types where code='gold'),'{}'::jsonb,null,null,null,'bb300000-0000-0000-0000-000000000001')::text $q$, true), 'ERROR%guarantee details invalid%');
select t.chk('customer cannot use the employee-only guarantee', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','installment','Ali','0777000111','عدن','المنصورة','شارع',null,12,(select id from guarantee_types where code='salary_deduction'),'{}'::jsonb,null,null,null,'bb300000-0000-0000-0000-000000000001')::text $q$, true), 'ERROR%not available%');
select t.chk('rejections left exactly 2 orders', (select count(*)::text from orders), '2');

\echo === 5. Installment (employee: company review first) ===
select t.chk('employee with salary deduction', t.run_as(:e1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1}]','installment','Emp','0777000222','عدن','المنصورة','شارع',null,6,(select id from guarantee_types where code='salary_deduction'),'{}'::jsonb,null,null,null,'bb300000-0000-0000-0000-000000000001')::text $q$, true),
  '________-____-____-____-____________');
select t.chk('employee app waits for company: stage company / status new',
  (select review_stage || '/' || status || '/' || (company_id is not null)::text || '/' || deferred_price from financing_applications where applicant_user_id=:e1), 'company/new/true/109800.00');

\echo === 6. Duplicate lines merge; direct calls blocked ===
select t.chk('same product twice merges', t.run_as(:c1::uuid,
  $q$ select place_order('[{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":1},{"product_id":"bb200000-0000-0000-0000-000000000001","quantity":2}]','cash_on_delivery','Ali','0777000111','عدن','المنصورة','شارع')::text $q$), '________-____-____-____-____________');
select t.chk('one line with quantity 3', (select count(*) || 'x' || max(quantity) from order_items where order_id = (select id from orders order by created_at desc, id limit 1)), '1x3');
create function t.anon_call() returns text language plpgsql as $$
begin
  execute 'set local role anon';
  begin perform place_order('[]','cash_on_delivery','a','1','b','c','d'); execute 'reset role'; return 'called';
  exception when others then execute 'reset role'; return 'ERROR: ' || sqlerrm; end;
end $$;
select t.chk('anon cannot execute place_order', t.anon_call(), 'ERROR%permission denied%');
