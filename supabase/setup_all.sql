-- قسطها: إعداد قاعدة البيانات كاملاً بملف واحد. الصقه في Supabase > SQL Editor ونفّذه مرة واحدة على مشروع جديد فارغ.
-- يضم الترحيلات 0001..0018 بالترتيب (بدون ملفات البيانات التجريبية). لا تنفذه مرتين على نفس القاعدة.

-- ═══════════ 0001_core_schema.sql ═══════════
-- Qistuha: core schema (Phase 1). UNTESTED: apply to a Supabase project and verify.
create extension if not exists pgcrypto;

-- ───────── Roles & permissions ─────────
create table roles (
  id serial primary key,
  name text unique not null check (name in ('customer','employee','merchant','company','admin','financial'))
);
create table permissions (
  id serial primary key,
  code text unique not null,
  description text
);
create table role_permissions (
  role_id int references roles(id) on delete cascade,
  permission_id int references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);
insert into roles(name) values ('customer'),('employee'),('merchant'),('company'),('admin'),('financial');

create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text unique,
  phone_verified boolean not null default false,
  governorate text,
  city text,
  address text,
  identity_status text not null default 'none'
    check (identity_status in ('none','pending','verified','rejected')),
  identity_consent_at timestamptz,
  created_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role_id int references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- ───────── Helper functions (SECURITY DEFINER avoids RLS recursion) ─────────
create or replace function has_role(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_roles ur join roles ro on ro.id = ur.role_id
    where ur.user_id = auth.uid() and ro.name = r
  );
$$;
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$ select has_role('admin') $$;

-- Public signup may only pick these roles. Admin/financial are assigned by admins only.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare requested text := coalesce(new.raw_user_meta_data->>'role','customer');
begin
  if requested not in ('customer','employee','merchant','company') then
    requested := 'customer';
  end if;
  insert into user_profiles(id, full_name, phone)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone');
  insert into user_roles(user_id, role_id)
    select new.id, id from roles where name = requested;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ───────── Organizations ─────────
create table companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  name text not null,
  commercial_register text,
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now()
);
create table merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  business_name text not null,
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now()
);
create table stores (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name text not null,
  city text,
  governorate text
);
create table employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  company_id uuid references companies(id),
  job_title text,
  employee_number text,
  salary numeric(14,2),
  eligibility text not null default 'pending' check (eligibility in ('pending','eligible','ineligible')),
  installment_limit numeric(14,2) not null default 0,
  used_limit numeric(14,2) not null default 0,
  check (used_limit >= 0 and used_limit <= installment_limit)
);

-- ───────── Catalog ─────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique
);
create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  category_id uuid references categories(id),
  sku text unique,
  name text not null,
  description text,
  cash_price numeric(14,2) not null check (cash_price > 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  stock int not null default 0 check (stock >= 0),
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  color text, size text, sku text unique,
  stock int not null default 0 check (stock >= 0)
);
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null, position int not null default 0
);
create table installment_plans (
  months int primary key check (months in (6,9,12,18,24)),
  markup_percent numeric(5,2) not null default 22
);
insert into installment_plans(months) values (6),(9),(12),(18),(24);

-- ───────── Orders ─────────
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('SQ-' || to_char(now(),'YYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled','returned')),
  payment_method text not null check (payment_method in ('cash_on_delivery','installment')),
  recipient_name text not null, phone text not null,
  governorate text not null, city text not null, address text not null, notes text,
  subtotal numeric(14,2) not null, discount numeric(14,2) not null default 0,
  shipping numeric(14,2) not null default 0, total numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  merchant_id uuid references merchants(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(14,2) not null,
  installment_months int check (installment_months in (6,9,12,18,24))
);
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null, changed_by uuid references auth.users(id), note text,
  created_at timestamptz not null default now()
);

-- ───────── Financing ─────────
create table financing_applications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id),
  company_id uuid references companies(id),
  order_id uuid references orders(id),
  cash_price numeric(14,2) not null,
  deferred_price numeric(14,2) not null,
  months int not null references installment_plans(months),
  status text not null default 'pending_company' check (status in
    ('pending_company','company_rejected','pending_identity','pending_admin','approved','admin_rejected','cancelled')),
  company_decided_by uuid references auth.users(id),
  company_decided_at timestamptz, company_note text,
  admin_decided_by uuid references auth.users(id),
  admin_decided_at timestamptz, admin_note text,
  created_at timestamptz not null default now()
);
create table contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null, body text not null
);
create table contracts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid unique not null references financing_applications(id),
  status text not null default 'active' check (status in ('active','completed','defaulted')),
  created_at timestamptz not null default now()
);
create table installments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  number int not null, due_date date not null,
  amount numeric(14,2) not null,
  status text not null default 'due' check (status in ('due','paid','overdue')),
  unique (contract_id, number)
);
create table payments (
  id uuid primary key default gen_random_uuid(),
  installment_id uuid not null references installments(id),
  amount numeric(14,2) not null check (amount > 0),
  method text, recorded_by uuid references auth.users(id),
  paid_at timestamptz not null default now()
);

-- ───────── Security / support tables ─────────
create table otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,                 -- SHA-256 hex, never plaintext
  expires_at timestamptz not null,
  attempts int not null default 0,
  resends int not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create table audit_logs (
  id bigserial primary key,
  actor_id uuid, action text not null, entity text, entity_id text,
  details jsonb, created_at timestamptz not null default now()
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, body text, read boolean not null default false,
  created_at timestamptz not null default now()
);
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade
);
create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  installment_months int check (installment_months in (6,9,12,18,24))
);

-- ───────── RLS ─────────
do $$ declare t text; begin
  for t in select unnest(array[
    'roles','permissions','role_permissions','user_profiles','user_roles','companies','merchants',
    'stores','employees','categories','products','product_variants','product_images',
    'installment_plans','orders','order_items','order_status_history','financing_applications',
    'contract_templates','contracts','installments','payments','otp_verifications',
    'audit_logs','notifications','carts','cart_items'])
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

-- Admin: full access everywhere
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' and rowsecurity
  loop execute format('create policy admin_all on %I for all using (is_admin()) with check (is_admin())', t); end loop;
end $$;

-- Public reads
create policy public_read on categories for select using (true);
create policy public_read on roles for select using (true);
create policy public_read on installment_plans for select using (true);
create policy public_read on products for select using (active);
create policy public_read on product_variants for select using (true);
create policy public_read on product_images for select using (true);
create policy public_read on stores for select using (true);
create policy public_read on merchants for select using (status = 'active');

-- Own data
create policy own_profile on user_profiles for select using (id = auth.uid());
create policy own_profile_upd on user_profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy own_roles on user_roles for select using (user_id = auth.uid());
create policy own_notifications on notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_cart on carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_cart_items on cart_items for all
  using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy own_orders on orders for select using (user_id = auth.uid());
create policy own_orders_ins on orders for insert with check (user_id = auth.uid());
create policy own_order_items on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy own_employee on employees for select using (user_id = auth.uid());

-- Merchant: own products and related orders
create policy merchant_own on merchants for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy merchant_stores on stores for all
  using (exists (select 1 from merchants m where m.id = merchant_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from merchants m where m.id = merchant_id and m.owner_id = auth.uid()));
create policy merchant_products on products for all
  using (exists (select 1 from stores s join merchants m on m.id = s.merchant_id where s.id = store_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from stores s join merchants m on m.id = s.merchant_id where s.id = store_id and m.owner_id = auth.uid()));
create policy merchant_order_items on order_items for select
  using (exists (select 1 from merchants m where m.id = merchant_id and m.owner_id = auth.uid()));

-- Company: own employees and their applications only
create policy company_own on companies for select using (owner_id = auth.uid());
create policy company_employees on employees for select
  using (exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid()));
create policy company_apps on financing_applications for select
  using (exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid()));
-- Company decisions go through an RPC/Edge Function that enforces the state machine (see Phase 9).

create policy employee_apps on financing_applications for select
  using (exists (select 1 from employees e where e.id = employee_id and e.user_id = auth.uid()));
create policy employee_contracts on contracts for select
  using (exists (select 1 from financing_applications a join employees e on e.id = a.employee_id
                 where a.id = application_id and e.user_id = auth.uid()));
create policy employee_installments on installments for select
  using (exists (select 1 from contracts k join financing_applications a on a.id = k.application_id
                 join employees e on e.id = a.employee_id where k.id = contract_id and e.user_id = auth.uid()));

-- Financial role: read-only on financing data
create policy financial_read on financing_applications for select using (has_role('financial'));
create policy financial_read on contracts for select using (has_role('financial'));
create policy financial_read on installments for select using (has_role('financial'));
create policy financial_read on payments for select using (has_role('financial'));

-- otp_verifications: no client policies. Only the service role (Edge Function) touches it.
-- audit_logs: admin read only (admin_all). Writes via service role / SECURITY DEFINER functions.

-- Stock decrement happens in a SECURITY DEFINER function (Phase 3), not directly by clients.

-- ═══════════ 0002_staff_roles.sql ═══════════
-- Owner (admin) + staff roles with granular permissions. UNTESTED: apply and verify with real users.

-- 1) New staff roles
alter table roles drop constraint roles_name_check;
alter table roles add constraint roles_name_check check (name in (
  'customer','employee','merchant','company','admin','financial',
  'staff_verification','staff_merchants','staff_financing','staff_orders','staff_support'));
insert into roles(name) values
  ('staff_verification'),('staff_merchants'),('staff_financing'),('staff_orders'),('staff_support');

-- 2) Only ONE owner (admin) can exist: you.
create or replace function enforce_single_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role_id = (select id from roles where name = 'admin')
     and exists (select 1 from user_roles where role_id = new.role_id and user_id <> new.user_id) then
    raise exception 'only one admin (owner) is allowed';
  end if;
  return new;
end $$;
create trigger single_admin before insert or update on user_roles
  for each row execute function enforce_single_admin();
-- The first admin row is inserted once, manually, by you via the SQL editor (service role).

-- 3) Permission catalog
insert into permissions(code, description) values
  ('identity.review',   'مراجعة وتأكيد هوية الحسابات'),
  ('merchants.view',    'عرض التجار ومتاجرهم'),
  ('merchants.manage',  'تفعيل/إيقاف التجار ومراجعة منتجاتهم'),
  ('financing.view',    'عرض طلبات التمويل والعقود والأقساط'),
  ('financing.review',  'مراجعة طلبات التمويل وإضافة ملاحظات'),
  ('payments.record',   'تسجيل دفعات الأقساط'),
  ('orders.view',       'عرض الطلبات'),
  ('orders.update',     'تحديث حالة الطلبات والتوصيل'),
  ('support.manage',    'الرد على تذاكر الدعم');
-- financing.approve (final approval) is deliberately NOT granted to any staff role: owner only.

-- 4) Role -> permissions
insert into role_permissions(role_id, permission_id)
select r.id, p.id from (values
  ('staff_verification','identity.review'),
  ('staff_merchants','merchants.view'),('staff_merchants','merchants.manage'),
  ('staff_financing','financing.view'),('staff_financing','financing.review'),('staff_financing','payments.record'),
  ('staff_orders','orders.view'),('staff_orders','orders.update'),
  ('staff_support','support.manage')
) as m(role_name, perm) join roles r on r.name = m.role_name join permissions p on p.code = m.perm;

-- 5) Per-user extra permissions (optional fine-tuning by the owner)
create table user_permissions (
  user_id uuid references auth.users(id) on delete cascade,
  permission_id int references permissions(id) on delete cascade,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);
alter table user_permissions enable row level security;
create policy admin_all on user_permissions for all using (is_admin()) with check (is_admin());
create policy own_perms on user_permissions for select using (user_id = auth.uid());

-- 6) Permission check (role-derived OR directly granted). The owner has every permission.
-- NOTE: the parameter is named `perm`, NOT `code`. A parameter called `code` would be shadowed by
-- the column permissions.code and the comparison would always be true (found by testing).
create or replace function has_permission(perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin()
  or exists (
    select 1 from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid() and p.code = has_permission.perm)
  or exists (
    select 1 from user_permissions up join permissions p on p.id = up.permission_id
    where up.user_id = auth.uid() and p.code = has_permission.perm);
$$;

-- 7) Staff management: ONLY the owner, always audited.
create or replace function grant_staff_role(target uuid, role_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if role_name not like 'staff\_%' then raise exception 'only staff roles can be granted here'; end if;
  insert into user_roles(user_id, role_id) select target, id from roles where name = role_name
    on conflict do nothing;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'grant_staff_role', 'user', target::text, jsonb_build_object('role', role_name));
end $$;
create or replace function revoke_staff_role(target uuid, role_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  delete from user_roles where user_id = target and role_id = (select id from roles where name = role_name);
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'revoke_staff_role', 'user', target::text, jsonb_build_object('role', role_name));
end $$;
revoke execute on function grant_staff_role(uuid,text), revoke_staff_role(uuid,text) from public, anon;
grant execute on function grant_staff_role(uuid,text), revoke_staff_role(uuid,text) to authenticated;

-- 8) Staff RLS. Each staff member sees ONLY what their permission allows.
-- Account/identity verification
create policy staff_identity_read on user_profiles for select using (has_permission('identity.review'));
create policy staff_identity_upd on user_profiles for update
  using (has_permission('identity.review')) with check (has_permission('identity.review'));
-- Merchants
create policy staff_merchants_read on merchants for select using (has_permission('merchants.view'));
create policy staff_merchants_upd on merchants for update
  using (has_permission('merchants.manage')) with check (has_permission('merchants.manage'));
create policy staff_stores_read on stores for select using (has_permission('merchants.view'));
create policy staff_products_read on products for select using (has_permission('merchants.view'));
create policy staff_products_upd on products for update
  using (has_permission('merchants.manage')) with check (has_permission('merchants.manage'));
-- Financing (read + review notes; final approval stays with the owner via RPC)
create policy staff_fin_apps on financing_applications for select using (has_permission('financing.view'));
create policy staff_fin_contracts on contracts for select using (has_permission('financing.view'));
create policy staff_fin_installments on installments for select using (has_permission('financing.view'));
create policy staff_fin_payments on payments for select using (has_permission('financing.view'));
-- Orders
create policy staff_orders_read on orders for select using (has_permission('orders.view'));
create policy staff_orders_upd on orders for update
  using (has_permission('orders.update')) with check (has_permission('orders.update'));
create policy staff_order_items_read on order_items for select using (has_permission('orders.view'));
create policy staff_order_history on order_status_history for select using (has_permission('orders.view'));

-- Staff can read their own audit trail; they can never read identity files without an audited RPC.
create policy staff_own_audit on audit_logs for select using (actor_id = auth.uid());

-- ═══════════ 0003_custom_staff_roles.sql ═══════════
-- Custom staff roles created by the owner. UNTESTED: apply after 0002 and verify with real users.

-- 1) Allow custom role names, but only with the staff_ prefix (they can never impersonate admin/merchant/etc.)
alter table roles drop constraint roles_name_check;
alter table roles add constraint roles_name_check check (
  name in ('customer','employee','merchant','company','admin','financial',
           'staff_verification','staff_merchants','staff_financing','staff_orders','staff_support')
  or name ~ '^staff_[a-z0-9_]{2,40}$');

alter table roles add column if not exists display_name text;
alter table roles add column if not exists is_system boolean not null default true;
alter table roles add column if not exists created_by uuid references auth.users(id);

update roles set display_name = case name
  when 'staff_verification' then 'مراقبة تأكيد الحسابات'
  when 'staff_merchants'    then 'متابعة التجار'
  when 'staff_financing'    then 'متابعة التمويلات'
  when 'staff_orders'       then 'متابعة الطلبات'
  when 'staff_support'      then 'الدعم'
  else name end
where display_name is null;

-- 2) Create a custom role with its permissions (owner only, audited)
create or replace function create_custom_role(slug text, label text, perm_codes text[]) returns int
language plpgsql security definer set search_path = public as $$
declare rid int; bad text[];
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if slug !~ '^staff_[a-z0-9_]{2,40}$' then raise exception 'invalid role slug'; end if;
  select array_agg(c) into bad from unnest(perm_codes) c
    where not exists (select 1 from permissions p where p.code = c);
  if bad is not null then raise exception 'unknown permissions: %', bad; end if;

  insert into roles(name, display_name, is_system, created_by)
    values (slug, label, false, auth.uid()) returning id into rid;
  insert into role_permissions(role_id, permission_id)
    select rid, id from permissions where code = any(perm_codes);
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'create_custom_role', 'role', rid::text,
            jsonb_build_object('slug', slug, 'label', label, 'permissions', perm_codes));
  return rid;
end $$;

-- 3) Change a role's permissions (takes effect immediately for everyone holding the role)
create or replace function set_role_permissions(role_slug text, perm_codes text[]) returns void
language plpgsql security definer set search_path = public as $$
declare rid int; bad text[];
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select id into rid from roles where name = role_slug and name like 'staff\_%';
  if rid is null then raise exception 'not a staff role'; end if;
  select array_agg(c) into bad from unnest(perm_codes) c
    where not exists (select 1 from permissions p where p.code = c);
  if bad is not null then raise exception 'unknown permissions: %', bad; end if;

  delete from role_permissions where role_id = rid;
  insert into role_permissions(role_id, permission_id)
    select rid, id from permissions where code = any(perm_codes);
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'set_role_permissions', 'role', rid::text,
            jsonb_build_object('slug', role_slug, 'permissions', perm_codes));
end $$;

-- 4) Delete a custom role (system roles are protected). Holders lose it immediately.
create or replace function delete_custom_role(role_slug text) returns void
language plpgsql security definer set search_path = public as $$
declare rid int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select id into rid from roles where name = role_slug and is_system = false;
  if rid is null then raise exception 'role not found or is a system role'; end if;
  delete from roles where id = rid;   -- cascades to user_roles and role_permissions
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'delete_custom_role', 'role', rid::text, jsonb_build_object('slug', role_slug));
end $$;

-- 5) Grant/revoke per-user extra permissions (owner only, audited)
create or replace function grant_user_permission(target uuid, perm_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if perm_code = 'financing.approve' then raise exception 'final approval is owner-only'; end if;
  insert into user_permissions(user_id, permission_id, granted_by)
    select target, id, auth.uid() from permissions where code = perm_code on conflict do nothing;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'grant_user_permission', 'user', target::text, jsonb_build_object('permission', perm_code));
end $$;
create or replace function revoke_user_permission(target uuid, perm_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  delete from user_permissions where user_id = target
    and permission_id = (select id from permissions where code = perm_code);
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'revoke_user_permission', 'user', target::text, jsonb_build_object('permission', perm_code));
end $$;

revoke execute on function create_custom_role(text,text,text[]), set_role_permissions(text,text[]),
  delete_custom_role(text), grant_user_permission(uuid,text), revoke_user_permission(uuid,text)
  from public, anon;
grant execute on function create_custom_role(text,text,text[]), set_role_permissions(text,text[]),
  delete_custom_role(text), grant_user_permission(uuid,text), revoke_user_permission(uuid,text)
  to authenticated;   -- each function re-checks is_admin() internally

-- 6) Permissions catalog additions useful for custom roles (e.g. accountant)
insert into permissions(code, description) values
  ('reports.view',      'عرض التقارير'),
  ('settlements.view',  'عرض تسويات التجار'),
  ('settlements.manage','تنفيذ التسويات'),
  ('users.view',        'عرض المستخدمين'),
  ('audit.view',        'عرض سجل التدقيق')
on conflict (code) do nothing;

-- ═══════════ 0004_reconcile.sql ═══════════
-- 0004: reconcile with the original project spec + merchant commission (1-10%) +
-- per-customer installment markup + guarantee types. UNTESTED: apply after 0003 and verify.

-- ═════════ 1. Platform settings & installment markup ═════════
create table platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into platform_settings(key, value) values ('default_markup_percent', '22'::jsonb);

-- The old per-plan markup column is replaced by the default setting + per-customer override.
alter table installment_plans drop column markup_percent;
alter table installment_plans add column active boolean not null default true;

-- Per-customer / per-employee override. Only the owner writes; the user may read their own.
create table customer_pricing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  markup_percent numeric(5,2) not null check (markup_percent between 0 and 100),
  note text,
  set_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- Internal lookup, no access checks. Not callable by clients.
create or replace function _markup_for(uid uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select markup_percent from customer_pricing where user_id = uid),
    (select (value #>> '{}')::numeric from platform_settings where key = 'default_markup_percent'),
    22);
$$;
revoke execute on function _markup_for(uuid) from public, anon, authenticated;

-- Public face: a user sees their own rate; admin and financing staff see anyone's.
create or replace function effective_markup(uid uuid default auth.uid()) returns numeric
language plpgsql stable security definer set search_path = public as $$
begin
  if uid is distinct from auth.uid() and not (is_admin() or has_permission('financing.view')) then
    raise exception 'not allowed';
  end if;
  return _markup_for(uid);
end $$;

-- Quote: deferred = round(cash x (1 + markup/100)); monthly = round(deferred / months);
-- the LAST installment absorbs the rounding difference so the sum is exact.
create or replace function installment_quote(cash numeric, months int, uid uuid default auth.uid())
returns table(markup numeric, deferred numeric, monthly numeric, last_installment numeric)
language plpgsql stable security definer set search_path = public as $$
declare m numeric;
begin
  if cash is null or cash <= 0 then raise exception 'invalid cash price'; end if;
  if not exists (select 1 from installment_plans p where p.months = installment_quote.months and p.active) then
    raise exception 'invalid installment duration';
  end if;
  if uid is distinct from auth.uid() and not (is_admin() or has_permission('financing.view')) then
    raise exception 'not allowed';
  end if;
  m := _markup_for(uid);
  markup := m;
  deferred := round(cash * (1 + m / 100));
  monthly := round(deferred / months);
  last_installment := deferred - monthly * (months - 1);
  return next;
end $$;
grant execute on function effective_markup(uuid), installment_quote(numeric,int,uuid) to authenticated, anon;

-- Audit every pricing change (who, old, new)
create or replace function audit_pricing_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; ref jsonb;
begin
  if tg_op <> 'INSERT' then o := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then n := to_jsonb(new); end if;
  ref := coalesce(n, o);
  insert into audit_logs(actor_id, action, entity, entity_id, details)
  values (auth.uid(), tg_table_name || '_' || lower(tg_op), tg_table_name,
          coalesce(ref->>'user_id', ref->>'key'),
          jsonb_build_object('old', o, 'new', n));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger audit_customer_pricing after insert or update or delete on customer_pricing
  for each row execute function audit_pricing_change();
create trigger audit_platform_settings after insert or update or delete on platform_settings
  for each row execute function audit_pricing_change();

-- ═════════ 2. Merchant commission: integer 1..10 %, computed automatically ═════════
alter table merchants add column if not exists store_name text;
alter table merchants add column if not exists owner_name text;
alter table merchants add column if not exists rating numeric(3,2) not null default 0;
alter table merchants add column if not exists sales_total numeric(16,2) not null default 0;
alter table merchants add column commission_percent int not null default 5
  check (commission_percent between 1 and 10);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id),
  period_start date, period_end date,
  gross numeric(16,2) not null default 0,
  commission numeric(16,2) not null default 0,
  net numeric(16,2) not null default 0,
  status text not null default 'processing' check (status in ('processing','in_progress','paid')),
  paid_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid unique not null references order_items(id) on delete cascade,
  merchant_id uuid not null references merchants(id),
  percent int not null check (percent between 1 and 10),   -- snapshot at order time
  gross numeric(14,2) not null,
  commission numeric(14,2) not null,
  net numeric(14,2) not null,
  settlement_id uuid references settlements(id),
  created_at timestamptz not null default now()
);

create or replace function compute_commission(gross numeric, pct int) returns numeric
language sql immutable as $$ select round(gross * pct / 100.0) $$;

-- Automatic: every order item produces its commission row using the merchant's current percent.
create or replace function order_item_commission() returns trigger
language plpgsql security definer set search_path = public as $$
declare pct int; g numeric; c numeric;
begin
  if new.merchant_id is null then return new; end if;
  select commission_percent into pct from merchants where id = new.merchant_id;
  g := new.quantity * new.unit_price;
  c := compute_commission(g, pct);
  insert into commissions(order_item_id, merchant_id, percent, gross, commission, net)
  values (new.id, new.merchant_id, pct, g, c, g - c);
  return new;
end $$;
create trigger trg_order_item_commission after insert on order_items
  for each row execute function order_item_commission();

-- Merchants own their row (policy merchant_own) but must NOT set their own status/commission/rating.
create or replace function guard_merchant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.commission_percent := 5; new.rating := 0; new.sales_total := 0;
  else
    if not has_permission('merchants.manage') then new.status := old.status; end if;
    new.commission_percent := old.commission_percent;
    new.rating := old.rating;
    new.sales_total := old.sales_total;
  end if;
  return new;
end $$;
create trigger trg_guard_merchant before insert or update on merchants
  for each row execute function guard_merchant();

-- The public must NOT read the commission rate (or owner_id/sales_total): row-level policies cannot hide
-- columns, so the public listing goes through a view that exposes safe columns only.
drop policy public_read on merchants;
create view merchants_public as
  select id, business_name, store_name, rating from merchants where status = 'active';
grant select on merchants_public to anon, authenticated;

create or replace function audit_commission_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.commission_percent is distinct from old.commission_percent then
    insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'merchant_commission_changed', 'merchant', new.id::text,
            jsonb_build_object('old', old.commission_percent, 'new', new.commission_percent));
  end if;
  return new;
end $$;
create trigger trg_audit_commission after update on merchants
  for each row execute function audit_commission_change();

-- ═════════ 3. Guarantee types (shown to the customer when requesting installments) ═════════
create table guarantee_types (
  id serial primary key,
  code text unique not null,
  name_ar text not null,
  description_ar text,
  requires_guarantor boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0
);
-- Editable by the owner from /admin. These are starting values, not legal advice.
insert into guarantee_types(code, name_ar, description_ar, requires_guarantor, sort_order) values
  ('salary_deduction', 'خصم من الراتب عبر الشركة', 'تلتزم جهة العمل بخصم القسط من راتبك الشهري', false, 1),
  ('company_undertaking', 'تعهد خطي من الشركة', 'تعهد رسمي من جهة العمل بسداد الأقساط', false, 2),
  ('personal_guarantor', 'كفيل شخصي', 'شخص يكفلك ويُدخل بياناته عند الطلب', true, 3),
  ('guarantee_cheque', 'شيك ضمان', 'شيك مصرفي ضمان بقيمة التمويل', false, 4),
  ('promissory_note', 'سند لأمر', 'سند موقّع يثبت الدين', false, 5);

alter table financing_applications
  add column guarantee_type_id int references guarantee_types(id),
  add column guarantor_name text,
  add column guarantor_phone text,
  add column guarantor_id_number text,
  add column guarantee_notes text,
  add column markup_percent_applied numeric(5,2),
  add column monthly_installment numeric(14,2),
  add column review_stage text not null default 'company' check (review_stage in ('company','admin')),
  add column company_approved boolean,
  add column rejection_reason text;

-- Server-side truth: guarantee is mandatory; the price is re-computed here; the client value is ignored.
create or replace function financing_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid; m numeric; g guarantee_types;
begin
  select user_id into uid from employees where id = new.employee_id;
  if new.guarantee_type_id is null then raise exception 'guarantee type is required'; end if;
  select * into g from guarantee_types where id = new.guarantee_type_id and active;
  if not found then raise exception 'invalid guarantee type'; end if;
  if g.requires_guarantor and (coalesce(trim(new.guarantor_name), '') = ''
                               or coalesce(trim(new.guarantor_phone), '') = '') then
    raise exception 'guarantor details are required for this guarantee type';
  end if;
  m := _markup_for(uid);
  new.markup_percent_applied := m;
  new.deferred_price := round(new.cash_price * (1 + m / 100));
  new.monthly_installment := round(new.deferred_price / new.months);
  return new;
end $$;
create trigger trg_financing_before_insert before insert on financing_applications
  for each row execute function financing_before_insert();

-- ═════════ 4. Status sets from the original project ═════════
-- Orders (11)
alter table orders drop constraint orders_status_check;
alter table orders add constraint orders_status_check check (status in
  ('new','under_review','approved','processing','shipped','delivered','cancelled',
   'returned','refunded','delivery_failed','awaiting_payment'));
alter table orders alter column status set default 'new';
-- Financing applications (7). Company/admin review is tracked by review_stage + company_approved.
alter table financing_applications drop constraint financing_applications_status_check;
alter table financing_applications add constraint financing_applications_status_check check (status in
  ('new','under_review','awaiting_documents','awaiting_identity','approved','rejected','completed'));
alter table financing_applications alter column status set default 'new';
-- Installments (5), contracts (5)
alter table installments drop constraint installments_status_check;
alter table installments add constraint installments_status_check check (status in
  ('upcoming','due','paid','late','overdue'));
alter table installments alter column status set default 'upcoming';
alter table contracts drop constraint contracts_status_check;
alter table contracts add constraint contracts_status_check check (status in
  ('pending','active','completed','defaulted','cancelled'));

-- ═════════ 5. Columns from the original schema ═════════
alter table user_profiles add column if not exists email text;
alter table user_profiles add column if not exists avatar_url text;
alter table user_profiles add column if not exists status text not null default 'pending'
  check (status in ('pending','active','suspended'));
alter table companies add column if not exists contact_name text;
alter table companies add column if not exists phone text;
alter table companies add column if not exists employee_count int;
alter table companies add column if not exists city text;
alter table employees add column if not exists full_name text;
alter table employees add column if not exists hire_date date;
alter table employees add column if not exists status text not null default 'active'
  check (status in ('active','on_leave','suspended','terminated'));
alter table categories add column if not exists parent_id uuid references categories(id);
alter table categories add column if not exists icon text;
alter table categories add column if not exists image_url text;
alter table categories add column if not exists sort_order int not null default 0;
alter table categories add column if not exists is_active boolean not null default true;
alter table products add column if not exists merchant_id uuid references merchants(id);
alter table products add column if not exists barcode text;
alter table products add column if not exists installment_available boolean not null default true;
alter table products add column if not exists is_new boolean not null default false;
alter table products add column if not exists is_bestseller boolean not null default false;
alter table products add column if not exists rating numeric(3,2) not null default 0;
alter table products add column if not exists visible boolean not null default true;
alter table products add column if not exists city text;
alter table product_variants add column if not exists price_adjustment numeric(14,2) not null default 0;
alter table stores add column if not exists slug text unique;
alter table stores add column if not exists logo text;
alter table stores add column if not exists banner text;
alter table stores add column if not exists status text not null default 'active';
alter table carts add column if not exists updated_at timestamptz not null default now();
alter table cart_items add column if not exists payment_type text not null default 'cash'
  check (payment_type in ('cash','installment'));
alter table cart_items add column if not exists variant_id uuid references product_variants(id);
alter table orders add column if not exists merchant_id uuid references merchants(id);
alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists tracking_number text;
alter table payments add column if not exists payment_number text unique;
alter table payments add column if not exists order_id uuid references orders(id);
alter table payments add column if not exists contract_id uuid references contracts(id);
alter table payments add column if not exists status text not null default 'succeeded'
  check (status in ('succeeded','failed','processing'));
alter table payments add column if not exists provider text;
alter table otp_verifications add column if not exists user_id uuid references auth.users(id);
alter table otp_verifications add column if not exists purpose text not null default 'signup';
alter table otp_verifications add column if not exists max_attempts int not null default 5;
alter table otp_verifications add column if not exists max_resends int not null default 3;
alter table otp_verifications add column if not exists verified_at timestamptz;
alter table audit_logs add column if not exists actor_name text;
alter table audit_logs add column if not exists actor_role text;
alter table audit_logs add column if not exists old_value jsonb;
alter table audit_logs add column if not exists new_value jsonb;
alter table audit_logs add column if not exists source text;
alter table audit_logs add column if not exists ip_address inet;
alter table notifications add column if not exists type text;
alter table notifications add column if not exists link text;

-- Sensitive columns must not be self-editable. The existing own_profile_upd policy allows UPDATE
-- on the user's own row, so a guard trigger pins these columns.
create or replace function guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or is_admin() then return new; end if;
  new.phone_verified := old.phone_verified;          -- set only by the OTP Edge Function
  if not has_permission('identity.review') then
    new.identity_status := old.identity_status;
    new.status := old.status;
  end if;
  return new;
end $$;
create trigger trg_guard_profile before update on user_profiles
  for each row execute function guard_profile();

-- Products: only the platform curates featured/rating/bestseller.
create or replace function guard_product() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.featured := false; new.is_bestseller := false; new.rating := 0;
  else
    new.featured := old.featured; new.is_bestseller := old.is_bestseller; new.rating := old.rating;
  end if;
  return new;
end $$;
create trigger trg_guard_product before insert or update on products
  for each row execute function guard_product();

-- Orders are created ONLY through the checkout RPC (Phase 3). A client-side insert could set any
-- status/total, so the direct INSERT policy from 0001 is removed.
drop policy own_orders_ins on orders;

-- ═════════ 6. Missing tables ═════════
create table regions (id serial primary key, name_ar text unique not null);
insert into regions(name_ar) values
  ('أمانة العاصمة'),('صنعاء'),('عدن'),('تعز'),('الحديدة'),('إب'),('ذمار'),('حضرموت'),('شبوة'),
  ('أبين'),('لحج'),('الضالع'),('البيضاء'),('مأرب'),('الجوف'),('صعدة'),('عمران'),('حجة'),
  ('المحويت'),('ريمة'),('المهرة'),('سقطرى');

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null, city text, governorate text, phone text, active boolean not null default true);
create table financing_officers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id), name text not null, phone text,
  branch_id uuid references branches(id), active boolean not null default true);
alter table financing_applications add column if not exists branch_id uuid references branches(id);
alter table financing_applications add column if not exists financing_officer_id uuid references financing_officers(id);

create table shipping_providers (id serial primary key, name text not null, phone text, active boolean not null default true);
create table shipping (   -- shipping fee per region/provider
  id serial primary key,
  region_id int references regions(id), provider_id int references shipping_providers(id),
  fee numeric(14,2) not null check (fee >= 0), unique (region_id, provider_id));
create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider_id int references shipping_providers(id), tracking_number text,
  status text not null default 'new' check (status in
    ('new','preparing','picked_up','on_the_way','delivered','delivery_failed')),
  updated_at timestamptz not null default now());

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, percent numeric(5,2) check (percent between 0 and 100),
  amount numeric(14,2), min_order numeric(14,2) default 0,
  starts_at timestamptz, ends_at timestamptz, max_uses int, used int not null default 0,
  active boolean not null default true);
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5), comment text,
  created_at timestamptz not null default now(), unique (product_id, user_id));
create table returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id), user_id uuid not null references auth.users(id),
  reason text not null, status text not null default 'requested'
    check (status in ('requested','approved','rejected','received','refunded')),
  created_at timestamptz not null default now());
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id), subject text not null, body text,
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  created_at timestamptz not null default now());
create table banners (
  id uuid primary key default gen_random_uuid(),
  title text, image_url text not null, link text, sort_order int not null default 0,
  active boolean not null default true);
create table favorites (
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references products(id) on delete cascade, primary key (user_id, product_id));
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text, governorate text, city text, address text, is_default boolean not null default false);

create table suppliers (id uuid primary key default gen_random_uuid(), name text not null, phone text, city text);
create table warehouses (id uuid primary key default gen_random_uuid(), name text not null, city text,
  merchant_id uuid references merchants(id));
create table inventory (
  warehouse_id uuid references warehouses(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0), primary key (warehouse_id, product_id));
create table purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id), warehouse_id uuid references warehouses(id),
  total numeric(14,2) not null, status text not null default 'ordered'
    check (status in ('ordered','received','cancelled')), created_at timestamptz not null default now());
create table chart_of_accounts (
  code text primary key, name_ar text not null,
  type text not null check (type in ('asset','liability','equity','revenue','expense')),
  parent_code text references chart_of_accounts(code));
create table journal_entries (
  id uuid primary key default gen_random_uuid(), entry_date date not null default current_date,
  description text, reference text, created_by uuid references auth.users(id));
create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references journal_entries(id) on delete cascade,
  account_code text not null references chart_of_accounts(code),
  debit numeric(16,2) not null default 0 check (debit >= 0),
  credit numeric(16,2) not null default 0 check (credit >= 0),
  check ((debit = 0) <> (credit = 0)));

create sequence invoice_seq;
create table invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null default ('INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('invoice_seq')::text, 6, '0')),
  order_id uuid not null references orders(id), merchant_id uuid references merchants(id),
  items_json jsonb not null, subtotal numeric(14,2) not null, discount numeric(14,2) not null default 0,
  shipping numeric(14,2) not null default 0, total numeric(14,2) not null,
  qr_code text, issued_at timestamptz not null default now(), unique (order_id, merchant_id));

-- Issue the invoice(s) for an order (one per merchant). Admin or order-handling staff only.
create or replace function issue_invoice(p_order uuid) returns int
language plpgsql security definer set search_path = public as $$
declare o orders; r record; n int := 0;
begin
  if not (is_admin() or has_permission('orders.update')) then raise exception 'not allowed'; end if;
  select * into o from orders where id = p_order;
  if not found then raise exception 'order not found'; end if;
  for r in
    select oi.merchant_id,
           jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'qty', oi.quantity, 'unit_price', oi.unit_price)) items,
           sum(oi.quantity * oi.unit_price) sub
    from order_items oi where oi.order_id = p_order group by oi.merchant_id
  loop
    insert into invoices(order_id, merchant_id, items_json, subtotal, discount, shipping, total)
    values (p_order, r.merchant_id, r.items, r.sub,
            case when o.subtotal > 0 then round(o.discount * r.sub / o.subtotal) else 0 end,
            0, r.sub)   -- shipping/discount allocation per merchant to be finalized in Phase 3
    on conflict (order_id, merchant_id) do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ═════════ 7. RLS for the new tables ═════════
do $$ declare t text; begin
  for t in select unnest(array[
    'platform_settings','customer_pricing','settlements','commissions','guarantee_types','regions',
    'branches','financing_officers','shipping_providers','shipping','shipments','coupons','reviews',
    'returns','support_tickets','banners','favorites','addresses','suppliers','warehouses','inventory',
    'purchases','chart_of_accounts','journal_entries','journal_lines','invoices'])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy admin_all on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Public reads
create policy public_read on guarantee_types for select using (active);
create policy public_read on regions for select using (true);
create policy public_read on shipping_providers for select using (active);
create policy public_read on shipping for select using (true);
create policy public_read on banners for select using (active);
create policy public_read on reviews for select using (true);
create policy public_read on coupons for select using (active and (ends_at is null or ends_at > now()));
create policy public_default_markup on platform_settings for select using (key = 'default_markup_percent');

-- Owner-only writes happen through admin_all. Users read their own override, never write it.
create policy own_pricing on customer_pricing for select using (user_id = auth.uid());
create policy staff_pricing on customer_pricing for select using (has_permission('financing.view'));

-- Own data
create policy own_favorites on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_addresses on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_reviews_ins on reviews for insert with check (user_id = auth.uid());
create policy own_reviews_upd on reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_returns on returns for select using (user_id = auth.uid());
create policy own_returns_ins on returns for insert with check (user_id = auth.uid());
create policy own_tickets on support_tickets for select using (user_id = auth.uid());
create policy own_tickets_ins on support_tickets for insert with check (user_id = auth.uid());
create policy staff_tickets on support_tickets for all
  using (has_permission('support.manage')) with check (has_permission('support.manage'));
create policy own_shipments on shipments for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy staff_shipments on shipments for all
  using (has_permission('orders.update')) with check (has_permission('orders.update'));
create policy own_invoices on invoices for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy staff_invoices on invoices for select using (has_permission('orders.view'));

-- Merchants: their own money records, read-only (settlement creation is the owner's or settlements.manage)
create policy merchant_commissions on commissions for select
  using (exists (select 1 from merchants m where m.id = merchant_id and m.owner_id = auth.uid()));
create policy merchant_settlements on settlements for select
  using (exists (select 1 from merchants m where m.id = merchant_id and m.owner_id = auth.uid()));
create policy merchant_invoices on invoices for select
  using (exists (select 1 from merchants m where m.id = merchant_id and m.owner_id = auth.uid()));
create policy staff_commissions on commissions for select using (has_permission('settlements.view'));
create policy staff_settlements on settlements for select using (has_permission('settlements.view'));
create policy staff_settlements_upd on settlements for update
  using (has_permission('settlements.manage')) with check (has_permission('settlements.manage'));
create policy merchant_warehouses on warehouses for all
  using (exists (select 1 from merchants m where m.id = merchant_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from merchants m where m.id = merchant_id and m.owner_id = auth.uid()));
create policy merchant_inventory on inventory for all
  using (exists (select 1 from warehouses w join merchants m on m.id = w.merchant_id
                 where w.id = warehouse_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from warehouses w join merchants m on m.id = w.merchant_id
                      where w.id = warehouse_id and m.owner_id = auth.uid()));
-- Accounting, purchases, suppliers, branches, officers, journals: owner only (admin_all).
-- Reports staff may read accounting later via a dedicated 'reports.view' policy.

-- ═══════════ 0005_guarantees_branches.sql ═══════════
-- 0005: guarantee types per audience (bank account / gold / commercial / company), customer applications,
-- and Al-Kuraimi branch selection. Apply after 0004_reconcile.sql.

-- ═════════ 1. Guarantee types: audience + dynamic detail fields ═════════
alter table guarantee_types
  add column audience text not null default 'both' check (audience in ('customer','employee','both')),
  add column fields jsonb not null default '[]'::jsonb;   -- [{key,label,type:text|number,required}]

-- Owner-defined list replaces the earlier starter list. Old rows are kept but deactivated (re-enable from /admin).
update guarantee_types set active = false where code in ('personal_guarantor','guarantee_cheque','promissory_note');

update guarantee_types set audience = 'employee', sort_order = 1 where code = 'salary_deduction';
update guarantee_types set audience = 'employee', sort_order = 2 where code = 'company_undertaking';

insert into guarantee_types(code, name_ar, description_ar, requires_guarantor, audience, sort_order, fields) values
 ('bank_account', 'حساب بنكي', 'ضمان بحساب بنكي باسمك', false, 'both', 3,
  '[{"key":"bank_name","label":"اسم البنك","type":"text","required":true},
    {"key":"account_number","label":"رقم الحساب","type":"text","required":true},
    {"key":"account_holder","label":"اسم صاحب الحساب","type":"text","required":true}]'),
 ('gold', 'ذهب', 'ضمان بذهب يُقيَّم ويُوثَّق عند الاستلام', false, 'both', 4,
  '[{"key":"weight_grams","label":"الوزن (جرام)","type":"number","required":true},
    {"key":"karat","label":"العيار","type":"text","required":true},
    {"key":"estimated_value","label":"القيمة التقديرية (ريال)","type":"number","required":true},
    {"key":"description","label":"وصف القطع","type":"text","required":false}]'),
 ('commercial_guarantee', 'ضمانة تجارية', 'ضمان بنشاط أو أصل تجاري', false, 'both', 5,
  '[{"key":"business_name","label":"اسم المنشأة","type":"text","required":true},
    {"key":"commercial_register_no","label":"رقم السجل التجاري","type":"text","required":true},
    {"key":"description","label":"وصف الضمانة","type":"text","required":false}]');

-- Returns an error message, or NULL when the details satisfy the type's required fields.
create or replace function validate_guarantee_details(type_id int, details jsonb) returns text
language plpgsql stable as $$
declare f jsonb; v text;
begin
  for f in select * from jsonb_array_elements((select fields from guarantee_types where id = type_id)) loop
    if (f->>'required')::boolean then
      v := trim(coalesce(details->>(f->>'key'), ''));
      if v = '' then return 'missing field: ' || (f->>'key'); end if;
      if f->>'type' = 'number' and (v !~ '^[0-9]+(\.[0-9]+)?$' or v::numeric <= 0) then
        return 'invalid number: ' || (f->>'key');
      end if;
    end if;
  end loop;
  return null;
end $$;

-- ═════════ 2. Customers (non-employees) can apply too ═════════
alter table financing_applications add column applicant_user_id uuid references auth.users(id);
update financing_applications a set applicant_user_id = e.user_id from employees e where e.id = a.employee_id;
alter table financing_applications alter column employee_id drop not null;
alter table financing_applications add constraint applicant_present check (employee_id is not null or applicant_user_id is not null);
create policy applicant_apps on financing_applications for select using (applicant_user_id = auth.uid());

-- Sensitive details (account numbers, gold) live in their own table: the employer's company can NOT read them.
create table financing_guarantee_details (
  application_id uuid primary key references financing_applications(id) on delete cascade,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table financing_guarantee_details enable row level security;
create policy admin_all on financing_guarantee_details for all using (is_admin()) with check (is_admin());
create policy applicant_details on financing_guarantee_details for select using (exists (
  select 1 from financing_applications a where a.id = application_id and a.applicant_user_id = auth.uid()));
create policy staff_details on financing_guarantee_details for select using (has_permission('financing.view'));
-- Written by the application-creation RPC (Phase 9), never directly by clients.

create or replace function trg_check_guarantee_details() returns trigger
language plpgsql as $$
declare err text; a financing_applications;
begin
  if tg_table_name = 'financing_applications' then
    select * into a from financing_applications where id = new.id;
    select validate_guarantee_details(a.guarantee_type_id, coalesce((select details from financing_guarantee_details where application_id = a.id), '{}'::jsonb)) into err;
  else
    select * into a from financing_applications where id = new.application_id;
    select validate_guarantee_details(a.guarantee_type_id, new.details) into err;
  end if;
  if err is not null then raise exception 'guarantee details invalid (%)', err; end if;
  return null;
end $$;
-- Checked at COMMIT so the application row and its details can be inserted in one transaction.
create constraint trigger trg_guarantee_details_app after insert on financing_applications
  deferrable initially deferred for each row execute function trg_check_guarantee_details();
create constraint trigger trg_guarantee_details_row after insert or update on financing_guarantee_details
  deferrable initially deferred for each row execute function trg_check_guarantee_details();

-- ═════════ 3. Al-Kuraimi branches ═════════
alter table branches
  add column bank text not null default 'الكريمي',
  add column code text,
  add column address text,
  add column latitude numeric(9,6) check (latitude between -90 and 90),
  add column longitude numeric(9,6) check (longitude between -180 and 180),
  add column working_hours text;
create unique index branches_unique on branches (bank, name, (coalesce(city, '')));
create policy public_read_branches on branches for select using (active);

-- Nearest active branches by great-circle distance (km). No PostGIS needed.
create or replace function nearest_branches(lat double precision, lng double precision, lim int default 5)
returns table(id uuid, name text, city text, governorate text, address text, phone text, working_hours text, distance_km double precision)
language sql stable as $$
  select * from (
    select b.id, b.name, b.city, b.governorate, b.address, b.phone, b.working_hours,
           6371 * 2 * asin(sqrt(power(sin(radians(b.latitude::float8 - lat) / 2), 2)
             + cos(radians(lat)) * cos(radians(b.latitude::float8)) * power(sin(radians(b.longitude::float8 - lng) / 2), 2))) as distance_km
    from branches b where b.active and b.latitude is not null and b.longitude is not null) x
  order by distance_km limit least(greatest(lim, 1), 50)
$$;

-- ═════════ 4. Server-side truth for new applications ═════════
create or replace function financing_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid; m numeric; g guarantee_types; is_emp boolean := new.employee_id is not null;
begin
  if is_emp then
    select user_id into uid from employees where id = new.employee_id;
    new.applicant_user_id := uid;
  else
    uid := new.applicant_user_id;
  end if;
  if uid is null then raise exception 'applicant is required'; end if;

  if new.guarantee_type_id is null then raise exception 'guarantee type is required'; end if;
  select * into g from guarantee_types where id = new.guarantee_type_id and active;
  if not found then raise exception 'invalid guarantee type'; end if;
  if (is_emp and g.audience = 'customer') or (not is_emp and g.audience = 'employee') then
    raise exception 'this guarantee type is not available for this applicant';
  end if;
  if g.requires_guarantor and (coalesce(trim(new.guarantor_name), '') = ''
                               or coalesce(trim(new.guarantor_phone), '') = '') then
    raise exception 'guarantor details are required for this guarantee type';
  end if;

  if new.branch_id is null then raise exception 'branch is required'; end if;
  if not exists (select 1 from branches where id = new.branch_id and active) then raise exception 'invalid branch'; end if;

  if not is_emp then            -- a customer has no employer: skip the company step
    new.review_stage := 'admin';
    new.status := 'awaiting_identity';
  end if;

  m := _markup_for(uid);
  new.markup_percent_applied := m;
  new.deferred_price := round(new.cash_price * (1 + m / 100));
  new.monthly_installment := round(new.deferred_price / new.months);
  return new;
end $$;

-- ═══════════ 0006_images_delivery.sql ═══════════
-- 0006: merchants upload product images as FILES (no external links), and a delivery-provider layer.
-- Apply after 0005. On Supabase the `storage` schema already exists.

-- ═════════ 1. Product images: uploaded files only (for merchants) ═════════
alter table product_images add column storage_path text;
alter table product_images alter column url drop not null;
alter table product_images add constraint image_source check (url is not null or storage_path is not null);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: <merchant_id>/<product_id>/<random>.<ext>. A merchant can only touch their own folder,
-- and only while their account is active. Everyone can read (the shop is public).
create policy "product images public read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "merchant uploads to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and exists (
    select 1 from merchants m where m.owner_id = auth.uid() and m.status = 'active'
      and m.id::text = (storage.foldername(name))[1]));
create policy "merchant updates own files" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and exists (
    select 1 from merchants m where m.owner_id = auth.uid() and m.id::text = (storage.foldername(name))[1]));
create policy "merchant deletes own files" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (exists (
    select 1 from merchants m where m.owner_id = auth.uid() and m.id::text = (storage.foldername(name))[1])
    or is_admin()));

-- Merchants manage images of their own products; a merchant row must reference an uploaded file, never a URL.
create policy merchant_images on product_images for all
  using (exists (select 1 from products p join stores s on s.id = p.store_id join merchants m on m.id = s.merchant_id
                 where p.id = product_id and m.owner_id = auth.uid()))
  with check (url is null and storage_path is not null and exists (
    select 1 from products p join stores s on s.id = p.store_id join merchants m on m.id = s.merchant_id
    where p.id = product_id and m.owner_id = auth.uid() and storage_path like m.id::text || '/%'));

create or replace function limit_product_images() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from product_images where product_id = new.product_id) >= 8 then
    raise exception 'a product can have at most 8 images';
  end if;
  return new;
end $$;
create trigger trg_limit_product_images before insert on product_images
  for each row execute function limit_product_images();

-- ═════════ 2. Delivery providers: adapter-ready, honest about API status ═════════
alter table shipping_providers
  add column code text unique,
  add column coverage text[] not null default '{}',
  add column api_enabled boolean not null default false,   -- true only after a signed integration works
  add column notes text;
insert into shipping_providers(code, name, notes)
values ('manual', 'توصيل يدوي (تتبع برقم الشحنة)', 'التاجر أو الموظف يسجّل رقم الشحنة ويحدّث حالتها يدوياً');

alter table shipments
  add column cod_amount numeric(14,2) not null default 0 check (cod_amount >= 0),   -- cash to collect on delivery
  add column external_id text;                                                       -- provider's own shipment id

-- A merchant creates/updates shipments for orders that contain their own items.
create policy merchant_shipments on shipments for all
  using (exists (select 1 from order_items oi join merchants m on m.id = oi.merchant_id
                 where oi.order_id = shipments.order_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from order_items oi join merchants m on m.id = oi.merchant_id
                      where oi.order_id = shipments.order_id and m.owner_id = auth.uid()));

-- ═══════════ 0007_identity_review.sql ═══════════
-- 0007: mandatory identity verification with human review.
-- Every account: OTP -> upload ID -> a reviewer with `identity.review` approves (account becomes active),
-- rejects (with a reason) or asks for changes (with a reason). Apply after 0006.

-- ═════════ 1. States ═════════
alter table user_profiles drop constraint user_profiles_identity_status_check;
alter table user_profiles add constraint user_profiles_identity_status_check
  check (identity_status in ('none','pending','verified','rejected','needs_changes'));

create table identity_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('national_id','passport')),
  files jsonb not null,                                   -- {kind: storage path in private bucket identity-docs}
  consent_at timestamptz not null,
  consent_version text not null default 'v1',
  status text not null default 'submitted' check (status in ('submitted','approved','rejected','needs_changes')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  check (status in ('submitted','approved') or length(trim(coalesce(decision_reason, ''))) >= 3)
);
create unique index one_open_identity on identity_submissions(user_id) where status = 'submitted';
alter table identity_submissions enable row level security;
create policy admin_all on identity_submissions for all using (is_admin()) with check (is_admin());
create policy own_identity on identity_submissions for select using (user_id = auth.uid());
create policy reviewer_identity on identity_submissions for select using (has_permission('identity.review'));
-- No client INSERT/UPDATE/DELETE policies: everything goes through the functions below.

-- ═════════ 2. Profiles: users and staff can no longer write status columns directly ═════════
revoke update on user_profiles from authenticated, anon;
grant update (full_name, governorate, city, address, email, avatar_url) on user_profiles to authenticated;
drop policy staff_identity_upd on user_profiles;
-- The old guard trigger pinned these columns for everyone except reviewers; column privileges now enforce it
-- for direct writes, and it would also block the SECURITY DEFINER functions below, so it is removed.
drop trigger trg_guard_profile on user_profiles;
drop function guard_profile();

-- ═════════ 3. Private bucket for ID documents ═════════
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('identity-docs', 'identity-docs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Owner uploads only into <own uid>/..., only while an upload is allowed. No update/delete: files can't be swapped after submit.
create policy "identity upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = auth.uid()::text and exists (
    select 1 from user_profiles p where p.id = auth.uid() and p.phone_verified
      and p.identity_status in ('none','rejected','needs_changes')));
create policy "identity read own" on storage.objects for select to authenticated
  using (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = auth.uid()::text);
-- Reviewers get NO storage SELECT policy. They obtain short-lived signed URLs through the Edge Function
-- `identity-file-url`, which first calls request_identity_file_access() so every access is audited.

-- ═════════ 4. Functions ═════════
create or replace function _identity_files_error(doc text, files jsonb, uid uuid) returns text
language plpgsql immutable as $$
declare k text; req text[];
begin
  req := case doc when 'national_id' then array['front','back','card_with_face','selfie']
                  when 'passport'    then array['passport_photo','selfie_with_passport'] end;
  if req is null then return 'invalid document type'; end if;
  if jsonb_typeof(files) <> 'object' then return 'files must be an object'; end if;
  foreach k in array req loop
    if coalesce(files->>k, '') = '' then return 'missing file: ' || k; end if;
    if files->>k not like uid::text || '/%' then return 'invalid file path: ' || k; end if;
  end loop;
  if exists (select 1 from jsonb_object_keys(files) key where key <> all(req)) then return 'unexpected file'; end if;
  return null;
end $$;

create or replace function submit_identity(doc text, files jsonb, consent boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p user_profiles; err text; sid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into p from user_profiles where id = uid;
  if not found then raise exception 'profile not found'; end if;
  if not p.phone_verified then raise exception 'phone number must be verified first (OTP)'; end if;
  if p.identity_status in ('pending','verified') then raise exception 'identity already submitted or verified'; end if;
  if not coalesce(consent, false) then raise exception 'consent to identity data processing is required'; end if;
  if (select count(*) from identity_submissions where user_id = uid) >= 5 then
    raise exception 'too many submissions, contact support';
  end if;
  err := _identity_files_error(doc, files, uid);
  if err is not null then raise exception '%', err; end if;

  insert into identity_submissions(user_id, document_type, files, consent_at)
    values (uid, doc, files, now()) returning id into sid;
  update user_profiles set identity_status = 'pending', identity_consent_at = now() where id = uid;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'identity_submitted', 'identity_submission', sid::text, jsonb_build_object('document_type', doc));
  return sid;
end $$;

-- decision: approved | rejected | needs_changes. Returns the user's new identity_status.
create or replace function review_identity(sid uuid, decision text, reason text) returns text
language plpgsql security definer set search_path = public as $$
declare s identity_submissions; new_status text; clean text := nullif(trim(coalesce(reason, '')), '');
begin
  if not has_permission('identity.review') then raise exception 'not allowed'; end if;
  if decision not in ('approved','rejected','needs_changes') then raise exception 'invalid decision'; end if;
  select * into s from identity_submissions where id = sid for update;
  if not found then raise exception 'submission not found'; end if;
  if s.status <> 'submitted' then raise exception 'submission already reviewed'; end if;
  if s.user_id = auth.uid() then raise exception 'you cannot review your own identity'; end if;
  if decision <> 'approved' and (clean is null or length(clean) < 3) then raise exception 'a reason is required'; end if;
  if decision = 'approved' and not (select phone_verified from user_profiles where id = s.user_id) then
    raise exception 'phone number is not verified';
  end if;

  update identity_submissions set status = decision, reviewer_id = auth.uid(), reviewed_at = now(),
         decision_reason = clean where id = sid;
  new_status := case decision when 'approved' then 'verified' when 'rejected' then 'rejected' else 'needs_changes' end;
  update user_profiles set identity_status = new_status,
         status = case when decision = 'approved' and status = 'pending' then 'active' else status end
   where id = s.user_id;

  insert into notifications(user_id, title, body, type, link) values (s.user_id,
    case decision when 'approved' then 'تم تفعيل حسابك'
                  when 'rejected' then 'تم رفض التحقق من الهوية'
                  else 'مطلوب تعديل بيانات الهوية' end,
    case decision when 'approved' then 'تم التحقق من هويتك وتفعيل حسابك، يمكنك الآن الشراء.'
                  else clean end,
    'identity', '/profile');
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'identity_' || decision, 'identity_submission', sid::text,
            jsonb_build_object('user_id', s.user_id, 'reason', clean));
  return new_status;
end $$;

-- Called by the Edge Function before it signs URLs. Logs the access, returns the file paths.
create or replace function request_identity_file_access(sid uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s identity_submissions;
begin
  if not has_permission('identity.review') then raise exception 'not allowed'; end if;
  select * into s from identity_submissions where id = sid;
  if not found then raise exception 'submission not found'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'identity_file_access', 'identity_submission', sid::text, jsonb_build_object('user_id', s.user_id));
  return s.files;
end $$;

revoke execute on function submit_identity(text,jsonb,boolean), review_identity(uuid,text,text),
  request_identity_file_access(uuid), _identity_files_error(text,jsonb,uuid) from public, anon;
grant execute on function submit_identity(text,jsonb,boolean), review_identity(uuid,text,text),
  request_identity_file_access(uuid) to authenticated;

-- ═════════ 5. No buying or financing before the account is active and verified ═════════
create or replace function require_active_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid; p user_profiles;
begin
  if auth.uid() is null then return new; end if;            -- back office / service role
  if tg_table_name = 'orders' then uid := new.user_id; else uid := new.applicant_user_id; end if;
  if uid is null then return new; end if;
  select * into p from user_profiles where id = uid;
  if not found or p.status <> 'active' or p.identity_status <> 'verified' then
    raise exception 'account is not active: identity verification must be approved first';
  end if;
  return new;
end $$;
create trigger trg_require_active_account before insert on orders
  for each row execute function require_active_account();
create trigger trg_require_active_account before insert on financing_applications
  for each row execute function require_active_account();

-- ═══════════ 0008_identity_camera_flow.sql ═══════════
-- 0008: identity capture flow: national ID = 3 photos (front, back, selfie holding the ID),
-- passport = 2 photos (data page, selfie holding the passport). Photos are taken with the live camera.
-- Apply after 0007.

alter table identity_submissions add column capture_meta jsonb not null default '{}'::jsonb
  check (pg_column_size(capture_meta) < 4000);
-- capture_meta is reported BY THE CLIENT (method, timestamps). It helps the reviewer; it is not proof of camera origin.

create or replace function _identity_files_error(doc text, files jsonb, uid uuid) returns text
language plpgsql immutable as $$
declare k text; req text[];
begin
  req := case doc when 'national_id' then array['front','back','selfie_with_id']
                  when 'passport'    then array['passport_photo','selfie_with_passport'] end;
  if req is null then return 'invalid document type'; end if;
  if jsonb_typeof(files) <> 'object' then return 'files must be an object'; end if;
  foreach k in array req loop
    if coalesce(files->>k, '') = '' then return 'missing file: ' || k; end if;
    if files->>k not like uid::text || '/%' then return 'invalid file path: ' || k; end if;
  end loop;
  if exists (select 1 from jsonb_object_keys(files) key where key <> all(req)) then return 'unexpected file'; end if;
  return null;
end $$;

drop function submit_identity(text, jsonb, boolean);
create or replace function submit_identity(doc text, files jsonb, consent boolean, meta jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p user_profiles; err text; sid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into p from user_profiles where id = uid;
  if not found then raise exception 'profile not found'; end if;
  if not p.phone_verified then raise exception 'phone number must be verified first (OTP)'; end if;
  if p.identity_status in ('pending','verified') then raise exception 'identity already submitted or verified'; end if;
  if not coalesce(consent, false) then raise exception 'consent to identity data processing is required'; end if;
  if (select count(*) from identity_submissions where user_id = uid) >= 5 then
    raise exception 'too many submissions, contact support';
  end if;
  err := _identity_files_error(doc, files, uid);
  if err is not null then raise exception '%', err; end if;
  if jsonb_typeof(coalesce(meta, '{}'::jsonb)) <> 'object' or pg_column_size(coalesce(meta, '{}'::jsonb)) >= 4000 then
    raise exception 'invalid capture metadata';
  end if;

  insert into identity_submissions(user_id, document_type, files, consent_at, capture_meta)
    values (uid, doc, files, now(), coalesce(meta, '{}'::jsonb)) returning id into sid;
  update user_profiles set identity_status = 'pending', identity_consent_at = now() where id = uid;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'identity_submitted', 'identity_submission', sid::text, jsonb_build_object('document_type', doc));
  return sid;
end $$;
revoke execute on function submit_identity(text, jsonb, boolean, jsonb) from public, anon;
grant execute on function submit_identity(text, jsonb, boolean, jsonb) to authenticated;

-- ═══════════ 0009_branch_regions.sql ═══════════
-- 0009: Al-Kuraimi groups branches by its own "منطقة" (region), which is NOT the governorate
-- (e.g. منطقة عدن also holds Lahj/Abyan/Dhale branches, منطقة صنعاء holds Dhamar/Al-Bayda/Amran/Al-Jawf).
-- Apply after 0008.
alter table branches add column region text;
drop index branches_unique;
create unique index branches_unique on branches (bank, (coalesce(region, '')), name);

drop function nearest_branches(double precision, double precision, int);
create function nearest_branches(lat double precision, lng double precision, lim int default 5)
returns table(id uuid, name text, region text, city text, governorate text, address text, phone text,
              working_hours text, distance_km double precision)
language sql stable as $$
  select * from (
    select b.id, b.name, b.region, b.city, b.governorate, b.address, b.phone, b.working_hours,
           6371 * 2 * asin(sqrt(power(sin(radians(b.latitude::float8 - lat) / 2), 2)
             + cos(radians(lat)) * cos(radians(b.latitude::float8)) * power(sin(radians(b.longitude::float8 - lng) / 2), 2))) as distance_km
    from branches b where b.active and b.latitude is not null and b.longitude is not null) x
  order by distance_km limit least(greatest(lim, 1), 50)
$$;

-- ═══════════ 0010_no_otp.sql ═══════════
-- 0010: WhatsApp OTP is not available. Identity review is the only gate before an account becomes active.
-- Removes the phone_verified requirement from: uploading ID photos, submitting, and approving.
-- phone_verified stays as a column (always false) so nothing else breaks. Apply after 0009.

-- Upload policy: own folder only, only while an upload is allowed.
drop policy if exists "identity upload own folder" on storage.objects;
create policy "identity upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = auth.uid()::text and exists (
    select 1 from user_profiles p where p.id = auth.uid() and p.identity_status in ('none','rejected','needs_changes')));

create or replace function submit_identity(doc text, files jsonb, consent boolean, meta jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p user_profiles; err text; sid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into p from user_profiles where id = uid;
  if not found then raise exception 'profile not found'; end if;
  if p.identity_status in ('pending','verified') then raise exception 'identity already submitted or verified'; end if;
  if not coalesce(consent, false) then raise exception 'consent to identity data processing is required'; end if;
  if (select count(*) from identity_submissions where user_id = uid) >= 5 then
    raise exception 'too many submissions, contact support';
  end if;
  err := _identity_files_error(doc, files, uid);
  if err is not null then raise exception '%', err; end if;
  if jsonb_typeof(coalesce(meta, '{}'::jsonb)) <> 'object' or pg_column_size(coalesce(meta, '{}'::jsonb)) >= 4000 then
    raise exception 'invalid capture metadata';
  end if;

  insert into identity_submissions(user_id, document_type, files, consent_at, capture_meta)
    values (uid, doc, files, now(), coalesce(meta, '{}'::jsonb)) returning id into sid;
  update user_profiles set identity_status = 'pending', identity_consent_at = now() where id = uid;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'identity_submitted', 'identity_submission', sid::text, jsonb_build_object('document_type', doc));
  return sid;
end $$;

create or replace function review_identity(sid uuid, decision text, reason text) returns text
language plpgsql security definer set search_path = public as $$
declare s identity_submissions; new_status text; clean text := nullif(trim(coalesce(reason, '')), '');
begin
  if not has_permission('identity.review') then raise exception 'not allowed'; end if;
  if decision not in ('approved','rejected','needs_changes') then raise exception 'invalid decision'; end if;
  select * into s from identity_submissions where id = sid for update;
  if not found then raise exception 'submission not found'; end if;
  if s.status <> 'submitted' then raise exception 'submission already reviewed'; end if;
  if s.user_id = auth.uid() then raise exception 'you cannot review your own identity'; end if;
  if decision <> 'approved' and (clean is null or length(clean) < 3) then raise exception 'a reason is required'; end if;

  update identity_submissions set status = decision, reviewer_id = auth.uid(), reviewed_at = now(),
         decision_reason = clean where id = sid;
  new_status := case decision when 'approved' then 'verified' when 'rejected' then 'rejected' else 'needs_changes' end;
  update user_profiles set identity_status = new_status,
         status = case when decision = 'approved' and status = 'pending' then 'active' else status end
   where id = s.user_id;

  insert into notifications(user_id, title, body, type, link) values (s.user_id,
    case decision when 'approved' then 'تم تفعيل حسابك'
                  when 'rejected' then 'تم رفض التحقق من الهوية'
                  else 'مطلوب تعديل بيانات الهوية' end,
    case decision when 'approved' then 'تم التحقق من هويتك وتفعيل حسابك، يمكنك الآن الشراء.'
                  else clean end,
    'identity', '/profile');
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'identity_' || decision, 'identity_submission', sid::text,
            jsonb_build_object('user_id', s.user_id, 'reason', clean));
  return new_status;
end $$;

-- ═══════════ 0011_place_order.sql ═══════════
-- 0010: checkout. The ONLY way to create an order (0004 removed the direct INSERT policy).
-- Prices, discounts, stock, merchant, markup and installment amounts are all decided here; the client sends
-- only product ids, quantities, delivery data and (for installments) months, guarantee and branch.
-- Apply after 0009.

create or replace function place_order(
  p_items jsonb,                      -- [{"product_id": "...", "quantity": 2}, ...]
  p_payment text,                     -- 'cash_on_delivery' | 'installment'
  p_recipient text, p_phone text,
  p_governorate text, p_city text, p_address text, p_notes text default null,
  p_months int default null,
  p_guarantee_type_id int default null,
  p_guarantee_details jsonb default '{}'::jsonb,
  p_guarantor_name text default null, p_guarantor_phone text default null, p_guarantor_id_number text default null,
  p_branch_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  oid uuid;
  emp employees;
  v_sub numeric(14,2) := 0;
  v_lines jsonb;
  v_n int;
  r record;
  unit numeric(14,2);
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_payment not in ('cash_on_delivery','installment') then raise exception 'invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'cart must contain 1 to 50 lines';
  end if;
  if length(trim(coalesce(p_recipient,''))) < 2 or length(trim(coalesce(p_phone,''))) < 7
     or length(trim(coalesce(p_governorate,''))) < 2 or length(trim(coalesce(p_city,''))) < 2
     or length(trim(coalesce(p_address,''))) < 3 then
    raise exception 'delivery data is incomplete';
  end if;
  if p_payment = 'installment' and p_months is null then raise exception 'installment months are required'; end if;

  -- Lines: validate shape, merge duplicates, lock product rows in a stable order (no deadlocks).
  select jsonb_agg(jsonb_build_object('p', pid, 'q', qty)) into v_lines from (
    select (x->>'product_id')::uuid as pid, sum((x->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) x group by 1) g;
  select count(*) into v_n from jsonb_to_recordset(v_lines) as l(p uuid, q int);
  if exists (select 1 from jsonb_to_recordset(v_lines) as l(p uuid, q int) where q < 1 or q > 100) then
    raise exception 'invalid quantity';
  end if;
  perform 1 from products where id in (select p from jsonb_to_recordset(v_lines) as l(p uuid, q int))
    order by id for update;

  insert into orders(user_id, payment_method, status, recipient_name, phone, governorate, city, address, notes,
                     subtotal, discount, shipping, total)
    values (uid, p_payment, case p_payment when 'installment' then 'under_review' else 'new' end,
            trim(p_recipient), trim(p_phone), trim(p_governorate), trim(p_city), trim(p_address), p_notes, 0, 0, 0, 0)
    returning id into oid;                       -- trg_require_active_account runs here

  for r in
    select l.p as product_id, l.q as qty, p.name, p.cash_price, p.discount_percent, p.stock, p.active,
           s.merchant_id, m.status as mstatus
      from jsonb_to_recordset(v_lines) as l(p uuid, q int)
      left join products p on p.id = l.p
      left join stores s on s.id = p.store_id
      left join merchants m on m.id = s.merchant_id
     order by l.p
  loop
    if r.name is null or not r.active then raise exception 'product not available: %', r.product_id; end if;
    if r.mstatus is distinct from 'active' then raise exception 'merchant is not active for product: %', r.name; end if;
    if r.stock < r.qty then raise exception 'insufficient stock: %', r.name; end if;
    unit := round(r.cash_price * (1 - r.discount_percent / 100.0));
    update products set stock = stock - r.qty where id = r.product_id;
    insert into order_items(order_id, product_id, merchant_id, quantity, unit_price, installment_months)
      values (oid, r.product_id, r.merchant_id, r.qty, unit,
              case p_payment when 'installment' then p_months end);   -- commission row via trigger
    v_sub := v_sub + unit * r.qty;
  end loop;

  update orders set subtotal = v_sub, total = v_sub where id = oid;
  insert into order_status_history(order_id, status, changed_by, note)
    values (oid, case p_payment when 'installment' then 'under_review' else 'new' end, uid, 'order placed');

  if p_payment = 'installment' then
    select * into emp from employees where user_id = uid;
    -- financing_before_insert (0005) validates guarantee/branch/audience and fixes the price and markup.
    insert into financing_applications(employee_id, applicant_user_id, company_id, order_id, cash_price, months,
        guarantee_type_id, guarantor_name, guarantor_phone, guarantor_id_number, branch_id)
      values (emp.id, uid, emp.company_id, oid, v_sub, p_months,
        p_guarantee_type_id, nullif(trim(p_guarantor_name),''), nullif(trim(p_guarantor_phone),''),
        nullif(trim(p_guarantor_id_number),''), p_branch_id);
    insert into financing_guarantee_details(application_id, details)
      select a.id, coalesce(p_guarantee_details, '{}'::jsonb) from financing_applications a where a.order_id = oid;
  end if;

  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'order_placed', 'order', oid::text,
            jsonb_build_object('payment', p_payment, 'total', v_sub, 'months', p_months));
  return oid;
end $$;

revoke execute on function place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid) from public, anon;
grant execute on function place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid) to authenticated;

-- ═══════════ 0012_seed_branches.sql ═══════════
-- 0012: Al-Kuraimi branches (156) grouped by the bank's own region (منطقة): عدن، تعز، صنعاء.
-- Offices keep the name "فرع مكتب ...". Addresses/phones/coordinates are not provided yet: add them later
-- with supabase/seed/import_branches.sql (psql) or by hand; "nearest branch" only lists rows that have coordinates.
-- Safe to re-run: existing rows are left untouched.
insert into branches(bank, region, name)
select 'الكريمي', v.region, v.name from (values
  ('تعز', 'فرع تعز الرئيسي'),
  ('تعز', 'فرع الحوض'),
  ('تعز', 'فرع وادي القاضي'),
  ('تعز', 'فرع شارع المغتربين'),
  ('تعز', 'فرع البعراره'),
  ('تعز', 'فرع الموشكي'),
  ('تعز', 'فرع صبر الموادم'),
  ('تعز', 'فرع شارع مستشفى الثورة'),
  ('تعز', 'فرع شارع 26'),
  ('تعز', 'فرع الاجينات'),
  ('تعز', 'فرع الخدمات السريعه تعز'),
  ('تعز', 'فرع التربة'),
  ('تعز', 'فرع التربة شارع النصر'),
  ('تعز', 'فرع مكتب التربه -المنصورة'),
  ('تعز', 'فرع العين'),
  ('تعز', 'فرع تعز المركز'),
  ('تعز', 'فرع السمسرة'),
  ('تعز', 'فرع طور الباحه'),
  ('تعز', 'فرع المخا مرتفع'),
  ('تعز', 'فرع الخوخه مرتفع'),
  ('تعز', 'فرع التربة الرئيسي'),
  ('تعز', 'فرع التربة ش ذبحان'),
  ('تعز', 'فرع مكتب الاحد الشعوبية'),
  ('تعز', 'فرع حيس مرتفع'),
  ('تعز', 'فرع المخا ش تعز مرتفع'),
  ('تعز', 'فرع التربة شارع القيادة'),
  ('تعز', 'فرع بيرباشا'),
  ('تعز', 'فرع سيتي مول تعز'),
  ('تعز', 'فرع جوله الصقر'),
  ('تعز', 'فرع مدينة النور'),
  ('تعز', 'فرع مكتب المنعم'),
  ('تعز', 'فرع سوق الخمسين'),
  ('تعز', 'فرع النشمه'),
  ('تعز', 'فرع نجد قسيم'),
  ('تعز', 'فرع صينه'),
  ('تعز', 'فرع مفرق جبل حبشي'),
  ('تعز', 'فرع البيرين'),
  ('تعز', 'فرع تعز المسراخ'),
  ('تعز', 'فرع الدحي'),
  ('عدن', 'فرع مكتب الضالع'),
  ('عدن', 'فرع مكتب لحج'),
  ('عدن', 'فرع لحج الشارع العام'),
  ('عدن', 'فرع الحبيلين'),
  ('عدن', 'فرع صبر الوهط'),
  ('عدن', 'فرع يافع'),
  ('عدن', 'فرع قعطبة'),
  ('عدن', 'فرع الفيوش'),
  ('عدن', 'فرع الكراع'),
  ('عدن', 'فرع الشعب'),
  ('عدن', 'فرع الشيخ الرئيسي'),
  ('عدن', 'فرع مكتب سوق الذهب'),
  ('عدن', 'فرع المنصورة'),
  ('عدن', 'فرع شارع التسعين'),
  ('عدن', 'فرع دار سعد'),
  ('عدن', 'فرع جولة كالتكس'),
  ('عدن', 'فرع مدينة انماء'),
  ('عدن', 'فرع البريقة'),
  ('عدن', 'فرع السيلة'),
  ('عدن', 'فرع مكتب كريتر'),
  ('عدن', 'فرع كريتر الملعب'),
  ('عدن', 'فرع المعلا'),
  ('عدن', 'فرع خور مكسر'),
  ('عدن', 'فرع مكتب عدن مول'),
  ('عدن', 'فرع مكتب ابين'),
  ('عدن', 'فرع جعار'),
  ('عدن', 'فرع التواهي'),
  ('عدن', 'فرع لودر'),
  ('عدن', 'فرع المستشفى الجمهوري - عدن'),
  ('عدن', 'فرع عدن شارع الخمسين'),
  ('عدن', 'فرع جولة القاهرة'),
  ('عدن', 'فرع بير احمد'),
  ('عدن', 'فرع مكتب خليفة المنصورة'),
  ('عدن', 'فرع انماء الجديدة'),
  ('عدن', 'فرع صلاح الدين البريقة'),
  ('عدن', 'فرع المشروع -الشيخ'),
  ('عدن', 'فرع انماء الرئيسي'),
  ('عدن', 'فرع العريش'),
  ('عدن', 'فرع المعلا الدائري'),
  ('عدن', 'فرع ساحل ابين'),
  ('عدن', 'فرع مطار عدن الدولي'),
  ('عدن', 'فرع المدارة'),
  ('صنعاء', 'فرع الدائري'),
  ('صنعاء', 'فرع عصر'),
  ('صنعاء', 'فرع جولة مذبح'),
  ('صنعاء', 'فرع المحويت'),
  ('صنعاء', 'فرع شارع الرقاص'),
  ('صنعاء', 'فرع شارع الزبيري'),
  ('صنعاء', 'فرع شارع الستين'),
  ('صنعاء', 'فرع شارع الجزائر'),
  ('صنعاء', 'فرع شارع عشرين'),
  ('صنعاء', 'فرع شارع هايل'),
  ('صنعاء', 'فرع شملان'),
  ('صنعاء', 'فرع الجامعة'),
  ('صنعاء', 'فرع جوله شملان'),
  ('صنعاء', 'فرع مكتب حده-جوار السفارة الليبية'),
  ('صنعاء', 'فرع التحرير -ش القيادة'),
  ('صنعاء', 'فرع الحصبة'),
  ('صنعاء', 'فرع المشهد-شعوب'),
  ('صنعاء', 'فرع شارع القصر'),
  ('صنعاء', 'فرع ش أبو عمار'),
  ('صنعاء', 'فرع سعوان'),
  ('صنعاء', 'فرع التحرير جوار ملعب الظرافي'),
  ('صنعاء', 'فرع شارع القاهرة'),
  ('صنعاء', 'فرع مكتب شيراتون'),
  ('صنعاء', 'فرع شارع الاربعين'),
  ('صنعاء', 'فرع الحتارش'),
  ('صنعاء', 'فرع الحباري'),
  ('صنعاء', 'الفرع الرئيسي'),
  ('صنعاء', 'فرع مكتب بيت بوس'),
  ('صنعاء', 'فرع الأصبحي'),
  ('صنعاء', 'فرع الاصبحي-سوق المقالح'),
  ('صنعاء', 'فرع حزيز'),
  ('صنعاء', 'فرع حده جسر المدينة'),
  ('صنعاء', 'فرع مكتب حده المدينة السكنية'),
  ('صنعاء', 'فرع ش تعز تقاطع الحربي'),
  ('صنعاء', 'فرع جولة الحثيلي'),
  ('صنعاء', 'فرع متنه'),
  ('صنعاء', 'فرع الخدمات السريعه'),
  ('صنعاء', 'فرع قاع القيضي'),
  ('صنعاء', 'فرع ارتل'),
  ('صنعاء', 'فرع ذمار الرئيسي'),
  ('صنعاء', 'فرع مكتب شارع رداع'),
  ('صنعاء', 'فرع مكتب جولة كمران'),
  ('صنعاء', 'فرع مكتب جولة الجمارك'),
  ('صنعاء', 'فرع رداع'),
  ('صنعاء', 'فرع البيضاء'),
  ('صنعاء', 'فرع دمت'),
  ('صنعاء', 'فرع معبر'),
  ('صنعاء', 'فرع مدينة الشرق'),
  ('صنعاء', 'فرع مكتب عفار - البيضاء'),
  ('صنعاء', 'فرع السوادية -البيضاء'),
  ('صنعاء', 'فرع كتاب'),
  ('صنعاء', 'فرع يريم جوله سند'),
  ('صنعاء', 'فرع مكتب النادرة'),
  ('صنعاء', 'فرع ذمار – الدائري'),
  ('صنعاء', 'فرع دارس'),
  ('صنعاء', 'فرع مثلث المطار'),
  ('صنعاء', 'فرع الجراف'),
  ('صنعاء', 'فرع الوايتات'),
  ('صنعاء', 'فرع جدر'),
  ('صنعاء', 'فرع عمران'),
  ('صنعاء', 'فرع مكتب الجامعة عمران'),
  ('صنعاء', 'فرع حزم الجوف'),
  ('صنعاء', 'فرع شارع التلفزيون'),
  ('صنعاء', 'فرع ريدة'),
  ('صنعاء', 'فرع مطار صنعاء الدولي'),
  ('صنعاء', 'فرع ملعب الثورة'),
  ('صنعاء', 'فرع بيرعبيد'),
  ('صنعاء', 'فرع شارع خولان'),
  ('صنعاء', 'فرع شميلة'),
  ('صنعاء', 'فرع سوق شميلة'),
  ('صنعاء', 'فرع شارع 45'),
  ('صنعاء', 'فرع شارع بينون'),
  ('صنعاء', 'فرع الصافية'),
  ('صنعاء', 'فرع باب اليمن'),
  ('صنعاء', 'فرع حدة')
) as v(region, name)
on conflict (bank, (coalesce(region, '')), name) do nothing;

-- ═══════════ 0013_workflow.sql ═══════════
-- 0013: the working business flow. Everything that changes money, limits, stock or status runs here (SECURITY DEFINER),
-- never from the browser. Apply after 0012.
--   * sign-up creates the merchant + store / the company record
--   * an employee links to a company; the company sets eligibility and limit
--   * company decision -> admin decision -> contract + installment schedule
--   * recording payments, order status changes (with stock restore on cancel), settlements
--   * extra columns the storefront needs (specs, sold_count, notification type/link, contract number)

-- ═════════ 1. Columns & seed data ═════════
alter table products add column if not exists specs jsonb not null default '[]'::jsonb;
alter table products add column if not exists sold_count int not null default 0;
alter table notifications add column if not exists type text not null default 'system';
alter table notifications add column if not exists link text;
alter table contracts add column if not exists contract_number text unique;
alter table contracts add column if not exists start_date date;
create sequence if not exists contract_number_seq start 20001;

insert into categories(name, slug) values
  ('الإلكترونيات','electronics'),('الهواتف','phones'),('الأجهزة المنزلية','appliances'),('الأثاث','furniture'),
  ('الملابس','clothes'),('الأحذية','shoes'),('العطور','perfumes'),('الجمال','beauty'),('الأغذية','food'),
  ('مستلزمات الأطفال','kids'),('الرياضة','sports'),('السيارات','cars'),('أخرى','other')
on conflict (name) do nothing;

-- sold_count follows the order items (set by the checkout function, never by the merchant)
create or replace function bump_sold_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update products set sold_count = sold_count + new.quantity where id = new.product_id;
  return new;
end $$;
drop trigger if exists trg_bump_sold on order_items;
create trigger trg_bump_sold after insert on order_items for each row execute function bump_sold_count();

-- Merchants must not edit sold_count / specs-independent counters directly
create or replace function guard_product() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.featured := false; new.is_bestseller := false; new.rating := 0; new.sold_count := 0;
  else
    new.featured := old.featured; new.is_bestseller := old.is_bestseller; new.rating := old.rating;
    if current_user = 'authenticated' then new.sold_count := old.sold_count; end if;
  end if;
  return new;
end $$;

-- ═════════ 2. Sign-up creates the merchant / company records ═════════
alter table companies add column if not exists commercial_name text;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare requested text := coalesce(new.raw_user_meta_data->>'role','customer');
        nm text := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''), 'حساب جديد');
        biz text := nullif(trim(new.raw_user_meta_data->>'business_name'),'');
        mid uuid;
begin
  if requested not in ('customer','employee','merchant','company') then requested := 'customer'; end if;
  insert into user_profiles(id, full_name, phone, email)
    values (new.id, nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.email);
  insert into user_roles(user_id, role_id) select new.id, id from roles where name = requested;
  if requested = 'merchant' then
    insert into merchants(owner_id, business_name, store_name, owner_name)
      values (new.id, coalesce(biz, 'متجر ' || nm), coalesce(biz, 'متجر ' || nm), nm) returning id into mid;
    insert into stores(merchant_id, name, city) values (mid, coalesce(biz, 'متجر ' || nm), new.raw_user_meta_data->>'city');
  elsif requested = 'company' then
    insert into companies(owner_id, name, contact_name, phone, city)
      values (new.id, coalesce(biz, 'شركة ' || nm), nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.raw_user_meta_data->>'city');
  end if;
  return new;
end $$;

-- Public list of active companies (an employee picks theirs). No owner, no register number.
create or replace view companies_public as select id, name, city from companies where status = 'active';
grant select on companies_public to anon, authenticated;

-- ═════════ 3. Employee <-> company ═════════
create or replace function join_company(p_company uuid, p_job text default null, p_number text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); eid uuid; nm text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not has_role('employee') then raise exception 'only employee accounts can join a company'; end if;
  if not exists (select 1 from companies where id = p_company and status = 'active') then raise exception 'company is not active'; end if;
  select full_name into nm from user_profiles where id = uid;
  insert into employees(user_id, company_id, job_title, employee_number, full_name, status)
    values (uid, p_company, nullif(trim(p_job),''), nullif(trim(p_number),''), nm, 'active')
    on conflict (user_id) do update set company_id = excluded.company_id,
      job_title = coalesce(excluded.job_title, employees.job_title),
      employee_number = coalesce(excluded.employee_number, employees.employee_number),
      eligibility = case when employees.company_id is distinct from excluded.company_id then 'pending' else employees.eligibility end
    returning id into eid;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'employee_joined_company', 'employee', eid::text, jsonb_build_object('company', p_company));
  return eid;
end $$;

create or replace function company_set_employee(p_emp uuid, p_eligibility text, p_limit numeric, p_salary numeric default null, p_status text default null)
returns void language plpgsql security definer set search_path = public as $$
declare e employees;
begin
  select * into e from employees where id = p_emp;
  if not found then raise exception 'employee not found'; end if;
  if not (is_admin() or exists (select 1 from companies c where c.id = e.company_id and c.owner_id = auth.uid() and c.status = 'active')) then
    raise exception 'not allowed';
  end if;
  if p_eligibility not in ('pending','eligible','ineligible') then raise exception 'invalid eligibility'; end if;
  if p_limit is null or p_limit < e.used_limit then raise exception 'limit cannot be below the amount already used'; end if;
  if p_status is not null and p_status not in ('active','on_leave','suspended','terminated') then raise exception 'invalid status'; end if;
  update employees set eligibility = p_eligibility, installment_limit = p_limit,
    salary = coalesce(p_salary, salary), status = coalesce(p_status, status) where id = p_emp;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'employee_limits_set', 'employee', p_emp::text,
            jsonb_build_object('eligibility', p_eligibility, 'limit', p_limit, 'status', p_status));
end $$;

-- ═════════ 4. Helpers ═════════
create or replace function _notify(p_user uuid, p_title text, p_body text, p_type text default 'system', p_link text default null) returns void
language sql security definer set search_path = public as $$
  insert into notifications(user_id, title, body, type, link) values (p_user, p_title, p_body, p_type, p_link);
$$;
revoke execute on function _notify(uuid,text,text,text,text) from public, anon, authenticated;

-- Put the stock back (once) when an order is cancelled or refused.
create or replace function _cancel_order(p_order uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare cur text;
begin
  select status into cur from orders where id = p_order for update;
  if cur is null or cur in ('cancelled','delivered','refunded') then return; end if;
  update products p set stock = p.stock + i.quantity from order_items i where i.order_id = p_order and i.product_id = p.id;
  update orders set status = 'cancelled' where id = p_order;
  insert into order_status_history(order_id, status, changed_by, note) values (p_order, 'cancelled', auth.uid(), p_note);
end $$;
revoke execute on function _cancel_order(uuid,text) from public, anon, authenticated;

-- ═════════ 5. Company decision ═════════
create or replace function company_decide_application(p_app uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare a financing_applications;
begin
  select * into a from financing_applications where id = p_app for update;
  if not found then raise exception 'application not found'; end if;
  if not (is_admin() or exists (select 1 from companies c where c.id = a.company_id and c.owner_id = auth.uid())) then
    raise exception 'not allowed';
  end if;
  if a.review_stage <> 'company' or a.status not in ('new','under_review') then raise exception 'application is not waiting for the company'; end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then raise exception 'a reason is required to reject'; end if;
  if p_approve then
    update financing_applications set company_approved = true, review_stage = 'admin', status = 'under_review',
      company_note = p_note, company_decided_by = auth.uid(), company_decided_at = now() where id = p_app;
  else
    update financing_applications set company_approved = false, status = 'rejected', rejection_reason = p_note,
      company_note = p_note, company_decided_by = auth.uid(), company_decided_at = now() where id = p_app;
    if a.order_id is not null then perform _cancel_order(a.order_id, 'company rejected the application'); end if;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), case when p_approve then 'company_approved_application' else 'company_rejected_application' end,
            'financing_application', p_app::text, jsonb_build_object('note', p_note));
  perform _notify(a.applicant_user_id, case when p_approve then 'وافقت شركتك على طلب التقسيط' else 'رفضت شركتك طلب التقسيط' end,
                  coalesce(p_note,''), 'installment');
end $$;

-- ═════════ 6. Admin / financing staff decision -> contract + schedule ═════════
create or replace function decide_application(p_app uuid, p_approve boolean, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare a financing_applications; e employees; cid uuid; n int; monthly numeric; amt numeric; idv text;
begin
  if not (is_admin() or has_permission('financing.review')) then raise exception 'not allowed'; end if;
  select * into a from financing_applications where id = p_app for update;
  if not found then raise exception 'application not found'; end if;
  if a.review_stage <> 'admin' or a.status in ('approved','rejected','completed') then raise exception 'application is not waiting for the platform'; end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then raise exception 'a reason is required to reject'; end if;

  if not p_approve then
    update financing_applications set status = 'rejected', rejection_reason = p_note, admin_note = p_note,
      admin_decided_by = auth.uid(), admin_decided_at = now() where id = p_app;
    if a.order_id is not null then perform _cancel_order(a.order_id, 'application rejected'); end if;
    insert into audit_logs(actor_id, action, entity, entity_id, details)
      values (auth.uid(), 'application_rejected', 'financing_application', p_app::text, jsonb_build_object('note', p_note));
    perform _notify(a.applicant_user_id, 'تم رفض طلب التقسيط', coalesce(p_note,''), 'installment');
    return null;
  end if;

  select identity_status into idv from user_profiles where id = a.applicant_user_id;
  if idv is distinct from 'verified' then raise exception 'the applicant identity is not verified yet'; end if;
  if a.employee_id is not null then
    select * into e from employees where id = a.employee_id for update;
    if e.eligibility <> 'eligible' then raise exception 'the employee is not eligible'; end if;
    if e.used_limit + a.deferred_price > e.installment_limit then raise exception 'installment limit exceeded'; end if;
    update employees set used_limit = used_limit + a.deferred_price where id = e.id;
  end if;

  insert into contracts(application_id, status, contract_number, start_date)
    values (p_app, 'active', 'CON-' || nextval('contract_number_seq'), current_date) returning id into cid;
  monthly := a.monthly_installment;
  for n in 1..a.months loop
    amt := case when n = a.months then a.deferred_price - monthly * (a.months - 1) else monthly end;
    insert into installments(contract_id, number, due_date, amount, status)
      values (cid, n, current_date + 30 * n, amt, case when n = 1 then 'due' else 'upcoming' end);
  end loop;
  update financing_applications set status = 'approved', admin_note = p_note,
    admin_decided_by = auth.uid(), admin_decided_at = now() where id = p_app;
  if a.order_id is not null then
    update orders set status = 'approved' where id = a.order_id and status in ('new','under_review','awaiting_payment');
    insert into order_status_history(order_id, status, changed_by, note) values (a.order_id, 'approved', auth.uid(), 'financing approved');
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'application_approved', 'financing_application', p_app::text, jsonb_build_object('contract', cid));
  perform _notify(a.applicant_user_id, 'تمت الموافقة على طلب التقسيط', 'تم إنشاء عقدك وجدول الأقساط', 'installment');
  return cid;
end $$;

-- ═════════ 7. Payments ═════════
create or replace function record_payment(p_installment uuid, p_amount numeric, p_method text default 'cash') returns uuid
language plpgsql security definer set search_path = public as $$
declare i installments; k contracts; a financing_applications; pid uuid; left_n int;
begin
  if not (is_admin() or has_permission('payments.record')) then raise exception 'not allowed'; end if;
  select * into i from installments where id = p_installment for update;
  if not found then raise exception 'installment not found'; end if;
  if i.status = 'paid' then raise exception 'installment already paid'; end if;
  if p_amount is distinct from i.amount then raise exception 'amount must equal the installment amount (%)', i.amount; end if;
  select * into k from contracts where id = i.contract_id;
  select * into a from financing_applications where id = k.application_id;

  insert into payments(installment_id, amount, method, recorded_by, contract_id, order_id, payment_number, status)
    values (i.id, p_amount, nullif(trim(p_method),''), auth.uid(), k.id, a.order_id,
            'PAY-' || upper(substr(gen_random_uuid()::text, 1, 8)), 'succeeded') returning id into pid;
  update installments set status = 'paid' where id = i.id;
  if a.employee_id is not null then
    update employees set used_limit = greatest(0, used_limit - p_amount) where id = a.employee_id;
  end if;
  select count(*) into left_n from installments where contract_id = k.id and status <> 'paid';
  if left_n = 0 then
    update contracts set status = 'completed' where id = k.id;
    update financing_applications set status = 'completed' where id = a.id;
    perform _notify(a.applicant_user_id, 'اكتمل سداد العقد', 'شكراً لالتزامك', 'payment');
  else
    update installments set status = 'due' where id = (select id from installments where contract_id = k.id and status = 'upcoming' order by number limit 1)
      and not exists (select 1 from installments where contract_id = k.id and status in ('due','late','overdue'));
    perform _notify(a.applicant_user_id, 'تم تسجيل دفعة', 'القسط رقم ' || i.number || ' بمبلغ ' || p_amount, 'payment');
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'payment_recorded', 'installment', i.id::text, jsonb_build_object('amount', p_amount, 'method', p_method));
  return pid;
end $$;

-- Late flags: any signed-in user may trigger the refresh (it only moves dates forward and touches no money).
create or replace function refresh_installment_status() returns void
language sql security definer set search_path = public as $$
  update installments set status = 'overdue' where status = 'due' and due_date < current_date;
  update contracts c set status = 'defaulted' where c.status = 'active' and exists
    (select 1 from installments i where i.contract_id = c.id and i.status = 'overdue' and i.due_date < current_date - 60);
$$;

-- ═════════ 8. Orders ═════════
create or replace function update_order_status(p_order uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o orders; uid uuid := auth.uid(); staff boolean; mine boolean; owner boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'order not found'; end if;
  staff := is_admin() or has_permission('orders.update');
  owner := o.user_id = uid;
  mine := exists (select 1 from order_items i join merchants m on m.id = i.merchant_id where i.order_id = p_order and m.owner_id = uid);
  if not (staff or owner or mine) then raise exception 'not allowed'; end if;
  if p_status not in ('under_review','approved','processing','shipped','delivered','cancelled','delivery_failed','returned','refunded') then
    raise exception 'invalid status';
  end if;
  if o.status in ('cancelled','refunded') then raise exception 'order is closed'; end if;
  if o.status = 'delivered' and p_status not in ('returned','refunded') then raise exception 'order is already delivered'; end if;
  if not staff then
    if owner and not mine then
      if not (p_status = 'cancelled' and o.status in ('new','under_review','awaiting_payment')) then raise exception 'you can only cancel an order that is not yet approved'; end if;
    else
      if p_status not in ('processing','shipped') then raise exception 'merchants may set processing or shipped only'; end if;
    end if;
  end if;
  if o.payment_method = 'installment' and p_status in ('processing','shipped','delivered') and o.status not in ('approved','processing','shipped') then
    raise exception 'an installment order must be approved before it is prepared or shipped';
  end if;

  if p_status = 'cancelled' then
    perform _cancel_order(p_order, coalesce(p_note, 'cancelled'));
    update financing_applications set status = 'rejected', rejection_reason = coalesce(p_note, 'order cancelled')
      where order_id = p_order and status not in ('approved','completed','rejected');
  else
    update orders set status = p_status where id = p_order;
    insert into order_status_history(order_id, status, changed_by, note) values (p_order, p_status, uid, p_note);
    if p_status = 'delivered' and o.payment_method = 'cash_on_delivery' then
      update merchants m set sales_total = sales_total + s.g from
        (select merchant_id, sum(quantity * unit_price) g from order_items where order_id = p_order and merchant_id is not null group by 1) s
        where m.id = s.merchant_id;
    end if;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'order_status_changed', 'order', p_order::text, jsonb_build_object('from', o.status, 'to', p_status));
  perform _notify(o.user_id, 'تحديث على طلبك ' || o.order_number, p_status, 'order', '/customer/orders');
end $$;

-- ═════════ 9. Platform staff: entity status & settlements ═════════
create or replace function set_merchant_status(p_merchant uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or has_permission('merchants.manage')) then raise exception 'not allowed'; end if;
  if p_status not in ('pending','active','suspended') then raise exception 'invalid status'; end if;
  update merchants set status = p_status where id = p_merchant;
  if not found then raise exception 'merchant not found'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'merchant_status_changed', 'merchant', p_merchant::text, jsonb_build_object('status', p_status));
  perform _notify((select owner_id from merchants where id = p_merchant), 'تحديث حالة متجرك', p_status, 'system');
end $$;

create or replace function set_company_status(p_company uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or has_permission('financing.review')) then raise exception 'not allowed'; end if;
  if p_status not in ('pending','active','suspended') then raise exception 'invalid status'; end if;
  update companies set status = p_status where id = p_company;
  if not found then raise exception 'company not found'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'company_status_changed', 'company', p_company::text, jsonb_build_object('status', p_status));
  perform _notify((select owner_id from companies where id = p_company), 'تحديث حالة شركتك', p_status, 'system');
end $$;

create or replace function set_commission_settlement(p_commission uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare c commissions; sid uuid;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('processing','in_progress','paid') then raise exception 'invalid status'; end if;
  select * into c from commissions where id = p_commission for update;
  if not found then raise exception 'commission not found'; end if;
  if c.settlement_id is null then
    insert into settlements(merchant_id, gross, commission, net, status, created_by)
      values (c.merchant_id, c.gross, c.commission, c.net, p_status, auth.uid()) returning id into sid;
    update commissions set settlement_id = sid where id = c.id;
  else
    update settlements set status = p_status, paid_at = case when p_status = 'paid' then now() end where id = c.settlement_id;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'settlement_status', 'commission', p_commission::text, jsonb_build_object('status', p_status));
end $$;

-- ═════════ 10. Grants ═════════
revoke execute on function join_company(uuid,text,text), company_set_employee(uuid,text,numeric,numeric,text),
  company_decide_application(uuid,boolean,text), decide_application(uuid,boolean,text), record_payment(uuid,numeric,text),
  refresh_installment_status(), update_order_status(uuid,text,text), set_merchant_status(uuid,text),
  set_company_status(uuid,text), set_commission_settlement(uuid,text) from public, anon;
grant execute on function join_company(uuid,text,text), company_set_employee(uuid,text,numeric,numeric,text),
  company_decide_application(uuid,boolean,text), decide_application(uuid,boolean,text), record_payment(uuid,numeric,text),
  refresh_installment_status(), update_order_status(uuid,text,text), set_merchant_status(uuid,text),
  set_company_status(uuid,text), set_commission_settlement(uuid,text) to authenticated;

-- Read access the dashboards need beyond what 0001-0012 grant
create policy applicant_contracts on contracts for select using (exists (
  select 1 from financing_applications a where a.id = application_id and a.applicant_user_id = auth.uid()));
create policy applicant_installments on installments for select using (exists (
  select 1 from contracts k join financing_applications a on a.id = k.application_id
  where k.id = contract_id and a.applicant_user_id = auth.uid()));
create policy applicant_payments on payments for select using (exists (
  select 1 from installments i join contracts k on k.id = i.contract_id join financing_applications a on a.id = k.application_id
  where i.id = installment_id and a.applicant_user_id = auth.uid()));
create policy company_contracts on contracts for select using (exists (
  select 1 from financing_applications a join companies c on c.id = a.company_id where a.id = application_id and c.owner_id = auth.uid()));
create policy company_installments on installments for select using (exists (
  select 1 from contracts k join financing_applications a on a.id = k.application_id join companies c on c.id = a.company_id
  where k.id = contract_id and c.owner_id = auth.uid()));
-- (helper bypasses RLS so orders <-> order_items policies cannot recurse)
create or replace function _merchant_has_order(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from order_items i join merchants m on m.id = i.merchant_id where i.order_id = p_order and m.owner_id = auth.uid());
$$;
create policy merchant_orders on orders for select using (_merchant_has_order(id));
create policy staff_commissions_fin on commissions for select using (has_permission('financing.view'));
create policy own_company_employees_profiles on user_profiles for select using (exists (
  select 1 from employees e join companies c on c.id = e.company_id where e.user_id = user_profiles.id and c.owner_id = auth.uid()));

-- ═════════ 11. Application snapshot (so a company can see WHAT its employee orders without reading the order) ═════════
alter table financing_applications add column if not exists product_summary text;
alter table financing_applications add column if not exists merchant_summary text;
alter table financing_applications add column if not exists applicant_name text;
alter table financing_applications add column if not exists company_name text;

create or replace function fill_application_summary() returns trigger
language plpgsql security definer set search_path = public as $$
declare names text; mers text; n int;
begin
  if new.order_id is not null then
    select string_agg(p.name, '، ' order by p.name), string_agg(distinct coalesce(m.store_name, m.business_name), '، '), count(*)
      into names, mers, n
      from order_items i join products p on p.id = i.product_id left join merchants m on m.id = i.merchant_id
     where i.order_id = new.order_id;
    new.product_summary := names;
    new.merchant_summary := mers;
  end if;
  select full_name into new.applicant_name from user_profiles where id = coalesce(new.applicant_user_id, (select user_id from employees where id = new.employee_id));
  if new.company_id is not null then select name into new.company_name from companies where id = new.company_id; end if;
  return new;
end $$;
drop trigger if exists trg_fill_application_summary on financing_applications;
-- fires after financing_before_insert (alphabetical order) so applicant_user_id is already set
create trigger trg_zz_fill_application_summary before insert on financing_applications
  for each row execute function fill_application_summary();

-- ═════════ 12. Products of a pending / suspended merchant are not public ═════════
create or replace function _store_is_public(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from stores s join merchants m on m.id = s.merchant_id where s.id = p_store and m.status = 'active');
$$;
drop policy if exists public_read on products;
create policy public_read on products for select using (active and _store_is_public(store_id));


-- ═══════════ 0014 (20261014025316_0014_exempt_company_identity.sql.sql) ═══════════
/*
# Exempt company accounts from identity verification

## Problem
The `require_active_account` trigger checks `p.identity_status <> 'verified'` for ALL
account types, including companies. Company accounts should not need identity
verification — they are legal entities, not individual shoppers.

## Changes
1. Replaces the `require_active_account` function to skip the identity check for
   users whose only role is `company`.
2. A user who has both `company` and another role (e.g. `customer`) still needs
   identity verification for orders placed as a customer.

## Security
- No new tables or columns.
- No RLS policy changes.
- The trigger still enforces `status = 'active'` for all users.
*/

CREATE OR REPLACE FUNCTION require_active_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  uid uuid;
  p user_profiles;
  is_company_only boolean;
begin
  if auth.uid() is null then return new; end if;  -- back office / service role
  if tg_table_name = 'orders' then uid := new.user_id; else uid := new.applicant_user_id; end if;
  if uid is null then return new; end if;
  select * into p from user_profiles where id = uid;
  if not found or p.status <> 'active' then
    raise exception 'account is not active';
  end if;
  -- Company accounts are exempt from identity verification
  select not exists (
    select 1 from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = uid and r.name <> 'company'
  ) and exists (
    select 1 from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = uid and r.name = 'company'
  ) into is_company_only;
  if is_company_only then
    return new;
  end if;
  if p.identity_status <> 'verified' then
    raise exception 'account is not active: identity verification must be approved first';
  end if;
  return new;
end;
$$;


-- ═══════════ 0015 (20261014025330_0015_autoactivate_company.sql.sql) ═══════════
/*
# Auto-activate company accounts at registration

## Problem
Company accounts are created with status='pending' and identity_status='none'.
Since companies are now exempt from identity verification, they should start
with status='active' and identity_status='verified' so they can operate immediately.

## Changes
1. Replaces the `handle_new_user` trigger function to set company accounts to
   active+verified at creation time.
2. Also auto-activates merchant accounts (they already need admin approval for
   the merchant record, but the user profile should be active so they can log in
   and manage their store settings).

## Security
- No schema changes.
- Company accounts still need admin approval for merchant-level operations
  through the merchants table status field.
*/
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  requested text := coalesce(new.raw_user_meta_data->>'role','customer');
  nm text := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''), 'حساب جديد');
  biz text := nullif(trim(new.raw_user_meta_data->>'business_name'),'');
  mid uuid;
begin
  if requested not in ('customer','employee','merchant','company') then requested := 'customer'; end if;
  -- Company accounts skip identity verification; merchant accounts are activated but their store needs approval
  if requested = 'company' then
    insert into user_profiles(id, full_name, phone, email, status, identity_status)
    values (new.id, nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.email, 'active', 'verified');
  else
    insert into user_profiles(id, full_name, phone, email)
    values (new.id, nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.email);
  end if;
  insert into user_roles(user_id, role_id) select new.id, id from roles where name = requested;
  if requested = 'merchant' then
    insert into merchants(owner_id, business_name, store_name, owner_name)
    values (new.id, coalesce(biz, 'متجر ' || nm), coalesce(biz, 'متجر ' || nm), nm) returning id into mid;
    insert into stores(merchant_id, name, city) values (mid, coalesce(biz, 'متجر ' || nm), new.raw_user_meta_data->>'city');
  elsif requested = 'company' then
    insert into companies(owner_id, name, contact_name, phone, city)
    values (new.id, coalesce(biz, 'شركة ' || nm), nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.raw_user_meta_data->>'city');
  end if;
  return new;
end;
$$;


-- ═══════════ 0016 (20261014031200_0016_support_tickets_enhanced.sql.sql) ═══════════
/*
# Support tickets: add columns, replies table, RLS, and admin permission

## Changes

1. Adds columns to support_tickets:
   - ticket_number: unique human-readable ticket number
   - category: problem type (login, identity, account, company, employees, password, other)
   - phone: optional phone number
   - email: optional email
   - full_name: sender name
   - assigned_to: staff member assigned
   - updated_at: last activity timestamp

2. Creates support_ticket_replies table for staff-user conversation thread.

3. Enables RLS on both tables with proper policies:
   - Users can CRUD their own tickets
   - Users can read replies on their own tickets
   - Staff with support.manage can read/update all tickets
   - Staff with support.manage can insert replies

4. Grants support.manage permission to admin role in DB.

5. Creates indexes for performance.
*/

-- Add columns to support_tickets
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text UNIQUE DEFAULT ('TKT-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))),
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Fix any existing rows that have null ticket_number
UPDATE support_tickets SET ticket_number = 'TKT-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)) WHERE ticket_number IS NULL;

-- Ticket replies table
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  message text NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_replies_ticket ON support_ticket_replies(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "select_own_tickets" ON support_tickets;
DROP POLICY IF EXISTS "insert_own_tickets" ON support_tickets;
DROP POLICY IF EXISTS "update_own_tickets" ON support_tickets;
DROP POLICY IF EXISTS "staff_select_tickets" ON support_tickets;
DROP POLICY IF EXISTS "staff_update_tickets" ON support_tickets;
DROP POLICY IF EXISTS "select_own_replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "insert_own_replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "staff_select_replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "staff_insert_replies" ON support_ticket_replies;

-- User policies: users see and manage their own tickets
CREATE POLICY "select_own_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_tickets" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Staff policies: staff with support.manage can see and update all tickets
CREATE POLICY "staff_select_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.code = 'support.manage'
    )
  );

CREATE POLICY "staff_update_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.code = 'support.manage'
    )
  );

-- Reply policies: users see replies on their tickets, staff see all replies
CREATE POLICY "select_own_replies" ON support_ticket_replies FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.code = 'support.manage'
    )
  );

-- Users insert replies on their own tickets, staff insert replies on any ticket
CREATE POLICY "insert_own_replies" ON support_ticket_replies FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.code = 'support.manage'
    )
  );

-- Grant support.manage to admin role in the database
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.code = 'support.manage'
ON CONFLICT DO NOTHING;

-- Notification trigger: notify staff when a new ticket is created
CREATE OR REPLACE FUNCTION notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  INSERT INTO notifications (user_id, title, body, type, link)
  SELECT ur.user_id, 'تذكرة دعم جديدة', 'تم استلام تذكرة جديدة: ' || NEW.subject, 'system', '/admin/support'
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE p.code = 'support.manage'
  AND ur.user_id != NEW.user_id;
  RETURN NEW;
end;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_ticket ON support_tickets;
CREATE TRIGGER trg_notify_new_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_ticket();

-- Notification when staff replies
CREATE OR REPLACE FUNCTION notify_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  ticket_user uuid;
  ticket_subject text;
begin
  SELECT user_id, subject INTO ticket_user, ticket_subject FROM support_tickets WHERE id = NEW.ticket_id;
  IF NEW.is_staff AND ticket_user != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, body, type, link)
    VALUES (ticket_user, 'رد من خدمة العملاء', 'رد جديد على تذكرتك: ' || ticket_subject, 'system', '/support/my-tickets');
  END IF;
  RETURN NEW;
end;
$$;

DROP TRIGGER IF EXISTS trg_notify_ticket_reply ON support_ticket_replies;
CREATE TRIGGER trg_notify_ticket_reply
  AFTER INSERT ON support_ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_reply();


-- ═══════════ 20261019000000_0017_product_requests.sql ═══════════
-- 0017: "طلب منتج غير مدرج": the customer or employee sends a link and/or photo of a product from any local store
-- that is not registered on Qistuha. Platform staff contact the store, coordinate the purchase and offer it on installment.
-- Safe to run more than once.

-- 1) Permission
insert into permissions(code, description) values ('requests.manage', 'متابعة طلبات المنتجات غير المدرجة والتنسيق مع المتاجر')
  on conflict (code) do nothing;
insert into role_permissions(role_id, permission_id)
  select r.id, p.id from roles r, permissions p where r.name = 'staff_orders' and p.code = 'requests.manage'
  on conflict do nothing;

-- 2) Table
create table if not exists product_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique not null default ('REQ-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  product_name text not null check (length(btrim(product_name)) between 2 and 200),
  product_url text check (product_url is null or product_url ~* '^https?://'),
  image_path text,
  store_name text,
  store_city text,
  store_phone text,
  estimated_price numeric(14,2) check (estimated_price is null or estimated_price > 0),
  quantity int not null default 1 check (quantity between 1 and 100),
  months int check (months is null or months in (6,9,12,18,24)),
  notes text check (notes is null or length(notes) <= 2000),
  status text not null default 'new' check (status in
    ('new','contacting_store','store_confirmed','offer_sent','approved','purchased','rejected','cancelled')),
  admin_note text,
  quoted_price numeric(14,2) check (quoted_price is null or quoted_price > 0),
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint link_or_image check (product_url is not null or image_path is not null)
);
create index if not exists idx_product_requests_user on product_requests(user_id, created_at desc);
create index if not exists idx_product_requests_status on product_requests(status, created_at);

-- 3) RLS: the sender inserts and reads their own; staff with requests.manage read and update all.
alter table product_requests enable row level security;
drop policy if exists pr_select_own on product_requests;
drop policy if exists pr_insert_own on product_requests;
drop policy if exists pr_staff_select on product_requests;
drop policy if exists pr_staff_update on product_requests;
create policy pr_select_own on product_requests for select to authenticated using (user_id = auth.uid());
create policy pr_insert_own on product_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'new' and admin_note is null and quoted_price is null and assigned_to is null
    and (image_path is null or image_path like auth.uid()::text || '/%'));
create policy pr_staff_select on product_requests for select to authenticated using (has_permission('requests.manage'));
create policy pr_staff_update on product_requests for update to authenticated
  using (has_permission('requests.manage')) with check (has_permission('requests.manage'));

-- 4) Touch updated_at, and tell the sender when the status changes or a staff note is added.
create or replace function _product_request_after() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_product_request_touch on product_requests;
create trigger trg_product_request_touch before update on product_requests
  for each row execute function _product_request_after();

create or replace function _product_request_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare msg text;
begin
  if tg_op = 'INSERT' then
    perform _notify(new.user_id, 'استلمنا طلب المنتج', 'رقم الطلب ' || new.request_number || '. سنتواصل مع المتجر ونبلغك بالنتيجة.', 'system', '/requests');
    return new;
  end if;
  if new.status is distinct from old.status then
    msg := case new.status
      when 'contacting_store' then 'نتواصل الآن مع المتجر بخصوص منتجك'
      when 'store_confirmed'  then 'المتجر أكد توفر المنتج'
      when 'offer_sent'       then 'جاهز عرض التقسيط لمنتجك. راجع التفاصيل'
      when 'approved'         then 'تمت الموافقة على طلبك وسنشتري المنتج'
      when 'purchased'        then 'تم شراء المنتج وسيصلك قريباً'
      when 'rejected'         then 'تعذر توفير المنتج المطلوب'
      when 'cancelled'        then 'تم إلغاء الطلب'
      else null end;
    if msg is not null then
      perform _notify(new.user_id, 'تحديث على طلب المنتج ' || new.request_number,
        msg || coalesce('. ملاحظة: ' || nullif(btrim(new.admin_note), ''), ''), 'system', '/requests');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_product_request_notify on product_requests;
create trigger trg_product_request_notify after insert or update on product_requests
  for each row execute function _product_request_notify();

-- 5) The sender may cancel their own request while it is still open (no direct UPDATE right for senders).
create or replace function cancel_product_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update product_requests set status = 'cancelled'
   where id = p_id and user_id = auth.uid() and status in ('new','contacting_store','store_confirmed','offer_sent');
  if not found then raise exception 'cannot cancel this request'; end if;
end $$;
revoke execute on function cancel_product_request(uuid) from public, anon;
grant execute on function cancel_product_request(uuid) to authenticated;

-- 6) Private bucket for the photos. Each user writes to a folder named after their user id.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('request-images', 'request-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;
drop policy if exists "request images own insert" on storage.objects;
drop policy if exists "request images read" on storage.objects;
create policy "request images own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'request-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "request images read" on storage.objects for select to authenticated
  using (bucket_id = 'request-images' and ((storage.foldername(name))[1] = auth.uid()::text or has_permission('requests.manage')));

-- ═══════════ 20261019010000_0018_currencies_invoices.sql ═══════════
-- 0018: multi-currency (YER, SAR, USD) for products, orders and installments + real invoices (QR, public verification).
-- Apply after 0017. Safe to run on a database that already has 0001..0017.

-- ═════════ 1. Currencies and exchange rates ═════════
-- yer_per_unit = how many Yemeni rials equal ONE unit of the currency. YER is always 1.
-- The owner sets SAR and USD from the admin settings. The seeded numbers are placeholders: CHANGE THEM before launch.
create table if not exists exchange_rates (
  code text primary key check (code in ('YER','SAR','USD')),
  yer_per_unit numeric(14,4) not null check (yer_per_unit > 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check (code <> 'YER' or yer_per_unit = 1)
);
insert into exchange_rates(code, yer_per_unit) values ('YER', 1), ('SAR', 140), ('USD', 530) on conflict (code) do nothing;
alter table exchange_rates enable row level security;
drop policy if exists rates_read on exchange_rates;
create policy rates_read on exchange_rates for select using (true);   -- public: shown in the shop

create or replace function set_exchange_rate(p_code text, p_rate numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p_code not in ('SAR','USD') then raise exception 'only SAR and USD rates can be changed'; end if;
  if p_rate is null or p_rate <= 0 or p_rate > 1000000 then raise exception 'invalid rate'; end if;
  update exchange_rates set yer_per_unit = p_rate, updated_by = auth.uid(), updated_at = now() where code = p_code;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'exchange_rate_set', 'exchange_rate', p_code, jsonb_build_object('yer_per_unit', p_rate));
end $$;
revoke execute on function set_exchange_rate(text,numeric) from public, anon;
grant execute on function set_exchange_rate(text,numeric) to authenticated;

create or replace function _round_money(p_amount numeric, p_cur text) returns numeric
language sql immutable as $$ select case p_cur when 'YER' then round(p_amount, 0) else round(p_amount, 2) end $$;

create or replace function _fx_convert(p_amount numeric, p_from text, p_to text) returns numeric
language plpgsql stable set search_path = public as $$
declare rf numeric; rt numeric;
begin
  if p_from = p_to then return p_amount; end if;
  select yer_per_unit into rf from exchange_rates where code = p_from;
  select yer_per_unit into rt from exchange_rates where code = p_to;
  if rf is null or rt is null then raise exception 'unknown currency'; end if;
  return p_amount * rf / rt;
end $$;

-- ═════════ 2. Currency columns ═════════
alter table products add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));
alter table orders add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));
alter table order_items add column if not exists orig_currency text check (orig_currency in ('YER','SAR','USD'));
alter table order_items add column if not exists orig_unit_price numeric(14,2);
alter table order_items add column if not exists fx_rate numeric(18,8);
alter table financing_applications add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));
alter table commissions add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));
alter table settlements add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD'));

-- Commission is rounded in the order's own currency.
drop function if exists compute_commission(numeric, int);
create or replace function compute_commission(gross numeric, pct int, cur text default 'YER') returns numeric
language sql immutable as $$ select _round_money(gross * pct / 100.0, cur) $$;

create or replace function order_item_commission() returns trigger
language plpgsql security definer set search_path = public as $$
declare pct int; g numeric; c numeric; cur text;
begin
  if new.merchant_id is null then return new; end if;
  select commission_percent into pct from merchants where id = new.merchant_id;
  select currency into cur from orders where id = new.order_id;
  g := new.quantity * new.unit_price;
  c := compute_commission(g, pct, cur);
  insert into commissions(order_item_id, merchant_id, percent, gross, commission, net, currency)
  values (new.id, new.merchant_id, pct, g, c, g - c, cur);
  return new;
end $$;

-- ═════════ 3. Invoices ═════════
alter table invoices
  add column if not exists kind text not null default 'sale' check (kind in ('sale','installment_sale')),
  add column if not exists currency text not null default 'YER' check (currency in ('YER','SAR','USD')),
  add column if not exists buyer_id uuid references auth.users(id),
  add column if not exists buyer_name text,
  add column if not exists buyer_phone text,
  add column if not exists buyer_address text,
  add column if not exists merchant_name text,
  add column if not exists payment_method text,
  add column if not exists months int,
  add column if not exists markup_percent numeric(5,2),
  add column if not exists deferred_total numeric(14,2),
  add column if not exists monthly numeric(14,2),
  add column if not exists contract_id uuid references contracts(id),
  add column if not exists verify_code text unique default upper(encode(gen_random_bytes(8), 'hex')),
  add column if not exists status text not null default 'issued' check (status in ('issued','void'));
update invoices set verify_code = upper(encode(gen_random_bytes(8), 'hex')) where verify_code is null;
create index if not exists idx_invoices_buyer on invoices(buyer_id, issued_at desc);

drop policy if exists buyer_invoices on invoices;
create policy buyer_invoices on invoices for select using (buyer_id = auth.uid());

-- Builds one invoice per merchant for an order (idempotent). Internal: called by checkout and by the approval step.
create or replace function _issue_invoices(p_order uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  o orders; a financing_applications; c contracts; prof record; mn record;
  groups jsonb; g jsonb; n int := 0; i int := 0; cnt int;
  sub numeric; share_def numeric; run_def numeric := 0; run_mon numeric := 0; share_mon numeric;
  items jsonb;
begin
  select * into o from orders where id = p_order;
  if not found then raise exception 'order not found'; end if;
  select * into a from financing_applications where order_id = p_order;
  if o.payment_method = 'installment' then
    if a.id is null then return 0; end if;
    select * into c from contracts where application_id = a.id;
    if c.id is null then return 0; end if;           -- no invoice before the contract exists
  end if;
  select full_name, phone into prof from user_profiles where id = o.user_id;

  select coalesce(jsonb_agg(x order by x->>'merchant'), '[]'::jsonb) into groups from (
    select jsonb_build_object('merchant', coalesce(oi.merchant_id::text, ''),
             'sub', sum(oi.quantity * oi.unit_price),
             'items', jsonb_agg(jsonb_build_object(
                 'product_id', oi.product_id, 'name', p.name, 'qty', oi.quantity, 'unit_price', oi.unit_price,
                 'line_total', oi.quantity * oi.unit_price, 'orig_currency', oi.orig_currency,
                 'orig_unit_price', oi.orig_unit_price) order by p.name)) as x
      from order_items oi join products p on p.id = oi.product_id
     where oi.order_id = p_order group by oi.merchant_id) q;
  cnt := jsonb_array_length(groups);

  for g in select * from jsonb_array_elements(groups) loop
    i := i + 1;
    sub := (g->>'sub')::numeric;
    items := g->'items';
    select m.id, coalesce(m.store_name, m.business_name) as nm into mn from merchants m where m.id = nullif(g->>'merchant','')::uuid;
    if o.payment_method = 'installment' then
      -- every merchant invoice carries its proportional share of the deferred price; the last one absorbs rounding
      if i = cnt then share_def := a.deferred_price - run_def; share_mon := a.monthly_installment - run_mon;
      else
        share_def := _round_money(a.deferred_price * sub / nullif(o.subtotal,0), o.currency);
        share_mon := _round_money(a.monthly_installment * sub / nullif(o.subtotal,0), o.currency);
      end if;
      run_def := run_def + share_def; run_mon := run_mon + share_mon;
    end if;
    insert into invoices(order_id, merchant_id, items_json, subtotal, discount, shipping, total, kind, currency,
        buyer_id, buyer_name, buyer_phone, buyer_address, merchant_name, payment_method, months, markup_percent,
        deferred_total, monthly, contract_id)
      values (p_order, mn.id, items, sub, 0, 0, sub,
        case o.payment_method when 'installment' then 'installment_sale' else 'sale' end, o.currency,
        o.user_id, coalesce(nullif(o.recipient_name,''), prof.full_name), coalesce(nullif(o.phone,''), prof.phone),
        o.governorate || ' - ' || o.city || ' - ' || o.address, mn.nm, o.payment_method,
        case when o.payment_method = 'installment' then a.months end,
        case when o.payment_method = 'installment' then a.markup_percent_applied end,
        case when o.payment_method = 'installment' then share_def end,
        case when o.payment_method = 'installment' then share_mon end,
        c.id)
      on conflict (order_id, merchant_id) do nothing;
    if found then n := n + 1; end if;
  end loop;
  if n > 0 then
    perform _notify(o.user_id, 'صدرت فاتورتك', 'يمكنك عرضها وتنزيلها PDF من صفحة فواتيري', 'system', '/invoices');
  end if;
  return n;
end $$;
revoke execute on function _issue_invoices(uuid) from public, anon, authenticated;

-- Staff can still (re)issue the invoices of an order by hand; it never duplicates.
create or replace function issue_invoice(p_order uuid) returns int
language plpgsql security definer set search_path = public as $$
begin
  if not (is_admin() or has_permission('orders.update')) then raise exception 'not allowed'; end if;
  return _issue_invoices(p_order);
end $$;

-- Public check behind the QR code. Shows what proves the invoice is genuine and nothing personal.
create or replace function verify_invoice(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare i invoices; nm text;
begin
  if p_code is null or length(p_code) not between 8 and 40 then return jsonb_build_object('valid', false); end if;
  select * into i from invoices where verify_code = upper(trim(p_code));
  if not found then return jsonb_build_object('valid', false); end if;
  nm := coalesce(i.buyer_name, '');
  return jsonb_build_object(
    'valid', i.status = 'issued', 'status', i.status, 'invoice_number', i.invoice_number, 'issued_at', i.issued_at,
    'kind', i.kind, 'currency', i.currency, 'total', i.total, 'deferred_total', i.deferred_total, 'months', i.months,
    'merchant_name', i.merchant_name,
    'buyer_masked', case when length(nm) > 0 then left(nm, 1) || repeat('*', greatest(length(nm) - 1, 2)) else null end);
end $$;
revoke execute on function verify_invoice(text) from public;
grant execute on function verify_invoice(text) to anon, authenticated;

-- ═════════ Re-created functions (currency aware) ═════════
create or replace function financing_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid; m numeric; g guarantee_types; is_emp boolean := new.employee_id is not null;
begin
  if is_emp then
    select user_id into uid from employees where id = new.employee_id;
    new.applicant_user_id := uid;
  else
    uid := new.applicant_user_id;
  end if;
  if uid is null then raise exception 'applicant is required'; end if;

  if new.guarantee_type_id is null then raise exception 'guarantee type is required'; end if;
  select * into g from guarantee_types where id = new.guarantee_type_id and active;
  if not found then raise exception 'invalid guarantee type'; end if;
  if (is_emp and g.audience = 'customer') or (not is_emp and g.audience = 'employee') then
    raise exception 'this guarantee type is not available for this applicant';
  end if;
  if g.requires_guarantor and (coalesce(trim(new.guarantor_name), '') = ''
                               or coalesce(trim(new.guarantor_phone), '') = '') then
    raise exception 'guarantor details are required for this guarantee type';
  end if;

  if new.branch_id is null then raise exception 'branch is required'; end if;
  if not exists (select 1 from branches where id = new.branch_id and active) then raise exception 'invalid branch'; end if;

  if not is_emp then            -- a customer has no employer: skip the company step
    new.review_stage := 'admin';
    new.status := 'awaiting_identity';
  end if;

  m := _markup_for(uid);
  new.markup_percent_applied := m;
  new.currency := coalesce(new.currency, 'YER');
  new.deferred_price := _round_money(new.cash_price * (1 + m / 100), new.currency);
  new.monthly_installment := _round_money(new.deferred_price / new.months, new.currency);
  return new;
end $$;

create or replace function place_order(
  p_items jsonb,                      -- [{"product_id": "...", "quantity": 2}, ...]
  p_payment text,                     -- 'cash_on_delivery' | 'installment'
  p_recipient text, p_phone text,
  p_governorate text, p_city text, p_address text, p_notes text default null,
  p_months int default null,
  p_guarantee_type_id int default null,
  p_guarantee_details jsonb default '{}'::jsonb,
  p_guarantor_name text default null, p_guarantor_phone text default null, p_guarantor_id_number text default null,
  p_branch_id uuid default null,
  p_currency text default 'YER'          -- 'YER' | 'SAR' | 'USD': the currency the buyer pays / installs in
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  oid uuid;
  emp employees;
  v_sub numeric(14,2) := 0;
  v_lines jsonb;
  v_n int;
  r record;
  unit numeric(14,2);
  cur text := upper(coalesce(nullif(trim(p_currency),''), 'YER'));
  base numeric;
begin
  if cur not in ('YER','SAR','USD') then raise exception 'unsupported currency'; end if;
  if uid is null then raise exception 'not authenticated'; end if;
  if p_payment not in ('cash_on_delivery','installment') then raise exception 'invalid payment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'cart must contain 1 to 50 lines';
  end if;
  if length(trim(coalesce(p_recipient,''))) < 2 or length(trim(coalesce(p_phone,''))) < 7
     or length(trim(coalesce(p_governorate,''))) < 2 or length(trim(coalesce(p_city,''))) < 2
     or length(trim(coalesce(p_address,''))) < 3 then
    raise exception 'delivery data is incomplete';
  end if;
  if p_payment = 'installment' and p_months is null then raise exception 'installment months are required'; end if;

  -- Lines: validate shape, merge duplicates, lock product rows in a stable order (no deadlocks).
  select jsonb_agg(jsonb_build_object('p', pid, 'q', qty)) into v_lines from (
    select (x->>'product_id')::uuid as pid, sum((x->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) x group by 1) g;
  select count(*) into v_n from jsonb_to_recordset(v_lines) as l(p uuid, q int);
  if exists (select 1 from jsonb_to_recordset(v_lines) as l(p uuid, q int) where q < 1 or q > 100) then
    raise exception 'invalid quantity';
  end if;
  perform 1 from products where id in (select p from jsonb_to_recordset(v_lines) as l(p uuid, q int))
    order by id for update;

  insert into orders(user_id, payment_method, status, recipient_name, phone, governorate, city, address, notes,
                     subtotal, discount, shipping, total, currency)
    values (uid, p_payment, case p_payment when 'installment' then 'under_review' else 'new' end,
            trim(p_recipient), trim(p_phone), trim(p_governorate), trim(p_city), trim(p_address), p_notes, 0, 0, 0, 0, cur)
    returning id into oid;                       -- trg_require_active_account runs here

  for r in
    select l.p as product_id, l.q as qty, p.name, p.cash_price, p.discount_percent, p.stock, p.active, p.currency as pcur,
           s.merchant_id, m.status as mstatus
      from jsonb_to_recordset(v_lines) as l(p uuid, q int)
      left join products p on p.id = l.p
      left join stores s on s.id = p.store_id
      left join merchants m on m.id = s.merchant_id
     order by l.p
  loop
    if r.name is null or not r.active then raise exception 'product not available: %', r.product_id; end if;
    if r.mstatus is distinct from 'active' then raise exception 'merchant is not active for product: %', r.name; end if;
    if r.stock < r.qty then raise exception 'insufficient stock: %', r.name; end if;
    base := _round_money(r.cash_price * (1 - r.discount_percent / 100.0), r.pcur);   -- price in the product's own currency
    unit := _round_money(_fx_convert(base, r.pcur, cur), cur);                      -- price in the buyer's currency
    update products set stock = stock - r.qty where id = r.product_id;
    insert into order_items(order_id, product_id, merchant_id, quantity, unit_price, installment_months,
                            orig_currency, orig_unit_price, fx_rate)
      values (oid, r.product_id, r.merchant_id, r.qty, unit,
              case p_payment when 'installment' then p_months end,
              r.pcur, base, _fx_convert(1, r.pcur, cur));   -- commission row via trigger
    v_sub := v_sub + unit * r.qty;
  end loop;

  update orders set subtotal = v_sub, total = v_sub where id = oid;
  insert into order_status_history(order_id, status, changed_by, note)
    values (oid, case p_payment when 'installment' then 'under_review' else 'new' end, uid, 'order placed');

  if p_payment = 'installment' then
    select * into emp from employees where user_id = uid;
    -- financing_before_insert (0005) validates guarantee/branch/audience and fixes the price and markup.
    insert into financing_applications(employee_id, applicant_user_id, company_id, order_id, cash_price, months,
        guarantee_type_id, guarantor_name, guarantor_phone, guarantor_id_number, branch_id, currency)
      values (emp.id, uid, emp.company_id, oid, v_sub, p_months,
        p_guarantee_type_id, nullif(trim(p_guarantor_name),''), nullif(trim(p_guarantor_phone),''),
        nullif(trim(p_guarantor_id_number),''), p_branch_id, cur);
    insert into financing_guarantee_details(application_id, details)
      select a.id, coalesce(p_guarantee_details, '{}'::jsonb) from financing_applications a where a.order_id = oid;
  end if;

  if p_payment <> 'installment' then perform _issue_invoices(oid); end if;   -- installment invoices are issued on approval

  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'order_placed', 'order', oid::text,
            jsonb_build_object('payment', p_payment, 'total', v_sub, 'months', p_months, 'currency', cur));
  return oid;
end $$;

create or replace function decide_application(p_app uuid, p_approve boolean, p_note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare a financing_applications; e employees; cid uuid; n int; monthly numeric; amt numeric; idv text;
begin
  if not (is_admin() or has_permission('financing.review')) then raise exception 'not allowed'; end if;
  select * into a from financing_applications where id = p_app for update;
  if not found then raise exception 'application not found'; end if;
  if a.review_stage <> 'admin' or a.status in ('approved','rejected','completed') then raise exception 'application is not waiting for the platform'; end if;
  if not p_approve and coalesce(trim(p_note),'') = '' then raise exception 'a reason is required to reject'; end if;

  if not p_approve then
    update financing_applications set status = 'rejected', rejection_reason = p_note, admin_note = p_note,
      admin_decided_by = auth.uid(), admin_decided_at = now() where id = p_app;
    if a.order_id is not null then perform _cancel_order(a.order_id, 'application rejected'); end if;
    insert into audit_logs(actor_id, action, entity, entity_id, details)
      values (auth.uid(), 'application_rejected', 'financing_application', p_app::text, jsonb_build_object('note', p_note));
    perform _notify(a.applicant_user_id, 'تم رفض طلب التقسيط', coalesce(p_note,''), 'installment');
    return null;
  end if;

  select identity_status into idv from user_profiles where id = a.applicant_user_id;
  if idv is distinct from 'verified' then raise exception 'the applicant identity is not verified yet'; end if;
  if a.employee_id is not null then
    select * into e from employees where id = a.employee_id for update;
    if e.eligibility <> 'eligible' then raise exception 'the employee is not eligible'; end if;
    if e.used_limit + _fx_convert(a.deferred_price, a.currency, 'YER') > e.installment_limit then raise exception 'installment limit exceeded'; end if;
    update employees set used_limit = used_limit + _fx_convert(a.deferred_price, a.currency, 'YER') where id = e.id;
  end if;

  insert into contracts(application_id, status, contract_number, start_date)
    values (p_app, 'active', 'CON-' || nextval('contract_number_seq'), current_date) returning id into cid;
  monthly := a.monthly_installment;
  for n in 1..a.months loop
    amt := case when n = a.months then a.deferred_price - monthly * (a.months - 1) else monthly end;
    insert into installments(contract_id, number, due_date, amount, status)
      values (cid, n, current_date + 30 * n, amt, case when n = 1 then 'due' else 'upcoming' end);
  end loop;
  update financing_applications set status = 'approved', admin_note = p_note,
    admin_decided_by = auth.uid(), admin_decided_at = now() where id = p_app;
  if a.order_id is not null then
    update orders set status = 'approved' where id = a.order_id and status in ('new','under_review','awaiting_payment');
    insert into order_status_history(order_id, status, changed_by, note) values (a.order_id, 'approved', auth.uid(), 'financing approved');
  end if;
  if a.order_id is not null then perform _issue_invoices(a.order_id); end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'application_approved', 'financing_application', p_app::text, jsonb_build_object('contract', cid));
  perform _notify(a.applicant_user_id, 'تمت الموافقة على طلب التقسيط', 'تم إنشاء عقدك وجدول الأقساط وفاتورتك', 'installment');
  return cid;
end $$;

create or replace function record_payment(p_installment uuid, p_amount numeric, p_method text default 'cash') returns uuid
language plpgsql security definer set search_path = public as $$
declare i installments; k contracts; a financing_applications; pid uuid; left_n int;
begin
  if not (is_admin() or has_permission('payments.record')) then raise exception 'not allowed'; end if;
  select * into i from installments where id = p_installment for update;
  if not found then raise exception 'installment not found'; end if;
  if i.status = 'paid' then raise exception 'installment already paid'; end if;
  if p_amount is distinct from i.amount then raise exception 'amount must equal the installment amount (%)', i.amount; end if;
  select * into k from contracts where id = i.contract_id;
  select * into a from financing_applications where id = k.application_id;

  insert into payments(installment_id, amount, method, recorded_by, contract_id, order_id, payment_number, status)
    values (i.id, p_amount, nullif(trim(p_method),''), auth.uid(), k.id, a.order_id,
            'PAY-' || upper(substr(gen_random_uuid()::text, 1, 8)), 'succeeded') returning id into pid;
  update installments set status = 'paid' where id = i.id;
  if a.employee_id is not null then
    update employees set used_limit = greatest(0, used_limit - _fx_convert(p_amount, a.currency, 'YER')) where id = a.employee_id;
  end if;
  select count(*) into left_n from installments where contract_id = k.id and status <> 'paid';
  if left_n = 0 then
    update contracts set status = 'completed' where id = k.id;
    update financing_applications set status = 'completed' where id = a.id;
    perform _notify(a.applicant_user_id, 'اكتمل سداد العقد', 'شكراً لالتزامك', 'payment');
  else
    update installments set status = 'due' where id = (select id from installments where contract_id = k.id and status = 'upcoming' order by number limit 1)
      and not exists (select 1 from installments where contract_id = k.id and status in ('due','late','overdue'));
    perform _notify(a.applicant_user_id, 'تم تسجيل دفعة', 'القسط رقم ' || i.number || ' بمبلغ ' || p_amount || ' ' || a.currency, 'payment');
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'payment_recorded', 'installment', i.id::text, jsonb_build_object('amount', p_amount, 'method', p_method));
  return pid;
end $$;

create or replace function set_commission_settlement(p_commission uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare c commissions; sid uuid;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('processing','in_progress','paid') then raise exception 'invalid status'; end if;
  select * into c from commissions where id = p_commission for update;
  if not found then raise exception 'commission not found'; end if;
  if c.settlement_id is null then
    insert into settlements(merchant_id, gross, commission, net, status, created_by, currency)
      values (c.merchant_id, c.gross, c.commission, c.net, p_status, auth.uid(), c.currency) returning id into sid;
    update commissions set settlement_id = sid where id = c.id;
  else
    update settlements set status = p_status, paid_at = case when p_status = 'paid' then now() end where id = c.settlement_id;
  end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'settlement_status', 'commission', p_commission::text, jsonb_build_object('status', p_status));
end $$;

-- ═════════ Grants for the re-created checkout ═════════
drop function if exists place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid);
revoke execute on function place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid,text) from public, anon;
grant execute on function place_order(jsonb,text,text,text,text,text,text,text,int,int,jsonb,text,text,text,uuid,text) to authenticated;
revoke execute on function decide_application(uuid,boolean,text), record_payment(uuid,numeric,text),
  set_commission_settlement(uuid,text) from public, anon;
grant execute on function decide_application(uuid,boolean,text), record_payment(uuid,numeric,text),
  set_commission_settlement(uuid,text) to authenticated;
