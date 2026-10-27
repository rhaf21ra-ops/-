-- المرحلة 2: التجارة والولاء - قسطها v2
-- 7 حاسبة، 8 كوبونات، 9 نقاط، 18 إحالة، 19 مفضلة

-- 7) حاسبة التقسيط - خطط قابلة للتعديل
create table if not exists installment_plans_config (
  id uuid primary key default gen_random_uuid(),
  name text not null, -- 3 أشهر، 6 أشهر...
  months int not null check (months > 0),
  profit_rate numeric(5,2) not null default 0, -- نسبة الربح %
  fees numeric(10,2) not null default 0,
  is_active boolean not null default true,
  merchant_id uuid references merchants(id) on delete set null, -- null = عام
  created_at timestamptz default now()
);
insert into installment_plans_config (name, months, profit_rate) values
('3 أشهر',3,5),('6 أشهر',6,8),('9 أشهر',9,12),('12 شهراً',12,15),('18 شهراً',18,20),('24 شهراً',24,22)
on conflict do nothing;

-- 8) نظام الكوبونات المتكامل
create table if not exists coupons_ext (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(10,2) not null,
  min_purchase numeric(10,2) default 0,
  start_at timestamptz,
  end_at timestamptz,
  max_uses int,
  used_count int not null default 0,
  is_active boolean not null default true,
  merchant_id uuid references merchants(id) on delete set null, -- null = عام (الإدارة)
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create table if not exists coupon_products (coupon_id uuid references coupons_ext(id) on delete cascade, product_id uuid references products(id) on delete cascade, primary key(coupon_id,product_id));
create table if not exists coupon_usages (id uuid primary key default gen_random_uuid(), coupon_id uuid references coupons_ext(id), user_id uuid references auth.users(id), order_id uuid references orders(id), used_at timestamptz default now());

-- 9) نظام النقاط والولاء
create table if not exists loyalty_points (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0,
  total_earned int not null default 0,
  total_used int not null default 0,
  updated_at timestamptz default now()
);
create table if not exists points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('earn','use','expire')),
  amount int not null,
  reason text, -- التسجيل، شراء، إحالة...
  order_id uuid references orders(id),
  created_at timestamptz default now()
);
create index if not exists idx_points_user on points_transactions(user_id);

-- 18) نظام الإحالة
create table if not exists referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text unique not null,
  uses int not null default 0,
  created_at timestamptz default now()
);
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id),
  referred_id uuid not null references auth.users(id),
  reward_points int,
  created_at timestamptz default now()
);

-- 19) المفضلة ومقارنة (المفضلة موجودة، نضيف المقارنة)
create table if not exists product_comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_ids uuid[] not null,
  created_at timestamptz default now()
);

-- RLS
alter table installment_plans_config enable row level security;
alter table coupons_ext enable row level security;
alter table coupon_usages enable row level security;
alter table loyalty_points enable row level security;
alter table points_transactions enable row level security;
alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table product_comparisons enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname='public_plans' and tablename='installment_plans_config') then
    create policy public_plans on installment_plans_config for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname='admin_plans' and tablename='installment_plans_config') then
    create policy admin_plans on installment_plans_config for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='public_coupons' and tablename='coupons_ext') then
    create policy public_coupons on coupons_ext for select using (is_active and (end_at is null or end_at > now()));
  end if;
  if not exists (select 1 from pg_policies where policyname='own_points' and tablename='loyalty_points') then
    create policy own_points on loyalty_points for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
