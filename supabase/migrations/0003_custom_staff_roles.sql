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
