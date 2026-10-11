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
