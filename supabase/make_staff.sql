-- قسطها: منح موظف صلاحية مراجعة الهوية (أو أي دور موظف). نفّذه كمالك في SQL Editor.
-- الأدوار الجاهزة: staff_verification (مراجعة الهوية), staff_merchants, staff_financing, staff_orders, staff_support
-- ولإنشاء دور مخصص: select create_custom_role('slug','الاسم', array['identity.review','orders.view']);
do $$
declare staff_email text := 'بريد-الموظف@example.com';  -- <<< غيّر هذا
        uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(staff_email);
  if uid is null then raise exception 'لا يوجد مستخدم بهذا البريد'; end if;
  insert into user_roles(user_id, role_id) select uid, id from roles where name = 'staff_verification' on conflict do nothing;
  update user_profiles set status = 'active', identity_status = 'verified' where id = uid;
  raise notice 'تم منح % دور مراجعة الهوية', staff_email;
end $$;
