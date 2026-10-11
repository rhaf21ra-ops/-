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
