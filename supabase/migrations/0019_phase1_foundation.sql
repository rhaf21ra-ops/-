-- المرحلة 1: الأساس التكاملي - قسطها v2
-- الأنظمة: 1 API Engine, 2 مواقع المستخدمين, 3 بريد الفروع, 4-6 إرسال وتسجيل البريد
-- آمن: IF NOT EXISTS + لا يحذف بيانات موجودة

-- ═══════════════════════════════════════════════════════════════
-- 1) API & Integrations Engine
-- ═══════════════════════════════════════════════════════════════
create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_name text not null,
  service_type text not null check (service_type in ('shipping','payment','sms','maps','identity','bank','email','other')),
  api_url text not null,
  api_key_encrypted text,
  secret_encrypted text,
  headers jsonb not null default '{}'::jsonb,
  params jsonb not null default '{}'::jsonb,
  method text not null default 'POST' check (method in ('GET','POST','PUT','DELETE','PATCH')),
  body_template jsonb,
  description text,
  is_active boolean not null default true,
  last_test_status text check (last_test_status in ('success','failed')),
  last_test_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists integration_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references integrations(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  request jsonb,
  response jsonb,
  status text not null check (status in ('success','failed','pending')),
  error text,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists idx_integration_logs_integration on integration_logs(integration_id);
create index if not exists idx_integration_logs_order on integration_logs(order_id);

-- ═══════════════════════════════════════════════════════════════
-- 2) نظام مواقع المستخدمين (العملاء فقط)
-- ═══════════════════════════════════════════════════════════════
create table if not exists user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (label in ('المنزل','العمل','موقع آخر') or length(label) > 0),
  label_custom text,
  address_text text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_addresses_user on user_addresses(user_id);

-- نسخة مجمدة من الموقع مع كل طلب (لا تتغير بتغيير العنوان لاحقاً)
create table if not exists order_locations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete cascade,
  user_address_id uuid references user_addresses(id) on delete set null,
  label text,
  address_text text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  created_at timestamptz not null default now()
);
create index if not exists idx_order_locations_order on order_locations(order_id);

-- ═══════════════════════════════════════════════════════════════
-- 3) بريد الفروع
-- ═══════════════════════════════════════════════════════════════
alter table branches add column if not exists branch_email text;
-- تحقق بسيط للبريد (اختياري)
-- لا نضع check صارم حتى لا نكسر بيانات قديمة

create table if not exists branch_email_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  branch_email text not null,
  status text not null check (status in ('sent','failed','pending','retry')),
  attempts int not null default 0,
  last_error text,
  email_subject text,
  email_body text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_branch_email_logs_order on branch_email_logs(order_id);
create index if not exists idx_branch_email_logs_branch on branch_email_logs(branch_id);
create index if not exists idx_branch_email_logs_status on branch_email_logs(status);

-- ═══════════════════════════════════════════════════════════════
-- RLS للجداول الجديدة
-- ═══════════════════════════════════════════════════════════════
alter table integrations enable row level security;
alter table integration_logs enable row level security;
alter table user_addresses enable row level security;
alter table order_locations enable row level security;
alter table branch_email_logs enable row level security;

-- Integrations: المدير فقط
do $$ begin
  if not exists (select 1 from pg_policies where policyname='admin_integrations' and tablename='integrations') then
    create policy admin_integrations on integrations for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='admin_integration_logs' and tablename='integration_logs') then
    create policy admin_integration_logs on integration_logs for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='admin_branch_email_logs' and tablename='branch_email_logs') then
    create policy admin_branch_email_logs on branch_email_logs for all using (is_admin()) with check (is_admin());
  end if;
end $$;

-- user_addresses: كل مستخدم يرى عناوينه فقط
do $$ begin
  if not exists (select 1 from pg_policies where policyname='own_addresses' and tablename='user_addresses') then
    create policy own_addresses on user_addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- order_locations: يراها صاحب الطلب والمدير
do $$ begin
  if not exists (select 1 from pg_policies where policyname='own_order_locations' and tablename='order_locations') then
    create policy own_order_locations on order_locations for select using (
      exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()) or is_admin()
    );
  end if;
  if not exists (select 1 from pg_policies where policyname='insert_order_locations' and tablename='order_locations') then
    create policy insert_order_locations on order_locations for insert with check (
      exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()) or is_admin()
    );
  end if;
end $$;

-- تحديث updated_at تلقائياً
create or replace function update_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_integrations_updated on integrations;
create trigger trg_integrations_updated before update on integrations for each row execute function update_updated_at();
drop trigger if exists trg_user_addresses_updated on user_addresses;
create trigger trg_user_addresses_updated before update on user_addresses for each row execute function update_updated_at();

-- بيانات أولية: مثال تكامل بريد (للاختبار)
insert into integrations (name, service_name, service_type, api_url, method, description, is_active)
values ('بريد الفروع - تجريبي', 'Branch Email', 'email', 'https://api.resend.com/emails', 'POST', 'إرسال تفاصيل طلب التقسيط لبريد الفرع المختار - يُفعل بعد إعداد API Key', false)
on conflict do nothing;
