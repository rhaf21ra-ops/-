/*
# Support tickets: add columns, replies table, RLS, and admin permission

## Changes

1. Adds columns to support_tickets:
   - ticket_number: unique human-readable ticket number
   - category: problem type (login, identity, account, company, employees, password, other)
   - phone: optional phone number
   - email: optional email
   - full_name: sender name
   - assigned_to: staff member assigned
   - updated_at: last activity timestamp

2. Creates support_ticket_replies table for staff-user conversation thread.

3. Enables RLS on both tables with proper policies:
   - Users can CRUD their own tickets
   - Users can read replies on their own tickets
   - Staff with support.manage can read/update all tickets
   - Staff with support.manage can insert replies

4. Grants support.manage permission to admin role in DB.

5. Creates indexes for performance.
*/

-- Add columns to support_tickets
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text UNIQUE DEFAULT ('TKT-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))),
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Fix any existing rows that have null ticket_number
UPDATE support_tickets SET ticket_number = 'TKT-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)) WHERE ticket_number IS NULL;

-- Ticket replies table
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  message text NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_replies_ticket ON support_ticket_replies(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "select_own_tickets" ON support_tickets;
DROP POLICY IF EXISTS "insert_own_tickets" ON support_tickets;
DROP POLICY IF EXISTS "update_own_tickets" ON support_tickets;
DROP POLICY IF EXISTS "staff_select_tickets" ON support_tickets;
DROP POLICY IF EXISTS "staff_update_tickets" ON support_tickets;
DROP POLICY IF EXISTS "select_own_replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "insert_own_replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "staff_select_replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "staff_insert_replies" ON support_ticket_replies;

-- User policies: users see and manage their own tickets
CREATE POLICY "select_own_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_tickets" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Staff policies: staff with support.manage can see and update all tickets
CREATE POLICY "staff_select_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.code = 'support.manage'
    )
  );

CREATE POLICY "staff_update_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.code = 'support.manage'
    )
  );

-- Reply policies: users see replies on their tickets, staff see all replies
CREATE POLICY "select_own_replies" ON support_ticket_replies FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.code = 'support.manage'
    )
  );

-- Users insert replies on their own tickets, staff insert replies on any ticket
CREATE POLICY "insert_own_replies" ON support_ticket_replies FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid() AND p.code = 'support.manage'
    )
  );

-- Grant support.manage to admin role in the database
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.code = 'support.manage'
ON CONFLICT DO NOTHING;

-- Notification trigger: notify staff when a new ticket is created
CREATE OR REPLACE FUNCTION notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  INSERT INTO notifications (user_id, title, body, type, link)
  SELECT ur.user_id, 'تذكرة دعم جديدة', 'تم استلام تذكرة جديدة: ' || NEW.subject, 'system', '/admin/support'
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE p.code = 'support.manage'
  AND ur.user_id != NEW.user_id;
  RETURN NEW;
end;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_ticket ON support_tickets;
CREATE TRIGGER trg_notify_new_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_ticket();

-- Notification when staff replies
CREATE OR REPLACE FUNCTION notify_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  ticket_user uuid;
  ticket_subject text;
begin
  SELECT user_id, subject INTO ticket_user, ticket_subject FROM support_tickets WHERE id = NEW.ticket_id;
  IF NEW.is_staff AND ticket_user != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, body, type, link)
    VALUES (ticket_user, 'رد من خدمة العملاء', 'رد جديد على تذكرتك: ' || ticket_subject, 'system', '/support/my-tickets');
  END IF;
  RETURN NEW;
end;
$$;

DROP TRIGGER IF EXISTS trg_notify_ticket_reply ON support_ticket_replies;
CREATE TRIGGER trg_notify_ticket_reply
  AFTER INSERT ON support_ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_reply();
