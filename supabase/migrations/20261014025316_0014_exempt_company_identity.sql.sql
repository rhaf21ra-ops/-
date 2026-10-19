/*
# Exempt company accounts from identity verification

## Problem
The `require_active_account` trigger checks `p.identity_status <> 'verified'` for ALL
account types, including companies. Company accounts should not need identity
verification — they are legal entities, not individual shoppers.

## Changes
1. Replaces the `require_active_account` function to skip the identity check for
   users whose only role is `company`.
2. A user who has both `company` and another role (e.g. `customer`) still needs
   identity verification for orders placed as a customer.

## Security
- No new tables or columns.
- No RLS policy changes.
- The trigger still enforces `status = 'active'` for all users.
*/

CREATE OR REPLACE FUNCTION require_active_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  uid uuid;
  p user_profiles;
  is_company_only boolean;
begin
  if auth.uid() is null then return new; end if;  -- back office / service role
  if tg_table_name = 'orders' then uid := new.user_id; else uid := new.applicant_user_id; end if;
  if uid is null then return new; end if;
  select * into p from user_profiles where id = uid;
  if not found or p.status <> 'active' then
    raise exception 'account is not active';
  end if;
  -- Company accounts are exempt from identity verification
  select not exists (
    select 1 from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = uid and r.name <> 'company'
  ) and exists (
    select 1 from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = uid and r.name = 'company'
  ) into is_company_only;
  if is_company_only then
    return new;
  end if;
  if p.identity_status <> 'verified' then
    raise exception 'account is not active: identity verification must be approved first';
  end if;
  return new;
end;
$$;
