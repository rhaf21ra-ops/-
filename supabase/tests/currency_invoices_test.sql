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
  begin execute q into r; if imm then execute 'set constraints all immediate'; end if; execute 'reset role'; return coalesce(r, '');
  exception when others then execute 'reset role'; return 'ERROR: ' || sqlerrm; end;
end $$;
create function t.anon(q text) returns text language plpgsql as $$
declare r text;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  execute 'set local role anon';
  begin execute q into r; execute 'reset role'; return coalesce(r, '');
  exception when others then execute 'reset role'; return 'ERROR: ' || sqlerrm; end;
end $$;
create function t.chk(label text, got text, want text) returns void language plpgsql as $$
begin
  if got like want then raise notice 'PASS  %  -> %', label, got;
  else raise notice 'FAIL  %  -> got [%] want [%]', label, got, want; end if;
end $$;
create table t.ids(k text primary key, v uuid);
grant usage on schema t to authenticated, anon; grant select on t.ids to authenticated;
grant execute on all functions in schema t to authenticated, anon;
\set own '''e0000000-0000-0000-0000-000000000001'''
\set m1  '''e0000000-0000-0000-0000-000000000002'''
\set m2  '''e0000000-0000-0000-0000-000000000003'''
\set emp '''e0000000-0000-0000-0000-000000000004'''
\set com '''e0000000-0000-0000-0000-000000000005'''
\set cus '''e0000000-0000-0000-0000-000000000006'''
\set stf '''e0000000-0000-0000-0000-000000000007'''
\set oth '''e0000000-0000-0000-0000-000000000008'''
\set BR  '''ee300000-0000-0000-0000-000000000001'''

select set_config('request.jwt.claim.role', 'service_role', false);
insert into auth.users(id, raw_user_meta_data) values
 (:own,'{"role":"customer","full_name":"Owner"}'),
 (:m1,'{"role":"merchant","full_name":"Tajer One","business_name":"Store One","phone":"0771"}'),
 (:m2,'{"role":"merchant","full_name":"Tajer Two","business_name":"Store Two","phone":"0772"}'),
 (:emp,'{"role":"employee","full_name":"Emp Ali"}'),
 (:com,'{"role":"company","full_name":"CoOwner","business_name":"Al Amal"}'),
 (:cus,'{"role":"customer","full_name":"Cus Omar","phone":"0779"}'),
 (:stf,'{"role":"customer","full_name":"Staff"}'),
 (:oth,'{"role":"customer","full_name":"Other"}');
insert into user_roles select :own, id from roles where name='admin';
insert into user_roles select :stf, id from roles where name='staff_orders';
update user_profiles set status='active', identity_status='verified' where id in (:emp,:cus,:m1,:m2,:com,:stf,:oth);
insert into branches(id, name, region, city) values (:BR,'فرع مكتب اختبار','عدن','عدن');
update merchants set status='active';
update companies set status='active';
select t.chk('seeded all three currencies', (select string_agg(code, ',' order by code) from exchange_rates), 'SAR,USD,YER');
update exchange_rates set yer_per_unit = 140 where code='SAR';
update exchange_rates set yer_per_unit = 500 where code='USD';

\echo === 1. exchange rates ===
select t.chk('anon can read rates', t.anon($q$ select count(*)::text from exchange_rates $q$), '3');
select t.chk('customer cannot set a rate', t.run_as(:cus::uuid, $q$ select set_exchange_rate('USD', 9999)::text $q$), 'ERROR%not allowed%');
select t.chk('customer cannot update table directly', t.run_as(:cus::uuid, $q$ update exchange_rates set yer_per_unit=1 where code='USD' returning code $q$), '');
select t.chk('staff (non owner) cannot set a rate', t.run_as(:stf::uuid, $q$ select set_exchange_rate('USD', 9999)::text $q$), 'ERROR%not allowed%');
select t.chk('YER rate is locked', t.run_as(:own::uuid, $q$ select set_exchange_rate('YER', 2)::text $q$), 'ERROR%only SAR and USD%');
select t.chk('bad rate rejected', t.run_as(:own::uuid, $q$ select set_exchange_rate('USD', -5)::text $q$), 'ERROR%invalid rate%');
select t.chk('owner sets USD', t.run_as(:own::uuid, $q$ select set_exchange_rate('USD', 500)::text $q$), '');
select t.chk('rate change audited', (select count(*)::text from audit_logs where action='exchange_rate_set'), '1');
select t.chk('rounding YER has no decimals', _round_money(1234.56, 'YER')::text, '1235');
select t.chk('rounding USD has 2 decimals', _round_money(12.3456, 'USD')::text, '12.35');
select t.chk('convert USD -> SAR', _fx_convert(100, 'USD', 'SAR')::numeric(14,4)::text, '357.1429');

\echo === 2. products in three currencies ===
select t.chk('merchant1 adds USD product', t.run_as(:m1::uuid, $q$ insert into products(store_id, merchant_id, name, cash_price, currency, stock, specs, category_id)
   values ((select s.id from stores s join merchants m on m.id=s.merchant_id where m.owner_id='e0000000-0000-0000-0000-000000000002'),
           (select id from merchants where owner_id='e0000000-0000-0000-0000-000000000002'),'DollarPhone',100,'USD',10,'[]',(select id from categories where name='الهواتف')) returning currency $q$), 'USD');
select t.chk('merchant2 adds YER product', t.run_as(:m2::uuid, $q$ insert into products(store_id, merchant_id, name, cash_price, currency, stock, specs, category_id)
   values ((select s.id from stores s join merchants m on m.id=s.merchant_id where m.owner_id='e0000000-0000-0000-0000-000000000003'),
           (select id from merchants where owner_id='e0000000-0000-0000-0000-000000000003'),'RialFridge',50000,'YER',10,'[]',(select id from categories where name='الهواتف')) returning currency $q$), 'YER');
select t.chk('merchant adds SAR product', t.run_as(:m2::uuid, $q$ insert into products(store_id, merchant_id, name, cash_price, currency, stock, specs, category_id)
   values ((select s.id from stores s join merchants m on m.id=s.merchant_id where m.owner_id='e0000000-0000-0000-0000-000000000003'),
           (select id from merchants where owner_id='e0000000-0000-0000-0000-000000000003'),'RiyalTV',700,'SAR',10,'[]',(select id from categories where name='الهواتف')) returning currency $q$), 'SAR');
select t.chk('unknown currency rejected', t.run_as(:m2::uuid, $q$ insert into products(store_id, merchant_id, name, cash_price, currency, stock, specs, category_id)
   values ((select s.id from stores s join merchants m on m.id=s.merchant_id where m.owner_id='e0000000-0000-0000-0000-000000000003'),
           (select id from merchants where owner_id='e0000000-0000-0000-0000-000000000003'),'Euro',5,'EUR',1,'[]',(select id from categories where name='الهواتف')) returning currency $q$), 'ERROR%');

\echo === 3. cash orders in each currency ===
select t.chk('cash order in SAR: USD + YER product', t.run_as(:cus::uuid,
  $q$ select place_order(('[{"product_id":"' || (select id from products where name='DollarPhone') || '","quantity":1},{"product_id":"' || (select id from products where name='RialFridge') || '","quantity":2}]')::jsonb,'cash_on_delivery','Cus Omar','0779000111','عدن','المنصورة','شارع',null,null,null,'{}'::jsonb,null,null,null,null,'SAR')::text $q$), '________-____-____-____-____________');
insert into t.ids select 'o_sar', id from orders where user_id=:cus and currency='SAR';
-- 100 USD = 50000/140*... : 100*500/140 = 357.142857 -> 357.14 ; 2 x (50000/140 = 357.142857 -> 357.14) = 714.28
select t.chk('SAR order total = 357.14 + 714.28', (select total::text || '/' || currency from orders where id=(select v from t.ids where k='o_sar')), '1071.42/SAR');
select t.chk('item keeps original price and rate', (select orig_currency || '/' || orig_unit_price || '/' || round(fx_rate, 4) from order_items oi join products p on p.id=oi.product_id where p.name='DollarPhone'), 'USD/100.00/3.5714');
select t.chk('commission rows carry the order currency', (select string_agg(distinct currency, ',') from commissions), 'SAR');
select t.chk('commission rounded to cents (5% of 357.14)', (select commission::text from commissions c join order_items oi on oi.id=c.order_item_id join products p on p.id=oi.product_id where p.name='DollarPhone'), '17.86');
select t.chk('cash order in USD', t.run_as(:cus::uuid,
  $q$ select place_order(('[{"product_id":"' || (select id from products where name='RiyalTV') || '","quantity":1}]')::jsonb,'cash_on_delivery','Cus Omar','0779000111','عدن','المنصورة','شارع',null,null,null,'{}'::jsonb,null,null,null,null,'USD')::text $q$), '________-____-____-____-____________');
select t.chk('700 SAR = 196 USD', (select total::text from orders where currency='USD'), '196.00');
select t.chk('cash order in YER (default)', t.run_as(:oth::uuid,
  $q$ select place_order(('[{"product_id":"' || (select id from products where name='DollarPhone') || '","quantity":1}]')::jsonb,'cash_on_delivery','Other','0779000222','عدن','المنصورة','شارع')::text $q$), '________-____-____-____-____________');
select t.chk('100 USD = 50000 YER', (select total::text || '/' || currency from orders where user_id=:oth), '50000.00/YER');
select t.chk('unsupported currency rejected', t.run_as(:cus::uuid,
  $q$ select place_order(('[{"product_id":"' || (select id from products where name='DollarPhone') || '","quantity":1}]')::jsonb,'cash_on_delivery','Cus Omar','0779000111','عدن','المنصورة','شارع',null,null,null,'{}'::jsonb,null,null,null,null,'EUR')::text $q$), 'ERROR%unsupported currency%');

\echo === 4. invoices for cash orders ===
select t.chk('two merchants -> two invoices for the SAR order', (select count(*)::text from invoices where order_id=(select v from t.ids where k='o_sar')), '2');
select t.chk('invoice numbers follow INV-YYYY-nnnnnn', (select bool_and(invoice_number ~ '^INV-[0-9]{4}-[0-9]{6}$')::text from invoices), 'true');
select t.chk('verify codes are 16 hex chars', (select bool_and(verify_code ~ '^[0-9A-F]{16}$')::text from invoices), 'true');
select t.chk('invoice currency + kind', (select string_agg(distinct kind || '/' || currency, ',') from invoices where order_id=(select v from t.ids where k='o_sar')), 'sale/SAR');
select t.chk('invoice totals add up to the order', (select sum(total)::text from invoices where order_id=(select v from t.ids where k='o_sar')), '1071.42');
select t.chk('invoice snapshots buyer data', (select buyer_name || '/' || buyer_phone from invoices i where i.merchant_name='Store One' and order_id=(select v from t.ids where k='o_sar')), 'Cus Omar/0779000111');
select t.chk('invoice items carry names and original currency', (select items_json->0->>'name' || '/' || (items_json->0->>'orig_currency') from invoices where merchant_name='Store One' and order_id=(select v from t.ids where k='o_sar')), 'DollarPhone/USD');
select t.chk('buyer sees own invoices (SAR 2 + USD 1)', t.run_as(:cus::uuid, $q$ select count(*)::text from invoices $q$), '3');
select t.chk('other customer sees only theirs', t.run_as(:oth::uuid, $q$ select count(*)::text from invoices $q$), '1');
select t.chk('merchant1 sees only own invoices', t.run_as(:m1::uuid, $q$ select count(*)::text from invoices $q$), '2');
select t.chk('merchant2 sees only own invoices', t.run_as(:m2::uuid, $q$ select count(*)::text from invoices $q$), '2');
select t.chk('staff with orders.view sees all', t.run_as(:stf::uuid, $q$ select count(*)::text from invoices $q$), '4');
select t.chk('owner sees all', t.run_as(:own::uuid, $q$ select count(*)::text from invoices $q$), '4');
select t.chk('nobody can insert invoices directly', t.run_as(:cus::uuid, $q$ insert into invoices(order_id, items_json, subtotal, total) values ((select v from t.ids where k='o_sar'),'[]',1,1) returning id::text $q$), 'ERROR%');
select t.chk('buyer cannot edit an invoice', t.run_as(:cus::uuid, $q$ update invoices set total=1 returning id::text $q$), '');
select t.chk('customer cannot call internal issuer', t.run_as(:cus::uuid, $q$ select _issue_invoices((select v from t.ids where k='o_sar'))::text $q$), 'ERROR%permission denied%');
select t.chk('customer cannot call issue_invoice', t.run_as(:cus::uuid, $q$ select issue_invoice((select v from t.ids where k='o_sar'))::text $q$), 'ERROR%not allowed%');
select t.chk('re-issue never duplicates', t.run_as(:stf::uuid, $q$ select issue_invoice((select v from t.ids where k='o_sar'))::text $q$), '0');
select t.chk('buyer was notified', (select count(*)::text from notifications where user_id=:cus and title='صدرت فاتورتك'), '2');

\echo === 5. public QR verification ===
insert into t.ids select 'inv1', id from invoices where merchant_name='Store One' and order_id=(select v from t.ids where k='o_sar');
select verify_code as code from invoices where id=(select v from t.ids where k='inv1') \gset
select t.chk('anon verifies a genuine invoice', t.anon('select (verify_invoice(' || quote_literal(:'code') || ')->>''valid'')'), 'true');
select t.chk('verify shows number and currency', t.anon('select (verify_invoice(' || quote_literal(:'code') || ')->>''invoice_number'') || ''/'' || (verify_invoice(' || quote_literal(:'code') || ')->>''currency'')'), 'INV-%/SAR');
select t.chk('verify masks the buyer name', t.anon('select verify_invoice(' || quote_literal(:'code') || ')->>''buyer_masked'''), 'C*******');
select t.chk('verify leaks no phone or address', (position('0779' in t.anon('select verify_invoice(' || quote_literal(:'code') || ')::text')) = 0 and position('شارع' in t.anon('select verify_invoice(' || quote_literal(:'code') || ')::text')) = 0)::text, 'true');
select t.chk('wrong code is not valid', t.anon($q$ select verify_invoice('ABCDEF0123456789')->>'valid' $q$), 'false');
select t.chk('short code is not valid', t.anon($q$ select verify_invoice('x')->>'valid' $q$), 'false');
select t.chk('anon cannot read invoices table', t.anon($q$ select count(*)::text from invoices $q$), '0');
select t.chk('lowercase code also verifies', t.anon('select verify_invoice(' || quote_literal(lower(:'code')) || ')->>''valid'''), 'true');

\echo === 6. installments in USD ===
select t.chk('employee joins company', t.run_as(:emp::uuid, $q$ select (join_company((select id from companies_public limit 1),'Engineer','E-1') is not null)::text $q$), 'true');
insert into t.ids select 'emp', id from employees where user_id=:emp;
select t.chk('company sets limit 5,000,000 YER', t.run_as(:com::uuid, $q$ select company_set_employee((select v from t.ids where k='emp'),'eligible',5000000, 200000)::text $q$), '');
select t.chk('employee places USD installment order (6 months)', t.run_as(:emp::uuid,
  $q$ select place_order(('[{"product_id":"' || (select id from products where name='DollarPhone') || '","quantity":1},{"product_id":"' || (select id from products where name='RialFridge') || '","quantity":1}]')::jsonb,'installment','Emp Ali','0777000444','عدن','المنصورة','شارع',null,6,(select id from guarantee_types where code='salary_deduction'),'{}'::jsonb,null,null,null,'ee300000-0000-0000-0000-000000000001','USD')::text $q$, true), '________-____-____-____-____________');
insert into t.ids select 'app', id from financing_applications where applicant_user_id=:emp;
-- 100 + 50000/500=100 -> cash 200.00 USD ; deferred 200*1.22 = 244.00 ; monthly 40.67 ; last 244 - 5*40.67 = 40.65
select t.chk('application is in USD, priced in USD', (select currency || '/' || cash_price || '/' || deferred_price || '/' || monthly_installment from financing_applications), 'USD/200.00/244.00/40.67');
select t.chk('no invoice before approval', (select count(*)::text from invoices where buyer_id=:emp), '0');
select t.chk('company approves', t.run_as(:com::uuid, $q$ select company_decide_application((select v from t.ids where k='app'), true, 'ok')::text $q$), '');
select t.chk('still no invoice after company step', (select count(*)::text from invoices where buyer_id=:emp), '0');
select t.chk('owner approves', t.run_as(:own::uuid, $q$ select (decide_application((select v from t.ids where k='app'), true, 'good') is not null)::text $q$), 'true');
select t.chk('schedule sums to deferred price, last absorbs rounding', (select count(*) || '/' || sum(amount) || '/' || max(amount) filter (where number=6) from installments), '6/244.00/40.65');
select t.chk('used_limit grew by 244 USD in YER (122000)', (select used_limit::text from employees where user_id=:emp), '122000.00');
select t.chk('invoices issued on approval: one per merchant', (select count(*)::text from invoices where buyer_id=:emp), '2');
select t.chk('installment invoice kind, currency, months', (select string_agg(distinct kind || '/' || currency || '/' || months, ',') from invoices where buyer_id=:emp), 'installment_sale/USD/6');
select t.chk('invoice shares add up to deferred price', (select sum(deferred_total)::text from invoices where buyer_id=:emp), '244.00');
select t.chk('invoice monthly shares add up', (select sum(monthly)::text from invoices where buyer_id=:emp), '40.67');
select t.chk('invoice cash totals add up', (select sum(total)::text from invoices where buyer_id=:emp), '200.00');
select t.chk('invoice linked to the contract', (select count(*)::text from invoices where buyer_id=:emp and contract_id=(select id from contracts)), '2');
select t.chk('markup recorded on invoice', (select distinct markup_percent::text from invoices where buyer_id=:emp), '22.00');
select t.chk('employee sees own installment invoices', t.run_as(:emp::uuid, $q$ select count(*)::text from invoices $q$), '2');
select t.chk('record payment in USD', t.run_as(:own::uuid, $q$ select (record_payment((select id from installments where number=1), 40.67, 'cash') is not null)::text $q$), 'true');
select t.chk('used_limit reduced by 40.67 USD = 20335', (select used_limit::text from employees where user_id=:emp), '101665.00');
select t.chk('payment notification mentions the currency', (select count(*)::text from notifications where user_id=:emp and body like '%USD%'), '1');

\echo === 7. settlement keeps the currency ===
select t.chk('owner starts a settlement', t.run_as(:own::uuid, $q$ select set_commission_settlement((select id from commissions c where currency='SAR' limit 1), 'processing')::text $q$), '');
select t.chk('settlement currency = commission currency', (select string_agg(distinct currency, ',') from settlements), 'SAR');
