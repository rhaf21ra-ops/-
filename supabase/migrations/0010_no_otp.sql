-- 0010: WhatsApp OTP is not available. Identity review is the only gate before an account becomes active.
-- Removes the phone_verified requirement from: uploading ID photos, submitting, and approving.
-- phone_verified stays as a column (always false) so nothing else breaks. Apply after 0009.

-- Upload policy: own folder only, only while an upload is allowed.
drop policy if exists "identity upload own folder" on storage.objects;
create policy "identity upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = auth.uid()::text and exists (
    select 1 from user_profiles p where p.id = auth.uid() and p.identity_status in ('none','rejected','needs_changes')));

create or replace function submit_identity(doc text, files jsonb, consent boolean, meta jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p user_profiles; err text; sid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into p from user_profiles where id = uid;
  if not found then raise exception 'profile not found'; end if;
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
