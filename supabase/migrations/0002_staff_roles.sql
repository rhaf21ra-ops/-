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
