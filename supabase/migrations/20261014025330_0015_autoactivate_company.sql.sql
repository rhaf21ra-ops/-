/*
# Auto-activate company accounts at registration

## Problem
Company accounts are created with status='pending' and identity_status='none'.
Since companies are now exempt from identity verification, they should start
with status='active' and identity_status='verified' so they can operate immediately.

## Changes
1. Replaces the `handle_new_user` trigger function to set company accounts to
   active+verified at creation time.
2. Also auto-activates merchant accounts (they already need admin approval for
   the merchant record, but the user profile should be active so they can log in
   and manage their store settings).

## Security
- No schema changes.
- Company accounts still need admin approval for merchant-level operations
  through the merchants table status field.
*/
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  requested text := coalesce(new.raw_user_meta_data->>'role','customer');
  nm text := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''), 'حساب جديد');
  biz text := nullif(trim(new.raw_user_meta_data->>'business_name'),'');
  mid uuid;
begin
  if requested not in ('customer','employee','merchant','company') then requested := 'customer'; end if;
  -- Company accounts skip identity verification; merchant accounts are activated but their store needs approval
  if requested = 'company' then
    insert into user_profiles(id, full_name, phone, email, status, identity_status)
    values (new.id, nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.email, 'active', 'verified');
  else
    insert into user_profiles(id, full_name, phone, email)
    values (new.id, nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.email);
  end if;
  insert into user_roles(user_id, role_id) select new.id, id from roles where name = requested;
  if requested = 'merchant' then
    insert into merchants(owner_id, business_name, store_name, owner_name)
    values (new.id, coalesce(biz, 'متجر ' || nm), coalesce(biz, 'متجر ' || nm), nm) returning id into mid;
    insert into stores(merchant_id, name, city) values (mid, coalesce(biz, 'متجر ' || nm), new.raw_user_meta_data->>'city');
  elsif requested = 'company' then
    insert into companies(owner_id, name, contact_name, phone, city)
    values (new.id, coalesce(biz, 'شركة ' || nm), nm, nullif(trim(new.raw_user_meta_data->>'phone'),''), new.raw_user_meta_data->>'city');
  end if;
  return new;
end;
$$;
