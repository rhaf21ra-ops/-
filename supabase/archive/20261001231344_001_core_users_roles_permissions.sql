/*
# Core Schema: Users, Roles, Permissions, Companies, Employees, Merchants, Stores, Products, Categories

## Overview
This migration creates the foundational schema for a production multi-vendor e-commerce + financing platform.
It establishes RBAC, user management, company/employee relationships, merchant stores, and product catalog.

## New Tables
1. roles — System roles (super_admin, admin, finance, accountant, etc.)
2. permissions — Granular permissions
3. role_permissions — Many-to-many role↔permission
4. user_roles — Many-to-many user↔role
5. user_profiles — Extended profile data linked to auth.users
6. companies — Registered companies sponsoring employee financing
7. employees — Employee records linked to users and companies
8. merchants — Merchant accounts with commission rates
9. stores — Individual stores owned by merchants
10. categories — Product categories with parent support
11. products — Products with full attributes
12. product_variants — Color/size variants
13. product_images — Multiple images per product
14. installment_plans — Configurable installment durations

## Security
- RLS enabled on ALL tables
- Owner-scoped policies for user_profiles
- Public read for approved products/categories/stores
- Merchant-scoped access for their own products
*/

-- ============================================================
-- ROLES & PERMISSIONS (RBAC)
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  label_ar text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  label_ar text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  avatar_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  city text,
  governorate text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  employee_count integer DEFAULT 0,
  city text,
  governorate text,
  address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_number text,
  full_name text NOT NULL,
  phone text,
  email text,
  job_title text,
  salary numeric(12,2) DEFAULT 0,
  hire_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated', 'resigned', 'inactive')),
  eligibility text NOT NULL DEFAULT 'pending' CHECK (eligibility IN ('eligible', 'not_eligible', 'pending')),
  installment_limit numeric(12,2) DEFAULT 0,
  used_limit numeric(12,2) DEFAULT 0,
  city text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- MERCHANTS & STORES
-- ============================================================
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  store_name text NOT NULL,
  owner_name text,
  phone text,
  email text,
  city text,
  governorate text,
  address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  rating numeric(3,1) DEFAULT 0,
  sales_total numeric(14,2) DEFAULT 0,
  commission_rate numeric(5,2) DEFAULT 5.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  logo_url text,
  banner_url text,
  city text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  slug text UNIQUE NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  icon text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text,
  description text,
  cash_price numeric(12,2) NOT NULL DEFAULT 0,
  deferred_price numeric(12,2) DEFAULT 0,
  discount_price numeric(12,2),
  stock integer NOT NULL DEFAULT 0,
  sku text,
  barcode text,
  video_url text,
  installment_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  is_new boolean DEFAULT true,
  is_bestseller boolean DEFAULT false,
  rating numeric(3,1) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  sold_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'inactive')),
  visible boolean DEFAULT true,
  city text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color text,
  size text,
  sku text,
  stock integer DEFAULT 0,
  price_adjustment numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INSTALLMENT PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS installment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_months integer NOT NULL,
  label_ar text NOT NULL,
  interest_rate numeric(5,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_visible ON products(visible);
CREATE INDEX IF NOT EXISTS idx_stores_merchant_id ON stores(merchant_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ============================================================
-- RLS: ROLES & PERMISSIONS
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_roles" ON roles;
CREATE POLICY "public_read_roles" ON roles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_permissions" ON permissions;
CREATE POLICY "public_read_permissions" ON permissions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_role_permissions" ON role_permissions;
CREATE POLICY "public_read_role_permissions" ON role_permissions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "user_read_own_roles" ON user_roles;
CREATE POLICY "user_read_own_roles" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- RLS: USER PROFILES
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_read_own_profile" ON user_profiles;
CREATE POLICY "user_read_own_profile" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_update_own_profile" ON user_profiles;
CREATE POLICY "user_update_own_profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_insert_own_profile" ON user_profiles;
CREATE POLICY "user_insert_own_profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RLS: COMPANIES
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_read_own" ON companies;
CREATE POLICY "company_read_own" ON companies FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "company_insert_own" ON companies;
CREATE POLICY "company_insert_own" ON companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "company_update_own" ON companies;
CREATE POLICY "company_update_own" ON companies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RLS: EMPLOYEES
-- ============================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_read_own" ON employees;
CREATE POLICY "employee_read_own" ON employees FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "employee_read_by_company" ON employees;
CREATE POLICY "employee_read_by_company" ON employees FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM companies WHERE companies.id = employees.company_id AND companies.user_id = auth.uid())
);

-- ============================================================
-- RLS: MERCHANTS
-- ============================================================
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchant_read_own" ON merchants;
CREATE POLICY "merchant_read_own" ON merchants FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_insert_own" ON merchants;
CREATE POLICY "merchant_insert_own" ON merchants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "merchant_update_own" ON merchants;
CREATE POLICY "merchant_update_own" ON merchants FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RLS: STORES
-- ============================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_read_own" ON stores;
CREATE POLICY "store_read_own" ON stores FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = stores.merchant_id AND merchants.user_id = auth.uid())
);

DROP POLICY IF EXISTS "store_insert_own" ON stores;
CREATE POLICY "store_insert_own" ON stores FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = stores.merchant_id AND merchants.user_id = auth.uid())
);

-- ============================================================
-- RLS: CATEGORIES
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON categories;
CREATE POLICY "public_read_categories" ON categories FOR SELECT TO anon, authenticated USING (is_active = true);

-- ============================================================
-- RLS: PRODUCTS
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_approved_products" ON products;
CREATE POLICY "public_read_approved_products" ON products FOR SELECT TO anon, authenticated USING (status = 'approved' AND visible = true);

DROP POLICY IF EXISTS "merchant_read_own_products" ON products;
CREATE POLICY "merchant_read_own_products" ON products FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = products.merchant_id AND merchants.user_id = auth.uid())
);

DROP POLICY IF EXISTS "merchant_insert_own_products" ON products;
CREATE POLICY "merchant_insert_own_products" ON products FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = products.merchant_id AND merchants.user_id = auth.uid())
);

DROP POLICY IF EXISTS "merchant_update_own_products" ON products;
CREATE POLICY "merchant_update_own_products" ON products FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = products.merchant_id AND merchants.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM merchants WHERE merchants.id = products.merchant_id AND merchants.user_id = auth.uid())
);

-- ============================================================
-- RLS: PRODUCT VARIANTS & IMAGES
-- ============================================================
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_product_variants" ON product_variants;
CREATE POLICY "public_read_product_variants" ON product_variants FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_product_images" ON product_images;
CREATE POLICY "public_read_product_images" ON product_images FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- RLS: INSTALLMENT PLANS
-- ============================================================
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_installment_plans" ON installment_plans;
CREATE POLICY "public_read_installment_plans" ON installment_plans FOR SELECT TO anon, authenticated USING (is_active = true);

-- ============================================================
-- SEED: ROLES
-- ============================================================
INSERT INTO roles (name, label_ar, is_system) VALUES
  ('super_admin', 'مدير عام', true),
  ('admin', 'مدير المنصة', true),
  ('finance', 'موظف مالي', true),
  ('accountant', 'محاسب', true),
  ('product_manager', 'مدير منتجات', true),
  ('customer_service', 'خدمة العملاء', true),
  ('financing_officer', 'موظف تمويل', true),
  ('branch_manager', 'مدير فرع', true),
  ('shipping_manager', 'مدير شحن', true),
  ('merchant_manager', 'مدير تجار', true),
  ('customer', 'عميل', true),
  ('employee', 'موظف', true),
  ('merchant', 'تاجر', true),
  ('company', 'شركة', true),
  ('financial_institution', 'جهة مالية', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: PERMISSIONS
-- ============================================================
INSERT INTO permissions (name, label_ar) VALUES
  ('view_profile', 'عرض الملف الشخصي'),
  ('edit_profile', 'تعديل الملف الشخصي'),
  ('view_orders', 'عرض الطلبات'),
  ('create_order', 'إنشاء طلب'),
  ('view_installments', 'عرض الأقساط'),
  ('view_company', 'عرض الشركة'),
  ('manage_employees', 'إدارة الموظفين'),
  ('manage_products', 'إدارة المنتجات'),
  ('manage_orders', 'إدارة الطلبات'),
  ('manage_settlements', 'إدارة التسويات'),
  ('manage_users', 'إدارة المستخدمين'),
  ('review_identity', 'مراجعة الهوية'),
  ('manage_financing', 'إدارة التمويل'),
  ('view_reports', 'عرض التقارير'),
  ('manage_roles', 'إدارة الأدوار'),
  ('manage_categories', 'إدارة الفئات'),
  ('manage_merchants', 'إدارة التجار'),
  ('manage_companies', 'إدارة الشركات'),
  ('manage_branches', 'إدارة الفروع'),
  ('manage_coupons', 'إدارة الكوبونات'),
  ('manage_banners', 'إدارة الإعلانات'),
  ('manage_support', 'إدارة الدعم'),
  ('manage_notifications', 'إدارة الإشعارات'),
  ('manage_accounting', 'إدارة المحاسبة'),
  ('manage_inventory', 'إدارة المخزون'),
  ('manage_purchases', 'إدارة المشتريات'),
  ('manage_suppliers', 'إدارة الموردين'),
  ('manage_returns', 'إدارة المرتجعات'),
  ('manage_shipping', 'إدارة الشحن'),
  ('manage_invoices', 'إدارة الفواتير'),
  ('sign_contracts', 'توقيع العقود'),
  ('view_financing_applications', 'عرض طلبات التمويل'),
  ('approve_financing', 'الموافقة على التمويل'),
  ('manage_contracts', 'إدارة العقود')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: ROLE_PERMISSIONS
-- ============================================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.name IN (
  'view_profile','edit_profile','view_orders','create_order','view_installments',
  'view_company','manage_employees','manage_products','manage_orders','manage_settlements',
  'manage_users','review_identity','manage_financing','view_reports',
  'manage_roles','manage_categories','manage_merchants','manage_companies',
  'manage_branches','manage_coupons','manage_banners','manage_support',
  'manage_notifications','manage_accounting','manage_inventory','manage_purchases',
  'manage_suppliers','manage_returns','manage_shipping','manage_invoices',
  'view_financing_applications','approve_financing','manage_contracts'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'customer' AND p.name IN (
  'view_profile','edit_profile','view_orders','create_order','view_installments','sign_contracts'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'employee' AND p.name IN (
  'view_profile','edit_profile','view_orders','create_order','view_installments','sign_contracts'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'merchant' AND p.name IN (
  'view_profile','edit_profile','manage_products','manage_orders','manage_settlements','view_reports'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'company' AND p.name IN (
  'view_profile','edit_profile','view_company','manage_employees','view_orders','view_reports'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'finance' AND p.name IN (
  'view_profile','edit_profile','view_financing_applications','approve_financing','manage_contracts','view_reports','view_installments'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'financing_officer' AND p.name IN (
  'view_profile','edit_profile','view_financing_applications','approve_financing','view_reports'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: INSTALLMENT PLANS
-- ============================================================
INSERT INTO installment_plans (duration_months, label_ar, interest_rate, sort_order) VALUES
  (6, '6 أشهر', 8.00, 1),
  (9, '9 أشهر', 10.00, 2),
  (12, '12 شهراً', 12.00, 3),
  (18, '18 شهراً', 15.00, 4),
  (24, '24 شهراً', 18.00, 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trigger_user_profiles_updated
    BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_companies_updated
    BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_employees_updated
    BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_merchants_updated
    BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_products_updated
    BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;