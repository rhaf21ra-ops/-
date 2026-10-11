# Prompt شامل لإ rebuild منصة "سوق اليمن"

## الوصف العام

منصة يمنية متعددة التجار للتجارة الإلكترونية مع نظام تقسيط خصم من الراتب. تربط المنصة أربعة أطراف: العملاء/الموظفين (المشترون)، التجار (البائعون)، الشركات (أصحاب العمل الذين يضمنون خصم الرواتب)، والمدير/الجهة المالية (الإدارة). يمكن الدفع نقداً أو بالتقسيط حتى 24 شهراً مع زيادة ثابتة 22% على السعر النقدي.

---

## التقنيات المطلوبة

- Next.js (App Router) مع TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- Supabase (Postgres + Auth + Edge Functions + Storage + RLS)
- Recharts للرسوم البيانية
- lucide-react للأيقونات
- Sonner + Toast للإشعارات
- React Context للحالة مع localStorage للحفظ المؤقت
- خط Tajawal (400/500/700) من Google Fonts
- اللغة: العربية، اتجاه RTL
- العملة: الريال اليمني بصيغة Intl.NumberFormat("ar-YE")

---

## التصميم

- ألوان: نظام ألوان احترافي بمجموعة primary (أزرق/أخضر)، secondary، accent، success، warning، error + درجات محايدة
- مسافة 8px كنظام أساسي
- تباعد أسطر 150% للنص و 120% للعناوين
- تصميم متجاوب من الجوال إلى الديسكتوب مع breakpoints
- شريط تنقل سفلي للجوال (BottomNav)
- هيدر ثابت sticky مع شفافية backdrop-blur
- حركات وانتقالات بسيطة على الأزرار والبطاقات
- خط 3 أوزان كحد أقصى

---

## أدوار المستخدمين (6 أدوار)

### 1. عميل (customer) - قابل للتسجيل
- لوحة تحكم: `/customer`
- الصلاحيات: عرض/تعديل الملف الشخصي، عرض الطلبات، إنشاء طلب، عرض الأقساط
- يحتاج التحقق من الهوية

### 2. موظف (employee) - قابل للتسجيل
- لوحة تحكم: `/employee`
- نفس صلاحيات العميل + ربط بالشركة
- يظهر: المسمى الوظيفي، رقم الموظف، حالة الأهلية، حد التقسيط، الحد المتاح = الحد - المستخدم
- يحتاج التحقق من الهوية

### 3. تاجر (merchant) - قابل للتسجيل
- لوحة تحكم: `/merchant`
- الصلاحيات: إدارة المنتجات، الطلبات، التسويات، التقارير
- صفحات فرعية: المنتجات، الطلبات، المخزون، التسويات، الإعدادات
- يظهر: اسم المتجر، المدينة، التقييم

### 4. شركة (company) - قابل للتسجيل
- لوحة تحكم: `/company`
- الصلاحيات: إدارة الموظفين، عرض الشركة، عرض الطلبات، التقارير
- صفحات فرعية: الموظفون، الأقساط، الإعدادات
- موافقة/رفض طلبات تمويل الموظفين (خطوة إلزامية قبل المراجعة النهائية)

### 5. مدير المنصة (admin) - غير قابل للتسجيل
- لوحة تحكم: `/admin`
- جميع الصلاحيات (14 صلاحية)
- 12 صفحة فرعية: المستخدمون، التجار، الشركات، المنتجات، الطلبات، الأقساط، المدفوعات، التوصيل، التسويات، التقارير، سجلات التدقيق، الإعدادات
- 12 بطاقة إحصائية + 3 رسوم بيانية (مبيعات شهرية، طلبات شهرية، توزيع التصنيفات) + جدول الطلبات الحديثة

### 6. الجهة المالية التجريبية (financial) - غير قابل للتسجيل
- لوحة تحكم: `/financial`
- الصلاحيات: إدارة التمويل، عرض التقارير
- تنبيه: "هذه واجهة تجريبية، التكامل الفعلي يتطلب اتفاقيات رسمية"
- عرض طلبات التمويل المعلقة

---

## الصفحات الرئيسية

### الصفحة الرئيسية `/`
- Hero: شارة "منصة يمنية موثوقة" + شعار + زرين (تسوق الآن / كيف يعمل)
- شريط إحصائيات: عدد التجار، الموظفين المخدومين، المنتجات، 22 محافظة
- 3 بطاقات مميزات (تقسيط سهل حتى 24 شهراً، تسوق آمن، توصيل وطني مع الدفع عند الاستلام)
- شبكة التصنيفات (12 تصنيف مع روابط لـ /shop?category=)
- منتجات مميزة + وصلات حديثة باستخدام ProductCard
- قسم CTP للموظفين في شركات مسجلة

### المتجر `/shop`
- فلترة حسب التصنيف (من URL ?category=)
- بحث
- شبكة منتجات مع ProductCard

### صفحة المنتج `/shop/[product]`
- تفاصيل المنتج: صور، سعر نقدي، سعر التقسيط، المواصفات
- اختيار نوع الدفع (نقدي/تقسيط)
- اختيار مدة التقسيط (6/9/12/18/24 شهراً)
- حساب القسط الشهري
- زر إضافة للسلة

### التصنيفات `/categories`
- عرض جميع التصنيفات

### التجار `/merchants`
- قائمة التجار

### السلة `/cart`
- عرض المنتجات، الكمية، نوع الدفع لكل منتج
- تعديل الكمية
- الإجمالي

### الدفع `/checkout`
- إتمام الطلب

### كيف يعمل `/how-it-works`
- شرح آلية العمل

### معلومات التقسيط `/installment-info`
- شرح نظام التقسيط

### شروط التقسيط `/installment-terms`
- الشروط والأحكام

### الإشعارات `/notifications`
- قائمة الإشعارات

### الملف الشخصي `/profile`
- بيانات المستخدم

### الخصوصية `/privacy`
- سياسة الخصوصية

### الشروط `/terms`
- الشروط والأحكام

### الاسترجاع `/refund`
- سياسة الاسترجاع

### تسجيل الدخول `/login`
- بريد إلكتروني + كلمة مرور
- دخول تجريبي سريع لـ 6 أدوار
- توجيه للوحة التحكم المناسبة بعد الدخول

### إنشاء حساب `/register`
- 3 خطوات: حساب → OTP واتساب → التحقق من الهوية
- اختيار نوع الحساب (عميل/موظف/تاجر/شركة)
- حقول مختلفة حسب الدور
- إرسال رمز 6 أرقام عبر WhatsApp
- التحقق من الهوية:
  - بطاقة شخصية: الوجه الأمامي + الوجه الخلفي + البطاقة مع الوجه + سيلفي
  - جواز سفر: صورة الجواز + سيلفي مع الجواز
- الموافقة على معالجة بيانات الهوية

---

## نظام المصادقة

- Supabase email/password (بدون تأكيد البريد)
- onAuthStateChange مع getSession أولي
- loadUserProfile: يجلب user_profiles + user_roles → roles
- تسجيل: signUp → إنشاء user_profiles (status=pending) → إدراج user_roles → إرسال OTP
- تحقق OTP: استدعاء edge function → تنشيط الحساب (status=active)
- تسجيل خروج: supabase.auth.signOut + مسح الحالة المحلية

---

## Edge Function: whatsapp-otp

- لغة Deno، CORS مفتوح
- متغيرات: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WHATSAPP_API_URL, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
- إجراءات: send / verify
- OTP: 6 أرقام، مشفر SHA-256 قبل التخزين
- الحدود: صلاحية 5 دقائق، 5 محاولات كحد أقصى، 3 إعادات كحد أقصى
- عند النجاح: تحديث user_profiles.status = active + سجل تدقيق
- إرسال عبر WhatsApp Cloud API (template: otp_verification, language: ar)
- fallback: console.log عند عدم وجود بيانات اعتماد

---

## قاعدة البيانات (4 migrations)

### Migration 001: الأساس - المستخدمون، الأدوار، الصلاحيات، الكتالوج
- roles: 15 دور نظامي
- permissions: 34 صلاحية
- role_permissions: ربط الأدوار بالصلاحيات
- user_roles: ربط المستخدمين بالأدوار
- user_profiles: user_id, full_name, phone, email, avatar_url, status, city, governorate, address
- companies: user_id, name, contact_name, phone, employee_count, city, status
- employees: user_id, company_id, employee_number, full_name, salary, hire_date, status, eligibility, installment_limit, used_limit
- merchants: store_name, owner_name, commission_rate (5% افتراضي), rating, sales_total, status
- stores: merchant_id, name, slug, logo, banner, status
- categories: parent_id ذاتي المرجع، slug, icon, image_url, sort_order, is_active
- products: merchant_id, store_id, category_id, cash_price, deferred_price, discount_price, stock, sku, barcode, installment_available, is_featured, is_new, is_bestseller, rating, status, visible, city
- product_variants: color, size, sku, stock, price_adjustment
- product_images: sort_order
- installment_plans: duration_months, interest_rate (مزرعة: 6/9/12/18/24 شهراً @ 8/10/12/15/18%)
- RLS: مفعّل على الكل، قراءة عامة للكتالوج، ملكية للملفات الشخصية

### Migration 002: الطلبات، المدفوعات، التمويل، العقود، OTP
- carts + cart_items: payment_type, duration_months, variant_id
- orders: order_number (UNIQUE), user_id, merchant_id, status (11 حالة), payment_type, total/subtotal/shipping/discount, coupon_code, tracking_number
- order_items + order_status_history
- contract_templates + contracts: contract_number, application_id, total_amount, monthly_installment, duration_months, paid/remaining, status (pending/active/completed/defaulted/cancelled)
- financing_applications: application_number, user refs, product refs, cash/deferred prices, duration, monthly installment, status (7 مراحل), employee_id, company_id, company_approved, company_reviewed_at/by/notes, branch_id, financing_officer_id, guarantee_type, rejection_reason
- installments: contract_id, number, amount, due_date, status (upcoming/due/paid/late/overdue)
- payments: payment_number, order_id, contract_id, amount, status, method, provider
- invoices: invoice_number, order_id, merchant_id, items_json, totals, qr_code
- otp_verifications: user_id, phone_number, purpose, hashed_otp, expires_at, attempts/max, resend_count/max, verified_at
- audit_logs: actor_id, actor_name/role, action, entity_type/id, old/new_value (jsonb), source, ip_address
- notifications: user_id, title, message, type, read, link

### Migration 003: الفروع، الإرجاع، الشحن، الكوبونات، المراجعات، الدعم
- branches, returns, shipping, coupons, reviews, support tickets

### Migration 004: المحاسبة، الموردون، المستودعات، المخزون
- accounting, suppliers, warehouses, inventory management

---

## إدارة الحالة (store.tsx)

### الحالة
- users, employees, companies, merchants, products, orders, installmentApplications, installmentContracts, installmentRequests, payments, settlements, deliveries, notifications, auditLogs, identityVerifications, cart
- حفظ currentUser + cart في localStorage (soq-user, soq-cart)
- بيانات أولية seeded من seed-data.ts

### الدوال
- Auth: login, demoLogin, logout, register
- Cart: addToCart, removeFromCart, updateCartQuantity, updateCartPaymentType, clearCart, cartTotal, cartCount
- Orders: createOrder, updateOrderStatus (تأثيرات جانبية: إشعارات، تنشيط عقد عند التسليم، تحديث التوصيل)
- Installments: createInstallmentApplication, reviewInstallmentApplication (عند الموافقة: توليد جدول أقساط، إنشاء عقد، إشعار، زيادة usedLimit)
- Payments: recordPayment (إنشاء سجل دفعة، تحديث القسط، إعادة حساب المدفوع/المتبقي، إكمال العقد عند السداد الكامل)
- Products: addProduct, updateProduct, deleteProduct
- Notifications: addNotification, markNotificationRead
- Employees: addEmployee, updateEmployee
- Audit: addAuditLog
- Deliveries/Settlements: updateDeliveryStatus, updateSettlementStatus
- Identity: submitIdentityVerification, reviewIdentityVerification, logIdentityAccess
- Installment Requests: createInstallmentRequest, reviewInstallmentRequest, companyApproveFinancing, companyRejectFinancing

---

## الحسابات المالية

- INSTALLMENT_DURATIONS = [6, 9, 12, 18, 24]
- calculateDeferredPrice = round(cashPrice × 1.22) — زيادة ثابتة 22% بدون فوائد مركبة
- calculateMonthlyInstallment = round(deferredPrice / months)

---

## الثوابت

- 22 محافظة يمنية
- 13 تصنيف (الإلكترونيات، الهواتف، الأجهزة المنزلية، الأثاث، الملابس، الأحذية، العطور، الجمال، الأغذية، مستلزمات الأطفال، الرياضة، السيارات، أخرى)
- حالات الطلب (7): جديد، قيد المراجعة، تمت الموافقة، قيد التجهيز، تم الشحن، تم التسليم، ملغي
- حالات القسط (7): جديد، قيد المراجعة، مقبول، مرفوض، مكتمل، متعثر، نشط
- حالات الدفع (3): ناجح، فشل، قيد المعالجة
- حالات التوصيل (6): جديد، قيد التجهيز، استلمته شركة التوصيل، في الطريق، تم التسليم، تعذر التسليم
- حالات التسوية (3): قيد المعالجة، قيد التنفيذ، مدفوع
- حالات دفع القسط (4): مستحق، مدفوع، متأخر، قادم
- حالات الموظف (4): نشط، إجازة، متوقف، منتهي الخدمة
- حالات التاجر (3): نشط، قيد المراجعة، موقوف
- أنواع وثائق الهوية: بطاقة شخصية، جواز سفر
- حالات التحقق (4): بانتظار المراجعة، تم التحقق، تعذر التحقق، طلب إعادة الرفع
- حالات طلب التقسيط (7): طلب جديد، قيد المراجعة، بانتظار المستندات، بانتظار التحقق من الهوية، موافق، مرفوض، مكتمل

---

## المكونات

### Layout
- Header: شعار، تنقل، بحث، سلة، دخول/خروج، قائمة جانبية للجوال
- Footer: روابط، معلومات
- BottomNav: تنقل سفلي للجوال
- DashboardLayout: شريط جانبي للديسكتوب + قائمة Sheet للجوال، هيدر مع إشعارات وملف المستخدم

### UI
- ProductCard: صورة، اسم، سعر نقدي/تقسيط، تقييم، زر سلة
- StatCard: عنوان، قيمة، أيقونة، وصف، لون
- StatusBadge: حالة مع لون
- EmptyState: أيقونة، رسالة، زر اختياري
- جميع مكونات shadcn/ui (button, card, input, select, table, dialog, sheet, tabs, etc.)

---

## تدفق التمويل والتقسيط

1. الموظف يختار منتج ويحدد التقسيط ومدته
2. إنشاء طلب تقسيط (REQ-XXXX)
3. إشعار المدير بطلب جديد
4. الشركة تراجع وتوافق/ترفض (companyApproved)
5. التحقق من الهوية (إذا لم يتم بعد)
6. المدير يراجع ويوافق/يرفض
7. عند الموافقة: توليد جدول أقساط شهرية + إنشاء عقد (CON-XXXX)
8. إشعار الموظف
9. تحديث usedLimit للموظف
10. الدفعات الشهرية (PAY-XXXX)
11. إكمال العقد عند سداد جميع الأقساط

---

## طبقة تكامل API (api-integration.ts)

جميعها stubs للتكامل المستقبلي:
- verifySalary: تحقق راتب وهمي (verified: true, monthlySalary: 250000)
- processPayment: معالجة دفع وهمية
- getCreditScore: نقاط ائتمان وهمية (750، مخاطر منخفضة)
- submitKYCVerification: تحقق KYC وهمي (confidence: 0.95)
- isBankIntegrationConfigured / isPaymentGatewayConfigured: كلاهما false

---

## الأمان

- RLS مفعّل على جميع الجداول
- سياسات ملكية: auth.uid() للملفات الشخصية
- سياسات تجارية: التاجر يرى/يعدل منتجاته وطلباته
- سياسات شركة: ترى طلبات تمويل موظفيها
- OTP مشفر SHA-256
- سجلات تدقيق شاملة (OTP، وصول الهوية، جميع العمليات)
- التحقق من الهوية مع موافقة صريحة على معالجة البيانات الحساسة
- Column-level privileges للأعمدة الحساسة (الأدوار، الأرصدة، حالات الحظر)
- SECURITY DEFINER functions للعمليات المميزة
- رسائل خطأ عامة للمستخدم، تفاصيل في السجلات فقط

---

## المتطلبات الإضافية

- تصميم جميل واحترافي وليس قالبياً
- حركات وmicro-interactions ذكية
- حالات hover وانتقالات
- تباين ألوان مقروء على جميع الخلفيات
- لا تستخدم الأرجواني/البنفسجي ما لم يُطلب
- تأكد من عمل جميع التدفقات من البداية للنهاية بدون dead ends
- تعامل مع الأخطاء بشكل واضح للمستخدم
- لا تفترض نجاح I/O دائماً
- اكتب كود نظيف ومطابق لقواعد المشروع
