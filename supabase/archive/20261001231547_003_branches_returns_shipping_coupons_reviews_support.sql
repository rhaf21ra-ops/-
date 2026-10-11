/*
# Schema Part 3: Branches, Regions, Financing Officers, Guarantees, Returns, Shipping, Coupons, Reviews, Support, Settlements, Commissions, Banners

## New Tables
1. regions — Geographic regions
2. branches — Financing institution branches
3. financing_officers — Officers linked to branches
4. guarantee_types — Configurable guarantee types
5. returns — RMA/returns system
6. return_items — Items in a return
7. shipments — Shipping records with tracking
8. shipping_providers — Configurable shipping providers (adapter pattern)
9. coupons — Discount coupons
10. reviews — Product/merchant reviews with moderation
11. support_tickets — Customer support tickets
12. support_ticket_messages — Messages in tickets
13. settlements — Merchant settlements
14. commissions — Platform commission records
15. banners — Advertisements/banners (manageable)
16. favorites — User favorite products
17. user_addresses — Saved delivery addresses
*/

-- ============================================================
-- REGIONS & BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  name text NOT NULL,
  address text,
  phone text,
  city text,
  governorate text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financing_officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  region_id uuid REFERENCES regions(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- GUARANTEE TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS guarantee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RETURNS (RMA)
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text UNIQUE NOT NULL,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'under_review', 'approved', 'rejected', 'item_received', 'inspected', 'refunded', 'replaced', 'closed')),
  refund_amount numeric(12,2) DEFAULT 0,
  replacement_order_id uuid REFERENCES orders(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  reason text,
  condition text CHECK (condition IN ('new', 'used', 'damaged', 'defective')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SHIPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS shipping_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  api_url text,
  api_key_env text,
  is_active boolean DEFAULT true,
  tracking_url_template text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES shipping_providers(id) ON DELETE SET NULL,
  tracking_number text,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled')),
  shipping_cost numeric(12,2) DEFAULT 0,
  estimated_delivery timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  min_order_amount numeric(12,2) DEFAULT 0,
  usage_limit integer,
  used_count integer DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by uuid REFERENCES auth.users(id),
  moderated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  attachment_url text,
  is_staff boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SETTLEMENTS & COMMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  sale_value numeric(12,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,2) NOT NULL DEFAULT 5.00,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  merchant_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_number text UNIQUE NOT NULL,
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  sale_value numeric(12,2) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) DEFAULT 0,
  merchant_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'under_review', 'approved', 'settled')),
  settled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- BANNERS / ADVERTISEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  image_url text NOT NULL,
  link_url text,
  placement text NOT NULL DEFAULT 'homepage' CHECK (placement IN ('homepage', 'categories', 'search', 'between_products', 'sidebar')),
  priority integer DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- FAVORITES & ADDRESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'المنزل',
  full_name text NOT NULL,
  phone text NOT NULL,
  governorate text,
  city text,
  area text,
  address text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_branches_region_id ON branches(region_id);
CREATE INDEX IF NOT EXISTS idx_financing_officers_branch_id ON financing_officers(branch_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_merchant_id ON reviews(merchant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_commissions_merchant_id ON commissions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_settlements_merchant_id ON settlements(merchant_id);
CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners(placement);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- ============================================================
-- RLS: REGIONS & BRANCHES (public read)
-- ============================================================
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE financing_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantee_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_regions" ON regions;
CREATE POLICY "public_read_regions" ON regions FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "public_read_branches" ON branches;
CREATE POLICY "public_read_branches" ON branches FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "public_read_guarantee_types" ON guarantee_types;
CREATE POLICY "public_read_guarantee_types" ON guarantee_types FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "officer_read_own" ON financing_officers;
CREATE POLICY "officer_read_own" ON financing_officers FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- RLS: RETURNS
-- ============================================================
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "return_read_own" ON returns;
CREATE POLICY "return_read_own" ON returns FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "return_insert_own" ON returns;
CREATE POLICY "return_insert_own" ON returns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "return_read_by_merchant" ON returns;
CREATE POLICY "return_read_by_merchant" ON returns FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders JOIN merchants ON merchants.id = orders.merchant_id WHERE orders.id = returns.order_id AND merchants.user_id = auth.uid()));

DROP POLICY IF EXISTS "return_item_read_own" ON return_items;
CREATE POLICY "return_item_read_own" ON return_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM returns WHERE returns.id = return_items.return_id AND returns.user_id = auth.uid()));

-- ============================================================
-- RLS: SHIPMENTS
-- ============================================================
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipment_read_own" ON shipments;
CREATE POLICY "shipment_read_own" ON shipments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND (orders.user_id = auth.uid() OR EXISTS (SELECT 1 FROM merchants WHERE merchants.id = orders.merchant_id AND merchants.user_id = auth.uid()))));
DROP POLICY IF EXISTS "public_read_shipping_providers" ON shipping_providers;
CREATE POLICY "public_read_shipping_providers" ON shipping_providers FOR SELECT TO anon, authenticated USING (is_active = true);

-- ============================================================
-- RLS: COUPONS (public read active)
-- ============================================================
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_coupons" ON coupons;
CREATE POLICY "public_read_coupons" ON coupons FOR SELECT TO anon, authenticated USING (is_active = true);

-- ============================================================
-- RLS: REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_approved_reviews" ON reviews;
CREATE POLICY "public_read_approved_reviews" ON reviews FOR SELECT TO anon, authenticated USING (status = 'approved');
DROP POLICY IF EXISTS "review_read_own" ON reviews;
CREATE POLICY "review_read_own" ON reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "review_insert_own" ON reviews;
CREATE POLICY "review_insert_own" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RLS: SUPPORT TICKETS
-- ============================================================
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_read_own" ON support_tickets;
CREATE POLICY "ticket_read_own" ON support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = assigned_to);
DROP POLICY IF EXISTS "ticket_insert_own" ON support_tickets;
CREATE POLICY "ticket_insert_own" ON support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ticket_update_own" ON support_tickets;
CREATE POLICY "ticket_update_own" ON support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = assigned_to) WITH CHECK (auth.uid() = user_id OR auth.uid() = assigned_to);

DROP POLICY IF EXISTS "ticket_msg_read_own" ON support_ticket_messages;
CREATE POLICY "ticket_msg_read_own" ON support_ticket_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_ticket_messages.ticket_id AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_to = auth.uid())));
DROP POLICY IF EXISTS "ticket_msg_insert_own" ON support_ticket_messages;
CREATE POLICY "ticket_msg_insert_own" ON support_ticket_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_ticket_messages.ticket_id AND (support_tickets.user_id = auth.uid() OR support_tickets.assigned_to = auth.uid())));

-- ============================================================
-- RLS: SETTLEMENTS & COMMISSIONS (merchant read own)
-- ============================================================
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_read_own" ON commissions;
CREATE POLICY "commission_read_own" ON commissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = commissions.merchant_id AND merchants.user_id = auth.uid()));
DROP POLICY IF EXISTS "settlement_read_own" ON settlements;
CREATE POLICY "settlement_read_own" ON settlements FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM merchants WHERE merchants.id = settlements.merchant_id AND merchants.user_id = auth.uid()));

-- ============================================================
-- RLS: BANNERS (public read active)
-- ============================================================
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_banners" ON banners;
CREATE POLICY "public_read_banners" ON banners FOR SELECT TO anon, authenticated USING (is_active = true);

-- ============================================================
-- RLS: FAVORITES & ADDRESSES
-- ============================================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorite_read_own" ON favorites;
CREATE POLICY "favorite_read_own" ON favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "favorite_insert_own" ON favorites;
CREATE POLICY "favorite_insert_own" ON favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "favorite_delete_own" ON favorites;
CREATE POLICY "favorite_delete_own" ON favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "address_read_own" ON user_addresses;
CREATE POLICY "address_read_own" ON user_addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "address_insert_own" ON user_addresses;
CREATE POLICY "address_insert_own" ON user_addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "address_update_own" ON user_addresses;
CREATE POLICY "address_update_own" ON user_addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "address_delete_own" ON user_addresses;
CREATE POLICY "address_delete_own" ON user_addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
DO $$ BEGIN CREATE TRIGGER trigger_returns_updated BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trigger_shipments_updated BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trigger_support_tickets_updated BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEED: REGIONS & BRANCHES
-- ============================================================
INSERT INTO regions (name, name_en) VALUES
  ('أمانة العاصمة', 'Sanaa Capital'),
  ('عدن', 'Aden'),
  ('تعز', 'Taiz'),
  ('الحديدة', 'Hodeidah'),
  ('حضرموت', 'Hadhramaut')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: GUARANTEE TYPES
-- ============================================================
INSERT INTO guarantee_types (name, description, sort_order) VALUES
  ('حساب بنكي لدى الكريمي', 'ضمان عبر حساب بنكي لدى بنك الكريمي', 1),
  ('ضمان تجاري', 'ضمان عبر ركن تجاري معتمد', 2),
  ('ذهب', 'ضمان عبر ذهب مودع لدى الجهة المالية', 3),
  ('ضمان آخر معتمد', 'نوع ضمان آخر معتمد من الجهة المالية', 4)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: SHIPPING PROVIDERS (placeholder, no real API)
-- ============================================================
INSERT INTO shipping_providers (name, code, is_active) VALUES
  ('شركة التوصيل المحلية', 'local_shipping', true),
  ('شركة اليمن للشحن', 'yemen_shipping', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: CONTRACT TEMPLATE
-- ============================================================
INSERT INTO contract_templates (name, version, content, is_active) VALUES
  ('عقد تقسيط قياسي', '1.0', 'هذا العقد نموذجي وقابل للتعديل من قبل جهة التمويل المعتمدة. يجب أن يتم توقيع العقد إلكترونياً من قبل العميل بعد قراءة جميع الشروط.', true)
ON CONFLICT DO NOTHING;