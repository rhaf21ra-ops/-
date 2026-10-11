-- قسطها: تعيين المالك (مدير المنصة). نفّذه مرة واحدة في Supabase > SQL Editor بعد أن تسجّل حسابك من الموقع.
-- 1) سجّل حساباً عادياً من صفحة /register ببريدك (يمكنك تخطي تصوير الهوية، سيُفعَّل الحساب هنا).
-- 2) بدّل البريد أدناه ببريدك ثم نفّذ.
do $$
declare
  owner_email text := 'ضع-بريدك-هنا@example.com';   -- <<< غيّر هذا
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(owner_email);
  if uid is null then raise exception 'لا يوجد مستخدم بهذا البريد. سجّل من الموقع أولاً'; end if;
  insert into user_roles(user_id, role_id) select uid, id from roles where name = 'admin' on conflict do nothing;
  update user_profiles set status = 'active', identity_status = 'verified' where id = uid;
  insert into audit_logs(actor_id, action, entity, entity_id, details)
    values (uid, 'owner_assigned', 'user', uid::text, '{}'::jsonb);
  raise notice 'تم: % أصبح مدير المنصة', owner_email;
end $$;
