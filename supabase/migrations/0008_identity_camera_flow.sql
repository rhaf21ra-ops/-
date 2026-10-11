-- 0008: identity capture flow: national ID = 3 photos (front, back, selfie holding the ID),
-- passport = 2 photos (data page, selfie holding the passport). Photos are taken with the live camera.
-- Apply after 0007.

alter table identity_submissions add column capture_meta jsonb not null default '{}'::jsonb
  check (pg_column_size(capture_meta) < 4000);
-- capture_meta is reported BY THE CLIENT (method, timestamps). It helps the reviewer; it is not proof of camera origin.

create or replace function _identity_files_error(doc text, files jsonb, uid uuid) returns text
language plpgsql immutable as $$
declare k text; req text[];
begin
  req := case doc when 'national_id' then array['front','back','selfie_with_id']
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

drop function submit_identity(text, jsonb, boolean);
create or replace function submit_identity(doc text, files jsonb, consent boolean, meta jsonb default '{}'::jsonb) returns uuid
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
  if jsonb_typeof(coalesce(meta, '{}'::jsonb)) <> 'object' or pg_column_size(coalesce(meta, '{}'::jsonb)) >= 4000 then
    raise exception 'invalid capture metadata';
  end if;

  insert into identity_submissions(user_id, document_type, files, consent_at, capture_meta)
    values (uid, doc, files, now(), coalesce(meta, '{}'::jsonb)) returning id into sid;
  update user_profiles set identity_status = 'pending', identity_consent_at = now() where id = uid;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'identity_submitted', 'identity_submission', sid::text, jsonb_build_object('document_type', doc));
  return sid;
end $$;
revoke execute on function submit_identity(text, jsonb, boolean, jsonb) from public, anon;
grant execute on function submit_identity(text, jsonb, boolean, jsonb) to authenticated;
