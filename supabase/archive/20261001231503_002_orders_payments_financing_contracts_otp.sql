/*
# Schema Part 2: Orders, Carts, Financing, Contracts, Installments, Payments, Invoices, OTP, Audit Logs, Notifications

Tables are ordered to respect FK dependencies (contracts before payments).
*/

-- ============================================================
-- CARTS & CART ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  payment_type text NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'installment')),
  duration_months integer,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ORDERS & ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'confirmed', 'processing', 'preparing', 'ready_for_delivery',
    'with_courier', 'delivered', 'cancelled', 'returned', 'failed_delivery', 'replacement'
  )),
  payment_type text NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'installment')),
  total numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(12,2) DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  coupon_code text,
  city text,
  governorate text,
  address text,
  phone text,
  notes text,
  tracking_number text,
  delivery_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  cash_price numeric(12,2) NOT NULL DEFAULT 0,
  deferred_price numeric(12,2) DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'cash',
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONTRACT TEMPLATES & CONTRACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text UNIQUE NOT NULL,
  application_id uuid NOT NULL,
  template_id uuid REFERENCES contract_templates(id) ON DELETE SET NULL,
  template_version text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  product_name text,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  monthly_installment numeric(12,2) DEFAULT 0,
  duration_months integer NOT NULL DEFAULT 12,
  paid_amount numeric(12,2) DEFAULT 0,
  remaining_amount numeric(12,2) DEFAULT 0,
  paid_installments integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'defaulted', 'cancelled')),
  start_date timestamptz,
  first_due_date timestamptz,
  signed_at timestamptz,
  signature_data text,
  biometric_verified boolean DEFAULT false,
  whatsapp_confirmed boolean DEFAULT false,
  finalized_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- FINANCING APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS financing_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_role text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text,
  product_image text,
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  merchant_name text,
  cash_price numeric(12,2) NOT NULL DEFAULT 0,
  deferred_price numeric(12,2) DEFAULT 0,
  duration_months integer NOT NULL DEFAULT 12,
  monthly_installment numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'under_review', 'pending_documents', 'pending_identity_verification',
    'company_pending', 'approved', 'rejected', 'completed'
  )),
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  company_approved boolean,
  company_reviewed_at timestamptz,
  company_reviewed_by uuid REFERENCES auth.users(id),
  company_notes text,
  branch_id uuid,
  financing_officer_id uuid,
  guarantee_type text,
  rejection_reason text,
  notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add FK from contracts to financing_applications (now both exist)
DO $$ BEGIN
  ALTER TABLE contracts ADD CONSTRAINT contracts_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES financing_applications(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- INSTALLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  number integer NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due', 'paid', 'late', 'overdue')),
  paid_at timestamptz,
  payment_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PAYMENTS (after contracts)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text UNIQUE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  method text NOT NULL DEFAULT 'cash',
  provider text,
  provider_transaction_id text,
  installment_number integer,
  created_at timestamptz DEFAULT now()
);

-- Now add FK from installments.payment_id to payments
DO $$ BEGIN
  ALTER TABLE installments ADD CONSTRAINT installments_payment_id_fkey
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  merchant_name text,
  items_json jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) DEFAULT 0,
  shipping_cost numeric(12,2) DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'cash',
  installment_details jsonb,
  qr_code text,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled', 'refunded')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- OTP VERIFICATIONS (WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  purpose text NOT NULL DEFAULT 'account_registration' CHECK (purpose IN ('account_registration', 'contract_signing', 'other')),
  hashed_otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  resend_count integer NOT NULL DEFAULT 0,
  max_resends integer NOT NULL DEFAULT 3,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  source text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system' CHECK (type IN ('order', 'installment', 'payment', 'delivery', 'system', 'financing', 'support')),
  read boolean DEFAULT false,
  link text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_financing_app_user_id ON financing_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_financing_app_status ON financing_applications(status);
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_application_id ON contracts(application_id);
CREATE INDEX IF NOT EXISTS idx_installments_contract_id ON installments(contract_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_otp_user_id ON otp_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ============================================================
-- RLS: CARTS
-- ============================================================
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_read_own" ON carts;
CREATE POLICY "cart_read_own" ON carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_insert_own" ON carts;
CREATE POLICY "cart_insert_own" ON carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_update_own" ON carts;
CREATE POLICY "cart_update_own" ON carts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart_delete_own" ON carts;
CREATE POLICY "cart_delete_own" ON carts FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cart_item_read_own" ON cart_items;
CREATE POLICY "cart_item_read_own" ON cart_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_item_insert_own" ON cart_items;
CREATE POLICY "cart_item_insert_own" ON cart_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_item_update_own" ON cart_items;
CREATE POLICY "cart_item_update_own" ON cart_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));
DROP POLICY IF EXISTS "cart_item_delete_own" ON cart_items;
CREATE POLICY "cart_item_delete_own" ON cart_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()));

-- ============================================================
-- RLS: ORDERS
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_read_own" ON orders;
CREATE POLICY "order_read_own" ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "order_read_by_merchant" ON orders;
CREATE POLICY "order_read_by_merchant" ON orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = orders.merchant_id AND merchants.user_id = auth.uid()));
DROP POLICY IF EXISTS "order_insert_own" ON orders;
CREATE POLICY "order_insert_own" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "order_update_own" ON orders;
CREATE POLICY "order_update_own" ON orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "order_update_by_merchant" ON orders;
CREATE POLICY "order_update_by_merchant" ON orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = orders.merchant_id AND merchants.user_id = auth.uid()));

-- ============================================================
-- RLS: ORDER ITEMS & STATUS HISTORY
-- ============================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_item_read_own" ON order_items;
CREATE POLICY "order_item_read_own" ON order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR EXISTS (SELECT 1 FROM merchants WHERE merchants.id = orders.merchant_id AND merchants.user_id = auth.uid()))));

DROP POLICY IF EXISTS "order_status_history_read" ON order_status_history;
CREATE POLICY "order_status_history_read" ON order_status_history FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND (orders.user_id = auth.uid() OR EXISTS (SELECT 1 FROM merchants WHERE merchants.id = orders.merchant_id AND merchants.user_id = auth.uid()))));

-- ============================================================
-- RLS: CONTRACTS
-- ============================================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_read_own" ON contracts;
CREATE POLICY "contract_read_own" ON contracts FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "contract_update_own" ON contracts;
CREATE POLICY "contract_update_own" ON contracts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RLS: FINANCING APPLICATIONS
-- ============================================================
ALTER TABLE financing_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financing_app_read_own" ON financing_applications;
CREATE POLICY "financing_app_read_own" ON financing_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "financing_app_read_by_company" ON financing_applications;
CREATE POLICY "financing_app_read_by_company" ON financing_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = financing_applications.company_id AND companies.user_id = auth.uid()));
DROP POLICY IF EXISTS "financing_app_insert_own" ON financing_applications;
CREATE POLICY "financing_app_insert_own" ON financing_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "financing_app_update_own" ON financing_applications;
CREATE POLICY "financing_app_update_own" ON financing_applications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RLS: INSTALLMENTS
-- ============================================================
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "installment_read_own" ON installments;
CREATE POLICY "installment_read_own" ON installments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM contracts WHERE contracts.id = installments.contract_id AND contracts.user_id = auth.uid()));

-- ============================================================
-- RLS: PAYMENTS
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_read_own" ON payments;
CREATE POLICY "payment_read_own" ON payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "payment_insert_own" ON payments;
CREATE POLICY "payment_insert_own" ON payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RLS: INVOICES
-- ============================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_read_own" ON invoices;
CREATE POLICY "invoice_read_own" ON invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "invoice_read_by_merchant" ON invoices;
CREATE POLICY "invoice_read_by_merchant" ON invoices FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = invoices.merchant_id AND merchants.user_id = auth.uid()));

-- ============================================================
-- RLS: OTP
-- ============================================================
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otp_read_own" ON otp_verifications;
CREATE POLICY "otp_read_own" ON otp_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "otp_insert_own" ON otp_verifications;
CREATE POLICY "otp_insert_own" ON otp_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "otp_update_own" ON otp_verifications;
CREATE POLICY "otp_update_own" ON otp_verifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RLS: AUDIT LOGS
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_read_own" ON audit_logs;
CREATE POLICY "audit_log_read_own" ON audit_logs FOR SELECT TO authenticated USING (auth.uid() = actor_id);

-- ============================================================
-- RLS: NOTIFICATIONS
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_read_own" ON notifications;
CREATE POLICY "notif_read_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
DO $$ BEGIN CREATE TRIGGER trigger_carts_updated BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trigger_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trigger_financing_app_updated BEFORE UPDATE ON financing_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trigger_contracts_updated BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;