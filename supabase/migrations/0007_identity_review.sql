-- 0007: mandatory identity verification with human review.
-- Every account: OTP -> upload ID -> a reviewer with `identity.review` approves (account becomes active),
-- rejects (with a reason) or asks for changes (with a reason). Apply after 0006.

-- ═════════ 1. States ═════════
alter table user_profiles drop constraint user_profiles_identity_status_check;
alter table user_profiles add constraint user_profiles_identity_status_check
  check (identity_status in ('none','pending','verified','rejected','needs_changes'));

create table identity_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('national_id','passport')),
  files jsonb not null,                                   -- {kind: storage path in private bucket identity-docs}
  consent_at timestamptz not null,
  consent_version text not null default 'v1',
  status text not null default 'submitted' check (status in ('submitted','approved','rejected','needs_changes')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  check (status in ('submitted','approved') or length(trim(coalesce(decision_reason, ''))) >= 3)
);
create unique index one_open_identity on identity_submissions(user_id) where status = 'submitted';
alter table identity_submissions enable row level security;
create policy admin_all on identity_submissions for all using (is_admin()) with check (is_admin());
create policy own_identity on identity_submissions for select using (user_id = auth.uid());
create policy reviewer_identity on identity_submissions for select using (has_permission('identity.review'));
-- No client INSERT/UPDATE/DELETE policies: everything goes through the functions below.

-- ═════════ 2. Profiles: users and staff can no longer write status columns directly ═════════
revoke update on user_profiles from authenticated, anon;
grant update (full_name, governorate, city, address, email, avatar_url) on user_profiles to authenticated;
drop policy staff_identity_upd on user_profiles;
-- The old guard trigger pinned these columns for everyone except reviewers; column privileges now enforce it
-- for direct writes, and it would also block the SECURITY DEFINER functions below, so it is removed.
drop trigger trg_guard_profile on user_profiles;
drop function guard_profile();

-- ═════════ 3. Private bucket for ID documents ═════════
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('identity-docs', 'identity-docs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- Owner uploads only into <own uid>/..., only while an upload is allowed. No update/delete: files can't be swapped after submit.
create policy "identity upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = auth.uid()::text and exists (
    select 1 from user_profiles p where p.id = auth.uid() and p.phone_verified
      and p.identity_status in ('none','rejected','needs_changes')));
create policy "identity read own" on storage.objects for select to authenticated
  using (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = auth.uid()::text);
-- Reviewers get NO storage SELECT policy. They obtain short-lived signed URLs through the Edge Function
-- `identity-file-url`, which first calls request_identity_file_access() so every access is audited.

-- ═════════ 4. Functions ═════════
create or replace function _identity_files_error(doc text, files jsonb, uid uuid) returns text
language plpgsql immutable as $$
declare k text; req text[];
begin
  req := case doc when 'national_id' then array['front','back','card_with_face','selfie']
                  when 'passport'    then array['passport_photo','selfie_with_passport'] end;
  if req is null then return 'invalid document type'; end if;
  if jsonb_typeof(files) <> 'object' then return 'files must be an object'; end if;
  foreach k in array req loop
    if coalesce(files->>k, '') = '' then return 'missing file: ' || k; end if;
    if files->>k not like uid::text || '/%' then return 'invalid file path: ' || k; end if;
  end loop;
  if exists (select 1 from jsonb_object_keys(files) key where key <> all(req)) then return 'unexpected file'; end if;
  return null;
end $$;

create or replace function submit_identity(doc text, files jsonb, consent boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p user_profiles; err text; sid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into p from user_profiles where id = uid;
  if not found then raise exception 'profile not found'; end if;
  if not p.phone_verified then raise exception 'phone number must be verified first (OTP)'; end if;
  if p.identity_status in ('pending','verified') then raise exception 'identity already submitted or verified'; end if;
  if not coalesce(consent, false) then raise exception 'consent to identity data processing is required'; end if;
  if (select count(*) from identity_submissions where user_id = uid) >= 5 then
    raise exception 'too many submissions, contact support';
  end if;
  err := _identity_files_error(doc, files, uid);
  if err is not null then raise exception '%', err; end if;

  insert into identity_submissions(user_id, document_type, files, consent_at)
    values (uid, doc, files, now()) returning id into sid;
  update user_profiles set identity_status = 'pending', identity_consent_at = now() where id = uid;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'identity_submitted', 'identity_submission', sid::text, jsonb_build_object('document_type', doc));
  return sid;
end $$;

-- decision: approved | rejected | needs_changes. Returns the user's new identity_status.
create or replace function review_identity(sid uuid, decision text, reason text) returns text
language plpgsql security definer set search_path = public as $$
declare s identity_submissions; new_status text; clean text := nullif(trim(coalesce(reason, '')), '');
begin
  if not has_permission('identity.review') then raise exception 'not allowed'; end if;
  if decision not in ('approved','rejected','needs_changes') then raise exception 'invalid decision'; end if;
  select * into s from identity_submissions where id = sid for update;
  if not found then raise exception 'submission not found'; end if;
  if s.status <> 'submitted' then raise exception 'submission already reviewed'; end if;
  if s.user_id = auth.uid() then raise exception 'you cannot review your own identity'; end if;
  if decision <> 'approved' and (clean is null or length(clean) < 3) then raise exception 'a reason is required'; end if;
  if decision = 'approved' and not (select phone_verified from user_profiles where id = s.user_id) then
    raise exception 'phone number is not verified';
  end if;

  update identity_submissions set status = decision, reviewer_id = auth.uid(), reviewed_at = now(),
         decision_reason = clean where id = sid;
  new_status := case decision when 'approved' then 'verified' when 'rejected' then 'rejected' else 'needs_changes' end;
  update user_profiles set identity_status = new_status,
         status = case when decision = 'approved' and status = 'pending' then 'active' else status end
   where id = s.user_id;

  insert into notifications(user_id, title, body, type, link) values (s.user_id,
    case decision when 'approved' then 'تم تفعيل حسابك'
                  when 'rejected' then 'تم رفض التحقق من الهوية'
                  else 'مطلوب تعديل بيانات الهوية' end,
    case decision when 'approved' then 'تم التحقق من هويتك وتفعيل حسابك، يمكنك الآن الشراء.'
                  else clean end,
    'identity', '/profile');
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'identity_' || decision, 'identity_submission', sid::text,
            jsonb_build_object('user_id', s.user_id, 'reason', clean));
  return new_status;
end $$;

-- Called by the Edge Function before it signs URLs. Logs the access, returns the file paths.
create or replace function request_identity_file_access(sid uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s identity_submissions;
begin
  if not has_permission('identity.review') then raise exception 'not allowed'; end if;
  select * into s from identity_submissions where id = sid;
  if not found then raise exception 'submission not found'; end if;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'identity_file_access', 'identity_submission', sid::text, jsonb_build_object('user_id', s.user_id));
  return s.files;
end $$;

revoke execute on function submit_identity(text,jsonb,boolean), review_identity(uuid,text,text),
  request_identity_file_access(uuid), _identity_files_error(text,jsonb,uuid) from public, anon;
grant execute on function submit_identity(text,jsonb,boolean), review_identity(uuid,text,text),
  request_identity_file_access(uuid) to authenticated;

-- ═════════ 5. No buying or financing before the account is active and verified ═════════
create or replace function require_active_account() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid; p user_profiles;
begin
  if auth.uid() is null then return new; end if;            -- back office / service role
  if tg_table_name = 'orders' then uid := new.user_id; else uid := new.applicant_user_id; end if;
  if uid is null then return new; end if;
  select * into p from user_profiles where id = uid;
  if not found or p.status <> 'active' or p.identity_status <> 'verified' then
    raise exception 'account is not active: identity verification must be approved first';
  end if;
  return new;
end $$;
create trigger trg_require_active_account before insert on orders
  for each row execute function require_active_account();
create trigger trg_require_active_account before insert on financing_applications
  for each row execute function require_active_account();
