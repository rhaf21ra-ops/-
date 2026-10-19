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
