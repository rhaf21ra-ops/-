\set ON_ERROR_STOP off
\pset tuples_only on
set client_min_messages = notice;
create schema if not exists t;
create or replace function t.run_as(u uuid, q text) returns text language plpgsql as $$
declare r text;
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
  begin execute q into r; execute 'reset role'; return coalesce(r, '');
  exception when others then execute 'reset role'; return 'ERROR: ' || sqlerrm; end;
end $$;
create or replace function t.chk(label text, got text, want text) returns void language plpgsql as $$
begin
  if got like want then raise notice 'PASS  %  -> %', label, got;
  else raise notice 'FAIL  %  -> got [%] want [%]', label, got, want; end if;
end $$;
\set own '''d0000000-0000-0000-0000-000000000001'''
\set cus '''d0000000-0000-0000-0000-000000000002'''
\set emp '''d0000000-0000-0000-0000-000000000003'''
\set stf '''d0000000-0000-0000-0000-000000000004'''
\set nop '''d0000000-0000-0000-0000-000000000005'''
select set_config('request.jwt.claim.role', 'service_role', false);
insert into auth.users(id, raw_user_meta_data) values
 (:own,'{"role":"customer","full_name":"Owner"}'),(:cus,'{"role":"customer","full_name":"Cus"}'),
 (:emp,'{"role":"employee","full_name":"Emp"}'),(:stf,'{"role":"customer","full_name":"Staff"}'),(:nop,'{"role":"customer","full_name":"NoPerm"}');
insert into user_roles select :own, id from roles where name='admin';
insert into user_roles select :stf, id from roles where name='staff_orders';
insert into user_roles select :nop, id from roles where name='staff_verification';

\echo === product requests ===
select t.chk('permission exists', (select count(*)::text from permissions where code='requests.manage'), '1');
select t.chk('staff_orders holds it', (select count(*)::text from role_permissions rp join roles r on r.id=rp.role_id join permissions p on p.id=rp.permission_id where r.name='staff_orders' and p.code='requests.manage'), '1');
select t.chk('customer sends link request', t.run_as(:cus::uuid, $q$ insert into product_requests(product_name, product_url, store_name) values ('Phone X','https://shop.example/p/1','Store A') returning status $q$), 'new');
select t.chk('employee sends image request', t.run_as(:emp::uuid, $q$ insert into product_requests(product_name, image_path) values ('Fridge','d0000000-0000-0000-0000-000000000003/a.jpg') returning status $q$), 'new');
select t.chk('request without link or image rejected', t.run_as(:cus::uuid, $q$ insert into product_requests(product_name) values ('Nothing') returning id::text $q$), 'ERROR%link_or_image%');
select t.chk('bad url rejected', t.run_as(:cus::uuid, $q$ insert into product_requests(product_name, product_url) values ('Bad','javascript:alert(1)') returning id::text $q$), 'ERROR%');
select t.chk('image in someone elses folder rejected', t.run_as(:cus::uuid, $q$ insert into product_requests(product_name, image_path) values ('X','d0000000-0000-0000-0000-000000000003/a.jpg') returning id::text $q$), 'ERROR%');
select t.chk('cannot send as another user', t.run_as(:cus::uuid, $q$ insert into product_requests(user_id, product_name, product_url) values ('d0000000-0000-0000-0000-000000000003','X','https://a.b') returning id::text $q$), 'ERROR%');
select t.chk('cannot self-set status', t.run_as(:cus::uuid, $q$ insert into product_requests(product_name, product_url, status) values ('X','https://a.b','approved') returning id::text $q$), 'ERROR%');
select t.chk('bad months rejected', t.run_as(:cus::uuid, $q$ insert into product_requests(product_name, product_url, months) values ('X','https://a.b',7) returning id::text $q$), 'ERROR%');
select t.chk('sender gets confirmation notification', (select count(*)::text from notifications where user_id=:cus and title like 'استلمنا%'), '1');
select t.chk('customer sees only own', t.run_as(:cus::uuid, $q$ select count(*)::text from product_requests $q$), '1');
select t.chk('other staff without permission sees none', t.run_as(:nop::uuid, $q$ select count(*)::text from product_requests $q$), '0');
select t.chk('staff with permission sees all', t.run_as(:stf::uuid, $q$ select count(*)::text from product_requests $q$), '2');
select t.chk('owner sees all', t.run_as(:own::uuid, $q$ select count(*)::text from product_requests $q$), '2');
select t.chk('sender cannot update directly', t.run_as(:cus::uuid, $q$ update product_requests set status='approved' where user_id='d0000000-0000-0000-0000-000000000002' returning status $q$), '');
select t.chk('status unchanged', (select status from product_requests where user_id=:cus), 'new');
select t.chk('no-permission staff cannot update', t.run_as(:nop::uuid, $q$ update product_requests set status='rejected' returning status $q$), '');
select t.chk('staff moves to contacting_store', t.run_as(:stf::uuid, $q$ update product_requests set status='contacting_store', admin_note='اتصلنا بالمتجر' where user_id='d0000000-0000-0000-0000-000000000002' returning status $q$), 'contacting_store');
select t.chk('sender notified of status', (select count(*)::text from notifications where user_id=:cus and title like 'تحديث على طلب المنتج%' and body like '%نتواصل%' and body like '%اتصلنا بالمتجر%'), '1');
select t.chk('staff sends offer with quote', t.run_as(:stf::uuid, $q$ update product_requests set status='offer_sent', quoted_price=150000 where user_id='d0000000-0000-0000-0000-000000000002' returning quoted_price::text $q$), '150000.00');
select t.chk('updated_at touched', (select (updated_at > created_at)::text from product_requests where user_id=:cus), 'true');
select t.chk('other user cannot cancel', t.run_as(:emp::uuid, $q$ select cancel_product_request((select id from product_requests where user_id='d0000000-0000-0000-0000-000000000002'))::text $q$), 'ERROR%');
select t.chk('sender cancels own open request', t.run_as(:cus::uuid, $q$ select cancel_product_request((select id from product_requests where user_id='d0000000-0000-0000-0000-000000000002'))::text $q$), '');
select t.chk('status cancelled', (select status from product_requests where user_id=:cus), 'cancelled');
select t.chk('cannot cancel twice', t.run_as(:cus::uuid, $q$ select cancel_product_request((select id from product_requests where user_id='d0000000-0000-0000-0000-000000000002'))::text $q$), 'ERROR%');
select t.chk('anon cannot read', (select count(*)::text from (select 1 from pg_policies where tablename='product_requests' and roles::text like '%anon%') x), '0');
select t.chk('bucket is private', (select public::text from storage.buckets where id='request-images'), 'false');
