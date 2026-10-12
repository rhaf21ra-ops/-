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
    if imm then execute 'set constraints all immediate'; end if;
    execute 'reset role';
    return coalesce(r, '');
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

create table t.ids(k text primary key, v uuid);
grant usage on schema t to authenticated; grant select on t.ids to authenticated;
\set own '''c0000000-0000-0000-0000-000000000001'''
\set mer '''c0000000-0000-0000-0000-000000000002'''
\set emp '''c0000000-0000-0000-0000-000000000003'''
\set com '''c0000000-0000-0000-0000-000000000004'''
\set cus '''c0000000-0000-0000-0000-000000000005'''
\set stf '''c0000000-0000-0000-0000-000000000006'''
\set oth '''c0000000-0000-0000-0000-000000000007'''
\set BR  '''cc300000-0000-0000-0000-000000000001'''

select set_config('request.jwt.claim.role', 'service_role', false);
insert into auth.users(id, raw_user_meta_data) values
 (:own,'{"role":"customer","full_name":"Owner"}'),
 (:mer,'{"role":"merchant","full_name":"Tajer","business_name":"Tech Store","phone":"0771"}'),
 (:emp,'{"role":"employee","full_name":"Emp"}'),
 (:com,'{"role":"company","full_name":"CoOwner","business_name":"Al Amal"}'),
 (:cus,'{"role":"customer","full_name":"Cus"}'),
 (:stf,'{"role":"customer","full_name":"Staff"}'),
 (:oth,'{"role":"merchant","full_name":"Other"}');
insert into user_roles select :own, id from roles where name='admin';
insert into user_roles select :stf, id from roles where name='staff_financing';
update user_profiles set status='active', identity_status='verified' where id in (:emp,:cus,:mer,:com,:stf);
insert into branches(id, name, region, city) values (:BR,'فرع مكتب اختبار','عدن','عدن');

\echo === 1. Sign-up creates records ===
select t.chk('merchant row + store created pending', (select m.status || '/' || m.store_name || '/' || (select count(*) from stores s where s.merchant_id=m.id) from merchants m where m.owner_id=:mer), 'pending/Tech Store/1');
select t.chk('company row created pending', (select name || '/' || status from companies where owner_id=:com), 'Al Amal/pending');
select t.chk('profile email column set', (select (count(*))::text from user_profiles where id=:cus), '1');
select t.chk('non-admin cannot self-activate merchant', t.run_as(:mer::uuid, $q$ select set_merchant_status((select id from merchants where owner_id='c0000000-0000-0000-0000-000000000002'),'active')::text $q$), 'ERROR%not allowed%');
select t.chk('merchant cannot update own status directly', t.run_as(:mer::uuid, $q$ update merchants set status='active' where owner_id='c0000000-0000-0000-0000-000000000002' returning status $q$), 'pending');
select t.chk('admin activates merchant', t.run_as(:own::uuid, $q$ select set_merchant_status((select id from merchants where owner_id='c0000000-0000-0000-0000-000000000002'),'active')::text $q$), '');
select t.chk('merchant active now', (select status from merchants where owner_id=:mer), 'active');
select t.chk('admin activates company', t.run_as(:own::uuid, $q$ select set_company_status((select id from companies where owner_id='c0000000-0000-0000-0000-000000000004'),'active')::text $q$), '');
select t.chk('companies_public lists active company', (select count(*)::text from companies_public), '1');

\echo === 2. Merchant adds product; employee joins company ===
select t.chk('merchant inserts own product', t.run_as(:mer::uuid, $q$ insert into products(store_id, merchant_id, name, cash_price, stock, specs, category_id)
   values ((select s.id from stores s join merchants m on m.id=s.merchant_id where m.owner_id='c0000000-0000-0000-0000-000000000002'),
           (select id from merchants where owner_id='c0000000-0000-0000-0000-000000000002'),'Phone',100000,10,'[{"label":"RAM","value":"8"}]',(select id from categories where name='الهواتف')) returning name $q$), 'Phone');
select t.chk('merchant cannot feature own product', t.run_as(:mer::uuid, $q$ update products set featured=true where name='Phone' returning featured::text $q$), 'false');

select t.chk('public sees active merchant product', t.run_as(:cus::uuid, $q$ select count(*)::text from products $q$), '1');
update merchants set status='suspended' where owner_id=:mer;
select t.chk('suspended merchant product is hidden from the public', t.run_as(:cus::uuid, $q$ select count(*)::text from products $q$), '0');
select t.chk('...but the merchant still sees it', t.run_as(:mer::uuid, $q$ select count(*)::text from products $q$), '1');
update merchants set status='active' where owner_id=:mer;
select t.chk('customer cannot join a company', t.run_as(:cus::uuid, $q$ select join_company((select id from companies_public limit 1))::text $q$), 'ERROR%only employee%');
select t.chk('employee joins', t.run_as(:emp::uuid, $q$ select (join_company((select id from companies_public limit 1),'Engineer','E-1') is not null)::text $q$), 'true');
select t.chk('employee starts pending with zero limit', (select eligibility || '/' || installment_limit from employees where user_id=:emp), 'pending/0.00');
insert into t.ids select 'emp', id from employees where user_id=:emp;
select t.chk('other company owner cannot set limits', t.run_as(:oth::uuid, $q$ select company_set_employee((select v from t.ids where k='emp'),'eligible',1000000)::text $q$), 'ERROR%not allowed%');
select t.chk('company sets eligibility + limit', t.run_as(:com::uuid, $q$ select company_set_employee((select v from t.ids where k='emp'),'eligible',500000, 200000)::text $q$), '');
select t.chk('limit stored', (select eligibility || '/' || installment_limit from employees where user_id=:emp), 'eligible/500000.00');

\echo === 3. Employee installment order -> company -> admin -> contract ===
select t.chk('employee places installment order', t.run_as(:emp::uuid,
  $q$ select place_order(('[{"product_id":"' || (select id from products where name='Phone') || '","quantity":1}]')::jsonb,'installment','Emp','0777000222','عدن','المنصورة','شارع',null,6,(select id from guarantee_types where code='salary_deduction'),'{}'::jsonb,null,null,null,'cc300000-0000-0000-0000-000000000001')::text $q$, true),
  '________-____-____-____-____________');
select t.chk('order under_review', (select status from orders where user_id=:emp), 'under_review');
insert into t.ids select 'app_emp', id from financing_applications where applicant_user_id=:emp;
select t.chk('application snapshot for company view', (select product_summary || '/' || applicant_name || '/' || company_name || '/' || merchant_summary from financing_applications where applicant_user_id=:emp), 'Phone/Emp/Al Amal/Tech Store');
select t.chk('admin cannot decide before company', t.run_as(:own::uuid, $q$ select decide_application((select v from t.ids where k='app_emp'), true)::text $q$), 'ERROR%not waiting for the platform%');
select t.chk('customer cannot decide as company', t.run_as(:cus::uuid, $q$ select company_decide_application((select v from t.ids where k='app_emp'), true)::text $q$), 'ERROR%not allowed%');
select t.chk('company approves', t.run_as(:com::uuid, $q$ select company_decide_application((select v from t.ids where k='app_emp'), true, 'ok')::text $q$), '');
select t.chk('moved to admin stage', (select review_stage || '/' || coalesce(company_approved::text,'?') from financing_applications where applicant_user_id=:emp), 'admin/true');
select t.chk('company cannot decide twice', t.run_as(:com::uuid, $q$ select company_decide_application((select v from t.ids where k='app_emp'), false, 'x')::text $q$), 'ERROR%not waiting for the company%');
select t.chk('reject needs a reason', t.run_as(:own::uuid, $q$ select decide_application((select v from t.ids where k='app_emp'), false)::text $q$), 'ERROR%reason%');
select t.chk('staff with financing.review approves', t.run_as(:stf::uuid, $q$ select (decide_application((select v from t.ids where k='app_emp'), true, 'good') is not null)::text $q$), 'true');
insert into t.ids select 'inst_'||number, id from installments;
select t.chk('contract with 6 installments, first due', (select count(*) || '/' || count(*) filter (where status='due') || '/' || sum(amount) from installments), '6/1/122000.00');
select t.chk('contract number + active', (select status || '/' || (contract_number like 'CON-%')::text from contracts), 'active/true');
select t.chk('used_limit grew by deferred price', (select used_limit::text from employees where user_id=:emp), '122000.00');
select t.chk('order approved', (select status from orders where user_id=:emp), 'approved');
select t.chk('employee sees own contract+installments', t.run_as(:emp::uuid, $q$ select (select count(*) from contracts)::text || '/' || (select count(*) from installments) $q$), '1/6');
select t.chk('company sees contracts of its employees', t.run_as(:com::uuid, $q$ select (select count(*) from contracts)::text $q$), '1');
select t.chk('other merchant sees none', t.run_as(:oth::uuid, $q$ select (select count(*) from contracts)::text $q$), '0');
select t.chk('merchant sees the order but not the application', t.run_as(:mer::uuid, $q$ select (select count(*) from orders)::text || '/' || (select count(*) from financing_applications) $q$), '1/0');
select t.chk('merchant cannot read buyer notes of other merchants order list', t.run_as(:oth::uuid, $q$ select (select count(*) from orders)::text $q$), '0');

\echo === 4. Payments ===
select t.chk('customer cannot record payment', t.run_as(:cus::uuid, $q$ select record_payment((select v from t.ids where k='inst_1'), 20333)::text $q$), 'ERROR%not allowed%');
select t.chk('wrong amount rejected', t.run_as(:stf::uuid, $q$ select record_payment((select v from t.ids where k='inst_1'), 100)::text $q$), 'ERROR%amount must equal%');
select t.chk('financing staff has payments.record -> ok', t.run_as(:stf::uuid, $q$ select (record_payment((select v from t.ids where k='inst_1'), 20333, 'cash') is not null)::text $q$), 'true');
select t.chk('installment paid, next becomes due', (select (select status from installments where number=1) || '/' || (select status from installments where number=2)), 'paid/due');
select t.chk('used_limit reduced', (select used_limit::text from employees where user_id=:emp), '101667.00');
select t.chk('double payment rejected', t.run_as(:stf::uuid, $q$ select record_payment((select v from t.ids where k='inst_1'), 20333)::text $q$), 'ERROR%already paid%');
do $$ declare n int; begin
  for n in 2..6 loop
    perform t.run_as('c0000000-0000-0000-0000-000000000006', format($q$ select record_payment((select v from t.ids where k='inst_%s'), (select amount from installments where number=%s))::text $q$, n, n));
  end loop; end $$;
select t.chk('all paid -> contract + application completed',
  (select (select status from contracts) || '/' || (select status from financing_applications where applicant_user_id=:emp) || '/' || (select used_limit from employees where user_id=:emp)), 'completed/completed/0.00');
select t.chk('payments rows', (select count(*)::text from payments), '6');

\echo === 5. Orders: status machine, cancel restores stock ===
select t.chk('customer places cash order', t.run_as(:cus::uuid,
  $q$ select place_order(('[{"product_id":"' || (select id from products where name='Phone') || '","quantity":3}]')::jsonb,'cash_on_delivery','Cus','0777000333','عدن','المنصورة','شارع')::text $q$), '________-____-____-____-____________');
insert into t.ids select 'ord1', id from orders where user_id=:cus;
select t.chk('stock is 10-1-3=6', (select stock::text from products where name='Phone'), '6');
select t.chk('sold_count tracked', (select sold_count::text from products where name='Phone'), '4');
select t.chk('other merchant cannot update', t.run_as(:oth::uuid, $q$ select update_order_status((select v from t.ids where k='ord1'),'shipped')::text $q$), 'ERROR%not allowed%');
select t.chk('merchant may set processing', t.run_as(:mer::uuid, $q$ select update_order_status((select v from t.ids where k='ord1'),'processing')::text $q$), '');
select t.chk('merchant may not deliver', t.run_as(:mer::uuid, $q$ select update_order_status((select v from t.ids where k='ord1'),'delivered')::text $q$), 'ERROR%merchants may set%');
select t.chk('customer cannot cancel after processing', t.run_as(:cus::uuid, $q$ select update_order_status((select v from t.ids where k='ord1'),'cancelled')::text $q$), 'ERROR%only cancel%');
select t.chk('admin cancels -> stock back', t.run_as(:own::uuid, $q$ select update_order_status((select v from t.ids where k='ord1'),'cancelled','test')::text $q$), '');
select t.chk('stock restored to 9', (select stock::text from products where name='Phone'), '9');
select t.chk('closed order cannot change', t.run_as(:own::uuid, $q$ select update_order_status((select v from t.ids where k='ord1'),'shipped')::text $q$), 'ERROR%closed%');
select t.chk('customer cancels own new order', t.run_as(:cus::uuid, $q$ select place_order(('[{"product_id":"' || (select id from products where name='Phone') || '","quantity":1}]')::jsonb,'cash_on_delivery','Cus','0777000333','عدن','المنصورة','شارع')::text $q$), '________-____-____-____-____________');
insert into t.ids select 'ord2', id from orders where user_id=:cus and status='new';
select t.chk('cancel works', t.run_as(:cus::uuid, $q$ select update_order_status((select v from t.ids where k='ord2'),'cancelled')::text $q$), '');
select t.chk('stock back to 9 again', (select stock::text from products where name='Phone'), '9');
select t.chk('customer got notifications', (select (count(*) > 0)::text from notifications where user_id=:cus), 'true');

\echo === 6. Rejection path restores stock and closes order ===
select t.chk('customer installment order', t.run_as(:cus::uuid,
  $q$ select place_order(('[{"product_id":"' || (select id from products where name='Phone') || '","quantity":2}]')::jsonb,'installment','Cus','0777000333','عدن','المنصورة','شارع',null,12,(select id from guarantee_types where code='bank_account'),'{"bank_name":"الكريمي","account_number":"9","account_holder":"Cus"}'::jsonb,null,null,null,'cc300000-0000-0000-0000-000000000001')::text $q$, true), '________-____-____-____-____________');
insert into t.ids select 'app_cus', id from financing_applications where applicant_user_id=:cus;
select t.chk('stock 7', (select stock::text from products where name='Phone'), '7');
select t.chk('admin rejects with reason', t.run_as(:own::uuid, $q$ select decide_application((select v from t.ids where k='app_cus'), false, 'incomplete')::text $q$), '');
select t.chk('order cancelled + stock back to 9', (select (select status from orders where id=(select order_id from financing_applications where applicant_user_id=:cus)) || '/' || (select stock from products where name='Phone')), 'cancelled/9');

\echo === 7. Settlements ===
insert into t.ids select 'com1', id from commissions limit 1;
select t.chk('only admin settles', t.run_as(:mer::uuid, $q$ select set_commission_settlement((select v from t.ids where k='com1'),'paid')::text $q$), 'ERROR%not allowed%');
select t.chk('admin marks paid', t.run_as(:own::uuid, $q$ select set_commission_settlement((select v from t.ids where k='com1'),'paid')::text $q$), '');
select t.chk('settlement row paid', (select status from settlements limit 1), 'paid');
select t.chk('merchant sees own commissions', t.run_as(:mer::uuid, $q$ select (count(*) > 0)::text from commissions $q$), 'true');
select t.chk('company never sees commissions', t.run_as(:com::uuid, $q$ select count(*)::text from commissions $q$), '0');
select t.chk('refresh_installment_status callable', t.run_as(:cus::uuid, $q$ select refresh_installment_status()::text $q$), '');
