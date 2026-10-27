-- Seed demo merchants, stores, and products for the Qistuha platform
-- owner_id = NULL so they're visible to everyone via merchants_public view

-- ── Merchants ──────────────────────────────────────────────────
INSERT INTO merchants (id, business_name, store_name, owner_name, status, rating, sales_total, commission_percent)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'متجر التقنية الحديثة', 'متجر التقنية الحديثة', 'أحمد محمد', 'active', 4.5, 0, 5),
  ('22222222-2222-2222-2222-222222222222', 'بيت الأجهزة المنزلية', 'بيت الأجهزة', 'سالم عبدالله', 'active', 4.2, 0, 5),
  ('33333333-3333-3333-3333-333333333333', 'متجر الحياة العصرية', 'الحياة العصرية', 'فاطمة علي', 'active', 4.7, 0, 5)
ON CONFLICT (id) DO NOTHING;

-- ── Stores ─────────────────────────────────────────────────────
INSERT INTO stores (id, merchant_id, name, city, governorate, status)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'متجر التقنية الحديثة - صنعاء', 'صنعاء', 'صنعاء', 'active'),
  ('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'بيت الأجهزة - عدن', 'عدن', 'عدن', 'active'),
  ('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'الحياة العصرية - تعز', 'تعز', 'تعز', 'active')
ON CONFLICT (id) DO NOTHING;

-- ── Products: Electronics & Phones (Merchant 1) ────────────────
INSERT INTO products (id, store_id, merchant_id, category_id, name, description, cash_price, stock, featured, city, specs, installment_available, rating, is_bestseller, is_new)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '300c3119-88be-4545-8383-44c2081eee36',
   'هاتف Samsung Galaxy A55 5G', 'هاتف ذكي بشاشة 6.6 بوصة، كاميرا 50 ميجابكسل، بطارية 5000 مللي أمبير، يدعم شبكات 5G',
   85000, 25, true, 'صنعاء', '[{"label":"الشاشة","value":"6.6 بوصة"},{"label":"الكاميرا","value":"50 ميجابكسل"},{"label":"البطارية","value":"5000 مللي أمبير"},{"label":"الذاكرة","value":"128GB / 8GB RAM"}]'::jsonb, true, 4.5, true, true),
  ('a0000002-0000-0000-0000-000000000002', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '300c3119-88be-4545-8383-44c2081eee36',
   'هاتف iPhone 15 Pro Max', 'هاتف آيفون بأحدث المواصفات، تيتانيوم، كاميرا احترافية، شريحة A17 Pro',
   450000, 10, true, 'صنعاء', '[{"label":"الشاشة","value":"6.7 بوصة"},{"label":"الكاميرا","value":"48 ميجابكسل"},{"label":"الذاكرة","value":"256GB"},{"label":"المعالج","value":"A17 Pro"}]'::jsonb, true, 4.8, true, false),
  ('a0000003-0000-0000-0000-000000000003', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '5a266bc2-7c8b-4395-b680-523710165eeb',
   'لابتوب HP Pavilion 15', 'لابتوب بمعالج Intel Core i7، رام 16GB، تخزين SSD 512GB، شاشة 15.6 بوصة',
   180000, 15, false, 'صنعاء', '[{"label":"المعالج","value":"Intel Core i7"},{"label":"الرام","value":"16GB"},{"label":"التخزين","value":"512GB SSD"},{"label":"الشاشة","value":"15.6 بوصة"}]'::jsonb, true, 4.3, false, false),
  ('a0000004-0000-0000-0000-000000000004', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '5a266bc2-7c8b-4395-b680-523710165eeb',
   'لابتوب Dell Inspiron 14', 'لابتوب خفيف بمعالج AMD Ryzen 5، رام 8GB، تخزين SSD 256GB',
   150000, 20, false, 'صنعاء', '[{"label":"المعالج","value":"AMD Ryzen 5"},{"label":"الرام","value":"8GB"},{"label":"التخزين","value":"256GB SSD"},{"label":"الشاشة","value":"14 بوصة"}]'::jsonb, true, 4.1, false, true),
  ('a0000005-0000-0000-0000-000000000005', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '5a266bc2-7c8b-4395-b680-523710165eeb',
   'تلفاز LG Smart TV 50 بوصة', 'تلفاز ذكي بدقة 4K، نظام WebOS، يدعم تطبيقات يوتيوب ونيتفليكس',
   120000, 12, true, 'صنعاء', '[{"label":"الحجم","value":"50 بوصة"},{"label":"الدقة","value":"4K UHD"},{"label":"النظام","value":"WebOS"}]'::jsonb, true, 4.4, false, false)
ON CONFLICT (id) DO NOTHING;

-- ── Products: Home Appliances (Merchant 2) ─────────────────────
INSERT INTO products (id, store_id, merchant_id, category_id, name, description, cash_price, stock, featured, city, specs, installment_available, rating, is_bestseller, is_new)
VALUES
  ('b0000001-0000-0000-0000-000000000001', 'aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'c13b1cf0-ccbf-41a8-a25c-28473535fcc7',
   'ثلاجة LG 18 قدم', 'ثلاجة لا فتحة أبواب، تبريد سريع، موفر للطاقة، سعة 18 قدم',
   165000, 8, true, 'عدن', '[{"label":"السعة","value":"18 قدم"},{"label":"النوع","value":"لا فتحة"},{"label":"موفرة الطاقة","value":"نعم"}]'::jsonb, true, 4.3, true, false),
  ('b0000002-0000-0000-0000-000000000002', 'aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'c13b1cf0-ccbf-41a8-a25c-28473535fcc7',
   'غسالة ملابس سامسونج 12 كجم', 'غسالة أوتوماتيك بحمولة 12 كجم، 14 برنامج غسيل، توفير طاقة',
   95000, 15, false, 'عدن', '[{"label":"الحمولة","value":"12 كجم"},{"label":"البرامج","value":"14 برنامج"},{"label":"النوع","value":"أوتوماتيك"}]'::jsonb, true, 4.2, false, false),
  ('b0000003-0000-0000-0000-000000000003', 'aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'c13b1cf0-ccbf-41a8-a25c-28473535fcc7',
   'مكيف هواء LG 1.5 طن انفرتر', 'مكيف هواء انفرتر موفر للطاقة، 1.5 طن، تبريد سريع، هادئ',
   110000, 18, true, 'عدن', '[{"label":"القدرة","value":"1.5 طن"},{"label":"النوع","value":"انفرتر"},{"label":"الميزات","value":"تبريد سريع، هادئ"}]'::jsonb, true, 4.5, true, true)
ON CONFLICT (id) DO NOTHING;

-- ── Products: Lifestyle (Merchant 3) ───────────────────────────
INSERT INTO products (id, store_id, merchant_id, category_id, name, description, cash_price, stock, featured, city, specs, installment_available, rating, is_bestseller, is_new)
VALUES
  ('c0000001-0000-0000-0000-000000000001', 'aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '618b1145-2c8b-4da8-9f7d-0afbd177291a',
   'حذاء رياضي نايك', 'حذاء رياضي أصلي، مريح للجري والمشي، مقاسات متعددة',
   25000, 30, false, 'تعز', '[{"label":"العلامة","value":"Nike"},{"label":"النوع","value":"رياضي"},{"label":"المقاسات","value":"40-45"}]'::jsonb, true, 4.0, false, false),
  ('c0000002-0000-0000-0000-000000000002', 'aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '03805379-baf2-4eed-a549-874632f26d78',
   'عربة أطفال متعددة الاستخدام', 'عربة أطفال خفيفة الوزن، قابلة للطي، بمظلة واقية',
   45000, 10, false, 'تعز', '[{"label":"النوع","value":"قابلة للطي"},{"label":"الوزن","value":"خفيف"},{"label":"المظلة","value":"نعم"}]'::jsonb, true, 4.6, false, true),
  ('c0000003-0000-0000-0000-000000000003', 'aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'e64841cb-bc18-40c2-a301-03b374ca213d',
   'أريكة جلدية 3 مقاعد', 'أريكة جلدية فاخرة بـ 3 مقاعد، لون بني، مريحة وأنيقة',
   130000, 5, true, 'تعز', '[{"label":"المقاعد","value":"3"},{"label":"الخامة","value":"جلد"},{"label":"اللون","value":"بني"}]'::jsonb, true, 4.4, false, false),
  ('c0000004-0000-0000-0000-000000000004', 'aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '12a28624-9e58-491d-880a-286276166329',
   'طقم أوزان رياضية', 'طقم أوزان رياضية يشمل دمبلز وحبل وأشرطة مقاومة',
   35000, 20, false, 'تعز', '[{"label":"المحتويات","value":"دمبلز، حبل، أشرطة"},{"label":"الوزن","value":"متعدد"}]'::jsonb, true, 3.9, false, true),
  ('c0000005-0000-0000-0000-000000000005', 'aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'ef54ee8d-1c1a-489e-9ace-f246563c1364',
   'عطر ديور سوفيج', 'عطر رجالي فاخر من ديور، 100 مل، عبوة أصلية',
   55000, 25, false, 'تعز', '[{"label":"العلامة","value":"Dior"},{"label":"الحجم","value":"100 مل"},{"label":"النوع","value":"رجالي"}]'::jsonb, true, 4.7, true, false)
ON CONFLICT (id) DO NOTHING;

-- ── Product Images ─────────────────────────────────────────────
INSERT INTO product_images (product_id, url, position)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/7068406/pexels-photo-7068406.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('a0000002-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/30639091/pexels-photo-30639091.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('a0000003-0000-0000-0000-000000000003', 'https://images.pexels.com/photos/8533587/pexels-photo-8533587.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('a0000004-0000-0000-0000-000000000004', 'https://images.pexels.com/photos/6968164/pexels-photo-6968164.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('a0000005-0000-0000-0000-000000000005', 'https://images.pexels.com/photos/15259088/pexels-photo-15259088.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('b0000001-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/6593607/pexels-photo-6593607.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('b0000002-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/4700400/pexels-photo-4700400.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('b0000003-0000-0000-0000-000000000003', 'https://images.pexels.com/photos/38788452/pexels-photo-38788452.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('c0000001-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/10480303/pexels-photo-10480303.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('c0000002-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/26509817/pexels-photo-26509817.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('c0000003-0000-0000-0000-000000000003', 'https://images.pexels.com/photos/11295890/pexels-photo-11295890.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('c0000004-0000-0000-0000-000000000004', 'https://images.pexels.com/photos/6740821/pexels-photo-6740821.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0),
  ('c0000005-0000-0000-0000-000000000005', 'https://images.pexels.com/photos/36389336/pexels-photo-36389336.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 0)
ON CONFLICT DO NOTHING;

-- ── Platform settings ──────────────────────────────────────────
INSERT INTO platform_settings (key, value)
VALUES ('default_markup_percent', '22')
ON CONFLICT (key) DO UPDATE SET value = '22';
