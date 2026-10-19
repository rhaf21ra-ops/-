-- Make alwan7988@gmail.com the platform owner (admin)
DO $$
declare
  uid uuid := '058d0bdb-3be1-4ed1-b142-24f50db430ec';
begin
  -- Grant admin role
  INSERT INTO user_roles(user_id, role_id) SELECT uid, id FROM roles WHERE name = 'admin' ON CONFLICT DO NOTHING;
  
  -- Activate account and mark identity as verified
  UPDATE user_profiles SET status = 'active', identity_status = 'verified' WHERE id = uid;
  
  -- Confirm email in auth.users (in case it wasn't)
  UPDATE auth.users SET email_confirmed_at = now() WHERE id = uid AND email_confirmed_at IS NULL;
  
  -- Audit log
  INSERT INTO audit_logs(actor_id, action, entity, entity_id, details)
    VALUES (uid, 'owner_assigned', 'user', uid::text, '{}'::jsonb);
  
  RAISE NOTICE 'Done: alwan7988@gmail.com is now the platform admin';
END $$;
