-- المرحلة 3: المحتوى والنمو - قسطها v2
-- 10 إعلانات، 12 مشاركة (موجود)، 13 إشعارات، 20 مستندات

-- 10) الإعلانات
create table if not exists advertisements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  link_url text,
  position text not null check (position in ('homepage','shop','category','checkout','popup')),
  priority int not null default 0,
  is_active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  views int not null default 0,
  clicks int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create index if not exists idx_ads_position on advertisements(position, is_active, priority);

-- 13) توسيع الإشعارات (موجودة، نضيف أنواع)
-- notifications موجودة، نضيف حقل channel
alter table notifications add column if not exists channel text default 'in_app' check (channel in ('in_app','email','sms','whatsapp'));
alter table notifications add column if not exists is_read boolean default false;

-- 20) مركز المستندات
create table if not exists customer_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  doc_type text not null check (doc_type in ('identity','guarantee','other')),
  file_url text not null,
  file_name text,
  status text not null default 'uploaded' check (status in ('uploaded','review','approved','rejected','needs_resubmit')),
  reviewer_note text,
  created_at timestamptz default now()
);
create index if not exists idx_docs_user on customer_documents(user_id);
create index if not exists idx_docs_order on customer_documents(order_id);

-- RLS
alter table advertisements enable row level security;
alter table customer_documents enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='public_ads' and tablename='advertisements') then
    create policy public_ads on advertisements for select using (is_active and (start_at is null or start_at <= now()) and (end_at is null or end_at >= now()));
  end if;
  if not exists (select 1 from pg_policies where policyname='admin_ads' and tablename='advertisements') then
    create policy admin_ads on advertisements for all using (is_admin()) with check (is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname='own_docs' and tablename='customer_documents') then
    create policy own_docs on customer_documents for all using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());
  end if;
end $$;
