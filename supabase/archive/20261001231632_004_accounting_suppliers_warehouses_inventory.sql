/*
# Schema Part 4: Accounting, Suppliers, Warehouses, Inventory, Purchases

Tables ordered to respect FK dependencies (warehouses before purchases).
*/

-- ============================================================
-- CHART OF ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_en text,
  type text NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- JOURNAL ENTRIES
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text UNIQUE NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  description text,
  source text CHECK (source IN ('manual', 'sales', 'purchases', 'payments', 'settlements', 'payroll', 'other')),
  reference_id text,
  posted boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  debit numeric(14,2) DEFAULT 0,
  credit numeric(14,2) DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- WAREHOUSES (before purchases)
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  address text,
  city text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  balance numeric(12,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PURCHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number text UNIQUE NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  reorder_level integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  to_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('in', 'out', 'transfer', 'damage', 'adjustment', 'return')),
  quantity integer NOT NULL,
  reference_type text,
  reference_id text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Accounting: authenticated read, authenticated insert
DROP POLICY IF EXISTS "coa_read" ON chart_of_accounts;
CREATE POLICY "coa_read" ON chart_of_accounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "je_read" ON journal_entries;
CREATE POLICY "je_read" ON journal_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "je_insert" ON journal_entries;
CREATE POLICY "je_insert" ON journal_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "jel_read" ON journal_entry_lines;
CREATE POLICY "jel_read" ON journal_entry_lines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "jel_insert" ON journal_entry_lines;
CREATE POLICY "jel_insert" ON journal_entry_lines FOR INSERT TO authenticated WITH CHECK (true);

-- Suppliers: authenticated CRUD
DROP POLICY IF EXISTS "supplier_read" ON suppliers;
CREATE POLICY "supplier_read" ON suppliers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "supplier_insert" ON suppliers;
CREATE POLICY "supplier_insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "supplier_update" ON suppliers;
CREATE POLICY "supplier_update" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Purchases
DROP POLICY IF EXISTS "purchase_read" ON purchases;
CREATE POLICY "purchase_read" ON purchases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "purchase_insert" ON purchases;
CREATE POLICY "purchase_insert" ON purchases FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "purchase_update" ON purchases;
CREATE POLICY "purchase_update" ON purchases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "purchase_item_read" ON purchase_items;
CREATE POLICY "purchase_item_read" ON purchase_items FOR SELECT TO authenticated USING (true);

-- Warehouses & Inventory
DROP POLICY IF EXISTS "warehouse_read" ON warehouses;
CREATE POLICY "warehouse_read" ON warehouses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "inventory_read" ON inventory;
CREATE POLICY "inventory_read" ON inventory FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "inventory_insert" ON inventory;
CREATE POLICY "inventory_insert" ON inventory FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "inventory_update" ON inventory;
CREATE POLICY "inventory_update" ON inventory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inv_move_read" ON inventory_movements;
CREATE POLICY "inv_move_read" ON inventory_movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "inv_move_insert" ON inventory_movements;
CREATE POLICY "inv_move_insert" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- TRIGGERS
-- ============================================================
DO $$ BEGIN CREATE TRIGGER trigger_suppliers_updated BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TRIGGER trigger_inventory_updated BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at(); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEED: CHART OF ACCOUNTS
-- ============================================================
INSERT INTO chart_of_accounts (code, name, type) VALUES
  ('1000', 'الأصول', 'asset'),
  ('1100', 'الصندوق', 'asset'),
  ('1200', 'البنوك', 'asset'),
  ('1300', 'العملاء (مدينون)', 'asset'),
  ('1400', 'المخزون', 'asset'),
  ('2000', 'الخصوم', 'liability'),
  ('2100', 'الموردون (دائنون)', 'liability'),
  ('3000', 'حقوق الملكية', 'equity'),
  ('4000', 'الإيرادات', 'revenue'),
  ('4100', 'إيرادات المبيعات', 'revenue'),
  ('4200', 'إيرادات العمولات', 'revenue'),
  ('5000', 'المصروفات', 'expense'),
  ('5100', 'مصروفات تشغيلية', 'expense'),
  ('5200', 'عمولات منصة', 'expense')
ON CONFLICT (code) DO NOTHING;