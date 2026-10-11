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
