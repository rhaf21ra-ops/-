-- المرحلة 4+5: العمليات والأمان - قسطها v2
-- 14 مراحل الطلب، 15 لوحة متقدمة، 11 أدوار، 17 بحث، 21 احتيال، 16 سجل، 22 إعدادات

-- 14) مراحل الطلب Timeline (موجود order_status_history، نضيف وضوح)
create table if not exists order_timeline (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  title text not null,
  description text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);
create index if not exists idx_timeline_order on order_timeline(order_id);

-- 21) مكافحة الاحتيال
create table if not exists fraud_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  type text not null check (type in ('multiple_accounts','coupon_abuse','repeated_orders','unusual_activity')),
  severity text not null check (severity in ('low','medium','high')),
  details jsonb,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz default now()
);

-- 11) أدوار مخصصة (توسيع roles الحالي)
create table if not exists custom_roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  display_name text not null,
  permissions jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 22) إعدادات النظام المركزية
create table if not exists system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);
insert into system_settings (key, value, description) values
('installment_rates', '{"default":15, "3":5, "6":8, "12":15}'::jsonb, 'نسب التقسيط الافتراضية'),
('loyalty_rate', '{"earn_per_1000":10, "redeem_100_points":1000}'::jsonb, 'إعدادات النقاط'),
('referral_reward', '{"referrer":100, "referred":50}'::jsonb, 'مكافآت الإحالة'),
('fraud_thresholds', '{"max_orders_per_day":5, "max_accounts_per_ip":3}'::jsonb, 'عتبات الاحتيال')
on conflict (key) do nothing;

-- 16) توسيع سجل العمليات (audit_logs موجود، نضيف تفاصيل)
alter table audit_logs add column if not exists old_data jsonb;
alter table audit_logs add column if not exists new_data jsonb;
alter table audit_logs add column if not exists ip_address text;

-- RLS
alter table order_timeline enable row level security;
alter table fraud_alerts enable row level security;
alter table custom_roles enable row level security;
alter table system_settings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname='admin_timeline' and tablename='order_timeline') then
    create policy admin_timeline on order_timeline for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='own_timeline' and tablename='order_timeline') then
    create policy own_timeline on order_timeline for select using (exists (select 1 from orders o where o.id=order_id and o.user_id=auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where policyname='admin_fraud' and tablename='fraud_alerts') then
    create policy admin_fraud on fraud_alerts for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='admin_settings' and tablename='system_settings') then
    create policy admin_settings on system_settings for all using (is_admin()) with check (is_admin());
  end if;
end $$;
