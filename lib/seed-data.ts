import type {
  User,
  Employee,
  Company,
  Merchant,
  Product,
  Order,
  InstallmentApplication,
  InstallmentContract,
  Payment,
  Settlement,
  Delivery,
  Notification,
  AuditLog,
} from "./types";
import { calculateDeferredPrice, calculateMonthlyInstallment } from "./brand";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

function rid(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

// ============================================================
// USERS
// ============================================================
export const seedUsers: User[] = [
  { id: "u-admin", email: "admin@demo.com", name: "مدير المنصة", role: "admin", phone: "0770000000", createdAt: daysAgo(120) },
  { id: "u-employee", email: "employee@demo.com", name: "أحمد محمد الصالح", role: "employee", phone: "0771111111", createdAt: daysAgo(90) },
  { id: "u-merchant", email: "merchant@demo.com", name: "خالد العولقي", role: "merchant", phone: "0772222222", createdAt: daysAgo(100) },
  { id: "u-company", email: "company@demo.com", name: "شركة الأمل للمقاولات", role: "company", phone: "0773333333", createdAt: daysAgo(110) },
  { id: "u-customer", email: "customer@demo.com", name: "سارة أحمد العمري", role: "customer", phone: "0771212121", createdAt: daysAgo(45), verificationStatus: "تم التحقق", status: "active" },
  { id: "u-financial", email: "financial@demo.com", name: "الجهة المالية التجريبية", role: "financial", phone: "0779990000", createdAt: daysAgo(120), status: "active" },
];

// ============================================================
// COMPANIES
// ============================================================
export const seedCompanies: Company[] = [
  { id: "c-1", userId: "u-company", name: "شركة الأمل للمقاولات", contactName: "فهد الأمل", phone: "0773333333", email: "company@demo.com", employeeCount: 50, city: "أمانة العاصمة", status: "نشط", createdAt: daysAgo(110) },
  { id: "c-2", userId: "", name: "مجموعة اليمن للاستثمار", contactName: "سامي الحضرمي", phone: "0774444444", email: "invest@demo.com", employeeCount: 80, city: "عدن", status: "نشط", createdAt: daysAgo(95) },
  { id: "c-3", userId: "", name: "شركة النور للتقنية", contactName: "منى النور", phone: "0775555555", email: "noor@demo.com", employeeCount: 35, city: "تعز", status: "نشط", createdAt: daysAgo(80) },
  { id: "c-4", userId: "", name: "مؤسسة الإباء التجارية", contactName: "علي الإباء", phone: "0776666666", email: "ibaa@demo.com", employeeCount: 25, city: "إب", status: "قيد المراجعة", createdAt: daysAgo(30) },
  { id: "c-5", userId: "", name: "شركة المستقبل للخدمات", contactName: "ريم المستقبل", phone: "0777777777", email: "future@demo.com", employeeCount: 60, city: "الحديدة", status: "نشط", createdAt: daysAgo(60) },
];

// ============================================================
// EMPLOYEES
// ============================================================
export const seedEmployees: Employee[] = [
  { id: "e-1", userId: "u-employee", name: "أحمد محمد الصالح", employeeNumber: "EMP-001", phone: "0771111111", email: "employee@demo.com", companyId: "c-1", jobTitle: "مهندس مدني", salary: 250000, hireDate: daysAgo(800), status: "نشط", eligibility: "مؤهل", installmentLimit: 500000, usedLimit: 122000, city: "أمانة العاصمة" },
  { id: "e-2", userId: "", name: "سالم عبدالله باعباد", employeeNumber: "EMP-002", phone: "0778888888", email: "salem@demo.com", companyId: "c-1", jobTitle: "محاسب", salary: 180000, hireDate: daysAgo(600), status: "نشط", eligibility: "مؤهل", installmentLimit: 400000, usedLimit: 0, city: "أمانة العاصمة" },
  { id: "e-3", userId: "", name: "نورا سعيد الحضرمي", employeeNumber: "EMP-003", phone: "0779999999", email: "noura@demo.com", companyId: "c-2", jobTitle: "مديرة موارد بشرية", salary: 300000, hireDate: daysAgo(1200), status: "نشط", eligibility: "مؤهل", installmentLimit: 600000, usedLimit: 244000, city: "عدن" },
  { id: "e-4", userId: "", name: "محمد الشامي", employeeNumber: "EMP-004", phone: "0771010101", email: "shami@demo.com", companyId: "c-2", jobTitle: "تقني معلومات", salary: 220000, hireDate: daysAgo(400), status: "نشط", eligibility: "مؤهل", installmentLimit: 450000, usedLimit: 0, city: "عدن" },
  { id: "e-5", userId: "", name: "فاطمة العنسي", employeeNumber: "EMP-005", phone: "0772020202", email: "fatima@demo.com", companyId: "c-3", jobTitle: "مصممة جرافيك", salary: 200000, hireDate: daysAgo(500), status: "إجازة", eligibility: "قيد المراجعة", installmentLimit: 350000, usedLimit: 0, city: "تعز" },
  { id: "e-6", userId: "", name: "عبدالرحمن المخلافي", employeeNumber: "EMP-006", phone: "0773030303", email: "abdul@demo.com", companyId: "c-3", jobTitle: "مطور برمجيات", salary: 280000, hireDate: daysAgo(300), status: "نشط", eligibility: "مؤهل", installmentLimit: 550000, usedLimit: 61000, city: "تعز" },
  { id: "e-7", userId: "", name: "هند القباطي", employeeNumber: "EMP-007", phone: "0774040404", email: "hind@demo.com", companyId: "c-1", jobTitle: "سكرتيرة تنفيذية", salary: 150000, hireDate: daysAgo(200), status: "نشط", eligibility: "مؤهل", installmentLimit: 300000, usedLimit: 0, city: "أمانة العاصمة" },
  { id: "e-8", userId: "", name: "يوسف الحمادي", employeeNumber: "EMP-008", phone: "0775050505", email: "yousef@demo.com", companyId: "c-5", jobTitle: "مدير مبيعات", salary: 320000, hireDate: daysAgo(1000), status: "نشط", eligibility: "مؤهل", installmentLimit: 650000, usedLimit: 0, city: "الحديدة" },
];

// ============================================================
// MERCHANTS
// ============================================================
export const seedMerchants: Merchant[] = [
  { id: "m-1", userId: "u-merchant", storeName: "متجر صنعاء", ownerName: "خالد العولقي", phone: "0772222222", email: "merchant@demo.com", city: "أمانة العاصمة", address: "شارع حدة - مقابل جامعة صنعاء", status: "نشط", rating: 4.5, salesTotal: 4500000, createdAt: daysAgo(100) },
  { id: "m-2", userId: "", storeName: "اليمن للإلكترونيات", ownerName: "ماجد الحاشدي", phone: "0776060606", email: "y-electronics@demo.com", city: "أمانة العاصمة", address: "شارع التعاون - مجمع اليمن التجاري", status: "نشط", rating: 4.7, salesTotal: 6200000, createdAt: daysAgo(95) },
  { id: "m-3", userId: "", storeName: "متجر العاصمة", ownerName: "أنس الصبري", phone: "0777070707", email: "capital@demo.com", city: "صنعاء", address: "شارع المطار - مجمع العاصمة", status: "نشط", rating: 4.2, salesTotal: 3100000, createdAt: daysAgo(85) },
  { id: "m-4", userId: "", storeName: "بيت التقنية", ownerName: "وليد البيضاني", phone: "0778080808", email: "tech@demo.com", city: "تعز", address: "شارع جمال - بيت التقنية", status: "نشط", rating: 4.6, salesTotal: 5200000, createdAt: daysAgo(75) },
  { id: "m-5", userId: "", storeName: "مركز الأثاث اليمني", ownerName: "صالح الأهدل", phone: "0779090909", email: "furniture@demo.com", city: "الحديدة", address: "شارع صنعاء - مركز الأثاث", status: "نشط", rating: 4.3, salesTotal: 2800000, createdAt: daysAgo(70) },
  { id: "m-6", userId: "", storeName: "متجر الأناقة", ownerName: "ريم المخلافي", phone: "0770101010", email: "elegant@demo.com", city: "عدن", address: "شارج المعبلا - متجر الأناقة", status: "نشط", rating: 4.4, salesTotal: 1900000, createdAt: daysAgo(65) },
  { id: "m-7", userId: "", storeName: "روائع المنزل", ownerName: "عمر الرويشان", phone: "0770202020", email: "home@demo.com", city: "إب", address: "شارع العدين - روائع المنزل", status: "نشط", rating: 4.1, salesTotal: 1500000, createdAt: daysAgo(55) },
  { id: "m-8", userId: "", storeName: "اليمن فون", ownerName: "نبيل الحاج", phone: "0770303030", email: "yphone@demo.com", city: "أمانة العاصمة", address: "شارع الزبيري - اليمن فون", status: "نشط", rating: 4.8, salesTotal: 7100000, createdAt: daysAgo(50) },
  { id: "m-9", userId: "", storeName: "متجر المستقبل", ownerName: "أحمد المستقبلي", phone: "0770404040", email: "future-store@demo.com", city: "المكلا", address: "شارق الكورنيش - متجر المستقبل", status: "قيد المراجعة", rating: 4.0, salesTotal: 800000, createdAt: daysAgo(20) },
  { id: "m-10", userId: "", storeName: "مركز الحياة", ownerName: "سمير الحياة", phone: "0770505050", email: "life@demo.com", city: "مأرب", address: "شارع السوق - مركز الحياة", status: "نشط", rating: 4.2, salesTotal: 1200000, createdAt: daysAgo(40) },
];

// ============================================================
// PRODUCTS
// ============================================================
function makeProduct(
  n: number,
  merchantId: string,
  merchantName: string,
  name: string,
  description: string,
  cashPrice: number,
  category: Product["category"],
  images: string[],
  city: string,
  specs: { label: string; value: string }[],
  stock = 15,
  featured = false
): Product {
  const deferred = calculateDeferredPrice(cashPrice);
  return {
    id: rid("p", n),
    merchantId,
    merchantName,
    name,
    description,
    cashPrice,
    deferredPrice: deferred,
    category,
    stock,
    images,
    installmentAvailable: true,
    city,
    rating: Number((4 + Math.random()).toFixed(1)),
    reviewsCount: Math.floor(Math.random() * 200) + 10,
    soldCount: Math.floor(Math.random() * 500),
    specs,
    featured,
    visible: true,
    createdAt: daysAgo(Math.floor(Math.random() * 60)),
  };
}

export const seedProducts: Product[] = [
  makeProduct(1, "m-8", "اليمن فون", "هاتف iPhone 15 Pro Max 256GB", "هاتف آيفون 15 برو ماكس بسعة 256 جيجابايت، شاشة 6.7 بوصة، كاميرا ثلاثية احترافية، معالج A17 Pro.", 285000, "الهواتف", ["https://images.pexels.com/photos/1294886/pexels-photo-1294886.jpeg"], "أمانة العاصمة", [{ label: "الشاشة", value: "6.7 بوصة" }, { label: "السعة", value: "256GB" }, { label: "المعالج", value: "A17 Pro" }, { label: "الكاميرا", value: "48MP ثلاثية" }], 20, true),
  makeProduct(2, "m-8", "اليمن فون", "هاتف Samsung Galaxy S24 Ultra", "سامسونج جالاكسي S24 ألترا، شاشة Dynamic AMOLED 6.8 بوصة، قلم S-Pen مدمج، كاميرا 200 ميجابكسل.", 260000, "الهواتف", ["https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg"], "أمانة العاصمة", [{ label: "الشاشة", value: "6.8 بوصة" }, { label: "السعة", value: "512GB" }, { label: "الكاميرا", value: "200MP" }], 18, true),
  makeProduct(3, "m-8", "اليمن فون", "هاتف Xiaomi Redmi Note 13", "شاومي ريدمي نوت 13، شاشة AMOLED 6.67 بوصة، بطارية 5000 مللي أمبير، شحن سريع 33W.", 75000, "الهواتف", ["https://images.pexels.com/photos/47261/pexels-photo-47261.jpeg"], "أمانة العاصمة", [{ label: "الشاشة", value: "6.67 بوصة" }, { label: "البطارية", value: "5000mAh" }], 30),
  makeProduct(4, "m-2", "اليمن للإلكترونيات", "لابتوب Dell Inspiron 15", "لابتوب ديل إنسبايرون 15، معالج Intel Core i7، رام 16GB، تخزين SSD 512GB، شاشة 15.6 بوصة.", 320000, "الإلكترونيات", ["https://images.pexels.com/photos/812264/pexels-photo-812264.jpeg"], "أمانة العاصمة", [{ label: "المعالج", value: "Intel Core i7" }, { label: "الرام", value: "16GB" }, { label: "التخزين", value: "512GB SSD" }], 12, true),
  makeProduct(5, "m-2", "اليمن للإلكترونيات", "لابتوب HP Pavilion 14", "لابتوب إتش بي بيفاليون 14، معالج AMD Ryzen 5، رام 8GB، شاشة 14 بوصة Full HD.", 210000, "الإلكترونيات", ["https://images.pexels.com/photos/18105/pexels-photo.jpg"], "أمانة العاصمة", [{ label: "المعالج", value: "AMD Ryzen 5" }, { label: "الرام", value: "8GB" }], 10),
  makeProduct(6, "m-4", "بيت التقنية", "لابتوب ASUS VivoBook", "لابتوب أسوس فيفو بوك، معالج Intel Core i5، شاشة 15.6 بوصة، تصميم أنيق نحيف.", 195000, "الإلكترونيات", ["https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg"], "تعز", [{ label: "المعالج", value: "Intel Core i5" }, { label: "الرام", value: "8GB" }], 8),
  makeProduct(7, "m-5", "مركز الأثاث اليمني", "كنبة صالون 3+2+1", "طقم كنب صالون فاخر 3+2+1، خامة مخمل عالية الجودة، لون رمادي، مصنوع محلياً.", 450000, "الأثاث", ["https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"], "الحديدة", [{ label: "الخامة", value: "مخمل" }, { label: "اللون", value: "رمادي" }, { label: "القطع", value: "3+2+1" }], 5, true),
  makeProduct(8, "m-5", "مركز الأثاث اليمني", "طاولة طعام خشبية 6 أشخاص", "طاولة طعام خشبية فاخرة تتسع لـ 6 أشخاص، خشب زان طبيعي، تصميم عصري.", 180000, "الأثاث", ["https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg"], "الحديدة", [{ label: "الخامة", value: "خشب زان" }, { label: "السعة", value: "6 أشخاص" }], 7),
  makeProduct(9, "m-5", "مركز الأثاث اليمني", "خزانة ملابس 4 بوابات", "خزانة ملابس كبيرة بـ 4 بوابات، خشب MDF، مرايا جانبية، تصميم أنيق.", 230000, "الأثاث", ["https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg"], "الحديدة", [{ label: "الخامة", value: "MDF" }, { label: "البوابات", value: "4" }], 4),
  makeProduct(10, "m-1", "متجر صنعاء", "ثلاجة LG 18 قدم No Frost", "ثلاجة LG 18 قدم نظام No Frost، موفرة للطاقة، درج خضار فريد، تصنيع كوري.", 410000, "الأجهزة المنزلية", ["https://images.pexels.com/photos/3734677/pexels-photo-3734677.jpeg"], "أمانة العاصمة", [{ label: "السعة", value: "18 قدم" }, { label: "النوع", value: "No Frost" }], 6, true),
  makeProduct(11, "m-1", "متجر صنعاء", "غسالة Samsung 12 كيلو", "غسالة سامسونج أوتوماتيك 12 كيلو، تكنولوجيا EcoBubble، توفير في الطاقة والماء.", 295000, "الأجهزة المنزلية", ["https://images.pexels.com/photos/4668227/pexels-photo-4668227.jpeg"], "أمانة العاصمة", [{ label: "السعة", value: "12 كيلو" }, { label: "النوع", value: "أوتوماتيك" }], 9),
  makeProduct(12, "m-1", "متجر صنعاء", "مكواة بخار Philips", "مكواة بخار فيليبس، قاعدة سيراميك مضادة للالتصاق، بخار متواصل قوي.", 28000, "الأجهزة المنزلية", ["https://images.pexels.com/photos/4338075/pexels-photo-4338075.jpeg"], "أمانة العاصمة", [{ label: "النوع", value: "بخار" }, { label: "القاعدة", value: "سيراميك" }], 25),
  makeProduct(13, "m-6", "متجر الأناقة", "جاكت رجالي شتوي فاخر", "جاكت رجالي شتوي، خامة صوف دافئة، لون كحلي، مقاسات متعددة.", 65000, "الملابس", ["https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg"], "عدن", [{ label: "الخامة", value: "صوف" }, { label: "اللون", value: "كحلي" }], 40),
  makeProduct(14, "m-6", "متجر الأناقة", "عباية نسائية مطرزة", "عباية نسائية أنيقة مطرزة يدوياً، خامة كريب فاخرة، متوفرة بعدة مقاسات.", 55000, "الملابس", ["https://images.pexels.com/photos/1755428/pexels-photo-1755428.jpeg"], "عدن", [{ label: "الخامة", value: "كريب" }, { label: "اللون", value: "أسود مطرز" }], 35),
  makeProduct(15, "m-6", "متجر الأناقة", "حذاء رجالي جلد طبيعي", "حذاء رجالي كلاسيكي جلد طبيعي، صناعة يدوية، لون بني، مريح للقدم.", 48000, "الأحذية", ["https://images.pexels.com/photos/267301/pexels-photo-267301.jpeg"], "عدن", [{ label: "الخامة", value: "جلد طبيعي" }, { label: "اللون", value: "بني" }], 20),
  makeProduct(16, "m-3", "متجر العاصمة", "حذاء رياضي Nike Air Max", "حذاء رياضي نايك إير ماكس، مريح للجري والرياضة، تصميم عصري.", 85000, "الأحذية", ["https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg"], "صنعاء", [{ label: "الماركة", value: "Nike" }, { label: "النوع", value: "رياضي" }], 15),
  makeProduct(17, "m-7", "روائع المنزل", "طقم عطور فرنسية 5 قطع", "طقم عطور فرنسية فاخر، 5 قطع بروائح مختلفة، تدوم طويلاً.", 95000, "العطور", ["https://images.pexels.com/photos/1961795/pexels-photo-1961795.jpeg"], "إب", [{ label: "العدد", value: "5 قطع" }, { label: "النوع", value: "فرنسية" }], 30, true),
  makeProduct(18, "m-7", "روائع المنزل", "عطر رجالي Oud Royal 100ml", "عطر رجالي فاخر بنفحات العود، 100 مل، يدوم 12 ساعة.", 42000, "العطور", ["https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg"], "إب", [{ label: "الحجم", value: "100ml" }, { label: "النوع", value: "عود" }], 50),
  makeProduct(19, "m-6", "متجر الأناقة", "كريم مرطب للوجه للرجال", "كريم مرطب يومي للوجه، مناسب لجميع أنواع البشرة، يرطب ويحمي.", 18000, "الجمال", ["https://images.pexels.com/photos/5938567/pexels-photo-5938567.jpeg"], "عدن", [{ label: "النوع", value: "مرطب" }, { label: "الاستخدام", value: "يومي" }], 60),
  makeProduct(20, "m-7", "روائع المنزل", "طقم مكياج كامل 12 قطعة", "طقم مكياج نسائي كامل، 12 قطعة، ظلال عيون وأحمر شفاه وكونسلر.", 72000, "الجمال", ["https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"], "إب", [{ label: "العدد", value: "12 قطعة" }], 25),
  makeProduct(21, "m-10", "مركز الحياة", "زيت زيتون يمني بكر 5 لتر", "زيت زيتون يمني بكر ممتاز، معصور على البارد، من مزارع اليمن.", 35000, "الأغذية", ["https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg"], "مأرب", [{ label: "الحجم", value: "5 لتر" }, { label: "النوع", value: "بكر ممتاز" }], 100),
  makeProduct(22, "m-10", "مركز الحياة", "عسل سدر يمني حضرمي 1 كيلو", "عسل سدر يمني أصلي من حضرموت، جودة عالية، تعبئة محكمة.", 85000, "الأغذية", ["https://images.pexels.com/photos/162825/honey-sweet-syrup-organic-162825.jpeg"], "مأرب", [{ label: "الوزن", value: "1 كيلو" }, { label: "المصدر", value: "حضرموت" }], 40, true),
  makeProduct(23, "m-3", "متجر العاصمة", "كرسي أطفال آمن للسيارة", "كرسي أطفال آمن للسيارة، قابل للتعديل، حماية جانبية، مناسب من 9 شهر إلى 5 سنوات.", 95000, "مستلزمات الأطفال", ["https://images.pexels.com/photos/3933211/pexels-photo-3933211.jpeg"], "صنعاء", [{ label: "الفئة العمرية", value: "9 شهر - 5 سنوات" }], 12),
  makeProduct(24, "m-3", "متجر العاصمة", "عربية أطفال متعددة الوظائف", "عربة أطفال متعددة الوظائف، قابلة للطي، عجلات كبيرة، سلة تخزين.", 130000, "مستلزمات الأطفال", ["https://images.pexels.com/photos/3933252/pexels-photo-3933252.jpeg"], "صنعاء", [{ label: "النوع", value: "متعدد الوظائف" }], 8),
  makeProduct(25, "m-4", "بيت التقنية", "دراجة هوائية جبلية 27.5", "دراجة هوائية جبلية، إطار 27.5 بوصة، 21 سرعة، فرامل ديسك، ألوان متعددة.", 140000, "الرياضة", ["https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg"], "تعز", [{ label: "الحجم", value: "27.5 بوصة" }, { label: "السرعات", value: "21" }], 10),
  makeProduct(26, "m-4", "بيت التقنية", "طقم أوزان حديدية 50 كيلو", "طقم أوزان حديدية للتمرين المنزلي، 50 كيلو، قابلة للتعديل.", 75000, "الرياضة", ["https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg"], "تعز", [{ label: "الوزن", value: "50 كيلو" }], 15),
  makeProduct(27, "m-2", "اليمن للإلكترونيات", "تلفزيون Samsung 55 بوصة 4K", "تلفزيون سامسونج 55 بوصة، دقة 4K Smart TV، نظام Tizen، واي فاي مدمج.", 340000, "الإلكترونيات", ["https://images.pexels.com/photos/3339849/pexels-photo-3339849.jpeg"], "أمانة العاصمة", [{ label: "الحجم", value: "55 بوصة" }, { label: "الدقة", value: "4K" }], 14, true),
  makeProduct(28, "m-2", "اليمن للإلكترونيات", "تلفزيون LG 43 بوصة Full HD", "تلفزيون LG 43 بوصة، دقة Full HD، Smart TV، تطبيقات متعددة.", 195000, "الإلكترونيات", ["https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg"], "أمانة العاصمة", [{ label: "الحجم", value: "43 بوصة" }], 16),
  makeProduct(29, "m-9", "متجر المستقبل", "إطار سيارة سبورر 17 بوصة", "إطار سيارة سبورر 17 بوصة، جودة عالية، مقاوم للاهتراء.", 65000, "السيارات", ["https://images.pexels.com/photos/1905830/pexels-photo-1905830.jpeg"], "المكلا", [{ label: "المقاس", value: "17 بوصة" }], 20),
  makeProduct(30, "m-9", "متجر المستقبل", "بطارية سيارة 70 أمبير", "بطارية سيارة 70 أمبير، أداء قوي، ضمان سنة كاملة.", 55000, "السيارات", ["https://images.pexels.com/photos/4488636/pexels-photo-4488636.jpeg"], "المكلا", [{ label: "السعة", value: "70 أمبير" }], 25),
];

// ============================================================
// ORDERS
// ============================================================
export const seedOrders: Order[] = [
  {
    id: "o-1", orderNumber: "ORD-5001", customerName: "أحمد محمد الصالح", customerId: "e-1",
    items: [{ productId: "p-1", productName: "هاتف iPhone 15 Pro Max 256GB", productImage: "https://images.pexels.com/photos/1294886/pexels-photo-1294886.jpeg", merchantId: "m-8", merchantName: "اليمن فون", quantity: 1, cashPrice: 285000, deferredPrice: calculateDeferredPrice(285000), paymentType: "تقسيط" }],
    total: calculateDeferredPrice(285000), paymentType: "تقسيط", status: "تمت الموافقة",
    city: "أمانة العاصمة", governorate: "أمانة العاصمة", address: "شارع حدة - منزل رقم 12", phone: "0771111111", notes: "", createdAt: daysAgo(5), merchantIds: ["m-8"],
  },
  {
    id: "o-2", orderNumber: "ORD-5002", customerName: "نورا سعيد الحضرمي", customerId: "e-3",
    items: [{ productId: "p-7", productName: "كنبة صالون 3+2+1", productImage: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg", merchantId: "m-5", merchantName: "مركز الأثاث اليمني", quantity: 1, cashPrice: 450000, deferredPrice: calculateDeferredPrice(450000), paymentType: "تقسيط" }],
    total: calculateDeferredPrice(450000), paymentType: "تقسيط", status: "قيد التجهيز",
    city: "عدن", governorate: "عدن", address: "حي المعبلا - شارع 10", phone: "0779999999", notes: "الاتصال قبل التوصيل", createdAt: daysAgo(3), merchantIds: ["m-5"],
  },
  {
    id: "o-3", orderNumber: "ORD-5003", customerName: "عبدالرحمن المخلافي", customerId: "e-6",
    items: [{ productId: "p-4", productName: "لابتوب Dell Inspiron 15", productImage: "https://images.pexels.com/photos/812264/pexels-photo-812264.jpeg", merchantId: "m-2", merchantName: "اليمن للإلكترونيات", quantity: 1, cashPrice: 320000, deferredPrice: calculateDeferredPrice(320000), paymentType: "نقدي" }],
    total: 320000, paymentType: "نقدي", status: "تم التسليم",
    city: "تعز", governorate: "تعز", address: "شارع جمال - مبنى 5", phone: "0773030303", notes: "", createdAt: daysAgo(20), merchantIds: ["m-2"],
  },
  {
    id: "o-4", orderNumber: "ORD-5004", customerName: "سالم عبدالله باعباد", customerId: "e-2",
    items: [{ productId: "p-3", productName: "هاتف Xiaomi Redmi Note 13", productImage: "https://images.pexels.com/photos/47261/pexels-photo-47261.jpeg", merchantId: "m-8", merchantName: "اليمن فون", quantity: 2, cashPrice: 75000, deferredPrice: calculateDeferredPrice(75000), paymentType: "نقدي" }],
    total: 150000, paymentType: "نقدي", status: "تم الشحن",
    city: "أمانة العاصمة", governorate: "أمانة العاصمة", address: "شارع التعاون - عمارة 7", phone: "0778888888", notes: "", createdAt: daysAgo(2), merchantIds: ["m-8"],
  },
  {
    id: "o-5", orderNumber: "ORD-5005", customerName: "يوسف الحمادي", customerId: "e-8",
    items: [{ productId: "p-22", productName: "عسل سدر يمني حضرمي 1 كيلو", productImage: "https://images.pexels.com/photos/162825/honey-sweet-syrup-organic-162825.jpeg", merchantId: "m-10", merchantName: "مركز الحياة", quantity: 3, cashPrice: 85000, deferredPrice: calculateDeferredPrice(85000), paymentType: "نقدي" }],
    total: 255000, paymentType: "نقدي", status: "جديد",
    city: "الحديدة", governorate: "الحديدة", address: "شارع صنعاء - حي السلام", phone: "0775050505", notes: "تغليف هدايا", createdAt: daysAgo(1), merchantIds: ["m-10"],
  },
  {
    id: "o-6", orderNumber: "ORD-5006", customerName: "محمد الشامي", customerId: "e-4",
    items: [{ productId: "p-27", productName: "تلفزيون Samsung 55 بوصة 4K", productImage: "https://images.pexels.com/photos/3339849/pexels-photo-3339849.jpeg", merchantId: "m-2", merchantName: "اليمن للإلكترونيات", quantity: 1, cashPrice: 340000, deferredPrice: calculateDeferredPrice(340000), paymentType: "تقسيط" }],
    total: calculateDeferredPrice(340000), paymentType: "تقسيط", status: "قيد المراجعة",
    city: "عدن", governorate: "عدن", address: "حي التواهي - شارع الكورنيش", phone: "0771010101", notes: "", createdAt: daysAgo(1), merchantIds: ["m-2"],
  },
  {
    id: "o-7", orderNumber: "ORD-5007", customerName: "هند القباطي", customerId: "e-5",
    items: [{ productId: "p-14", productName: "عباية نسائية مطرزة", productImage: "https://images.pexels.com/photos/1755428/pexels-photo-1755428.jpeg", merchantId: "m-6", merchantName: "متجر الأناقة", quantity: 1, cashPrice: 55000, deferredPrice: calculateDeferredPrice(55000), paymentType: "نقدي" }],
    total: 55000, paymentType: "نقدي", status: "ملغي",
    city: "تعز", governorate: "تعز", address: "شارع جمال", phone: "0772020202", notes: "تم الإلغاء لعدم التوفر", createdAt: daysAgo(15), merchantIds: ["m-6"],
  },
];

// ============================================================
// INSTALLMENT APPLICATIONS
// ============================================================
export const seedInstallmentApplications: InstallmentApplication[] = [
  {
    id: "ia-1", applicationNumber: "INS-10021", employeeId: "e-1", employeeName: "أحمد محمد الصالح",
    companyId: "c-1", companyName: "شركة الأمل للمقاولات", productId: "p-1", productName: "هاتف iPhone 15 Pro Max 256GB",
    merchantId: "m-8", merchantName: "اليمن فون", cashPrice: 285000, deferredPrice: calculateDeferredPrice(285000),
    durationMonths: 12, monthlyInstallment: calculateMonthlyInstallment(calculateDeferredPrice(285000), 12),
    status: "مقبول", createdAt: daysAgo(5), reviewedAt: daysAgo(3), reviewedBy: "مدير المنصة",
  },
  {
    id: "ia-2", applicationNumber: "INS-10022", employeeId: "e-3", employeeName: "نورا سعيد الحضرمي",
    companyId: "c-2", companyName: "مجموعة اليمن للاستثمار", productId: "p-7", productName: "كنبة صالون 3+2+1",
    merchantId: "m-5", merchantName: "مركز الأثاث اليمني", cashPrice: 450000, deferredPrice: calculateDeferredPrice(450000),
    durationMonths: 18, monthlyInstallment: calculateMonthlyInstallment(calculateDeferredPrice(450000), 18),
    status: "مقبول", createdAt: daysAgo(10), reviewedAt: daysAgo(8), reviewedBy: "مدير المنصة",
  },
  {
    id: "ia-3", applicationNumber: "INS-10023", employeeId: "e-4", employeeName: "محمد الشامي",
    companyId: "c-2", companyName: "مجموعة اليمن للاستثمار", productId: "p-27", productName: "تلفزيون Samsung 55 بوصة 4K",
    merchantId: "m-2", merchantName: "اليمن للإلكترونيات", cashPrice: 340000, deferredPrice: calculateDeferredPrice(340000),
    durationMonths: 12, monthlyInstallment: calculateMonthlyInstallment(calculateDeferredPrice(340000), 12),
    status: "قيد المراجعة", createdAt: daysAgo(1),
  },
  {
    id: "ia-4", applicationNumber: "INS-10024", employeeId: "e-6", employeeName: "عبدالرحمن المخلافي",
    companyId: "c-3", companyName: "شركة النور للتقنية", productId: "p-4", productName: "لابتوب Dell Inspiron 15",
    merchantId: "m-2", merchantName: "اليمن للإلكترونيات", cashPrice: 320000, deferredPrice: calculateDeferredPrice(320000),
    durationMonths: 12, monthlyInstallment: calculateMonthlyInstallment(calculateDeferredPrice(320000), 12),
    status: "مكتمل", createdAt: daysAgo(60), reviewedAt: daysAgo(58), reviewedBy: "مدير المنصة",
  },
  {
    id: "ia-5", applicationNumber: "INS-10025", employeeId: "e-1", employeeName: "أحمد محمد الصالح",
    companyId: "c-1", companyName: "شركة الأمل للمقاولات", productId: "p-10", productName: "ثلاجة LG 18 قدم No Frost",
    merchantId: "m-1", merchantName: "متجر صنعاء", cashPrice: 410000, deferredPrice: calculateDeferredPrice(410000),
    durationMonths: 12, monthlyInstallment: calculateMonthlyInstallment(calculateDeferredPrice(410000), 12),
    status: "جديد", createdAt: daysAgo(0),
  },
];

// ============================================================
// INSTALLMENT CONTRACTS
// ============================================================
function generatePayments(totalAmount: number, months: number, paidCount: number) {
  const monthly = calculateMonthlyInstallment(totalAmount, months);
  const payments = [];
  for (let i = 1; i <= months; i++) {
    const dueDate = daysFromNow(30 * (i - paidCount));
    let status: "مستحق" | "مدفوع" | "متأخر" | "قادم" = "قادم";
    if (i <= paidCount) {
      status = "مدفوع";
    } else if (i === paidCount + 1) {
      status = "مستحق";
    }
    payments.push({
      number: i,
      amount: monthly,
      dueDate,
      status,
      paidAt: i <= paidCount ? daysAgo(30 * (paidCount - i + 1)) : undefined,
    });
  }
  return payments;
}

export const seedInstallmentContracts: InstallmentContract[] = [
  {
    id: "ic-1", applicationId: "ia-1", contractNumber: "CON-20001",
    employeeId: "e-1", employeeName: "أحمد محمد الصالح",
    productName: "هاتف iPhone 15 Pro Max 256GB",
    totalAmount: calculateDeferredPrice(285000),
    monthlyInstallment: calculateMonthlyInstallment(calculateDeferredPrice(285000), 12),
    durationMonths: 12, paidAmount: 0, remainingAmount: calculateDeferredPrice(285000),
    paidInstallments: 0, status: "نشط", startDate: daysAgo(3), firstDueDate: daysFromNow(27),
    payments: generatePayments(calculateDeferredPrice(285000), 12, 0),
  },
  {
    id: "ic-2", applicationId: "ia-2", contractNumber: "CON-20002",
    employeeId: "e-3", employeeName: "نورا سعيد الحضرمي",
    productName: "كنبة صالون 3+2+1",
    totalAmount: calculateDeferredPrice(450000),
    monthlyInstallment: calculateMonthlyInstallment(calculateDeferredPrice(450000), 18),
    durationMonths: 18, paidAmount: calculateMonthlyInstallment(calculateDeferredPrice(450000), 18) * 2,
    remainingAmount: calculateDeferredPrice(450000) - calculateMonthlyInstallment(calculateDeferredPrice(450000), 18) * 2,
    paidInstallments: 2, status: "نشط", startDate: daysAgo(60), firstDueDate: daysAgo(30),
    payments: generatePayments(calculateDeferredPrice(450000), 18, 2),
  },
  {
    id: "ic-3", applicationId: "ia-4", contractNumber: "CON-20003",
    employeeId: "e-6", employeeName: "عبدالرحمن المخلافي",
    productName: "لابتوب Dell Inspiron 15",
    totalAmount: calculateDeferredPrice(320000),
    monthlyInstallment: calculateMonthlyInstallment(calculateDeferredPrice(320000), 12),
    durationMonths: 12,
    paidAmount: calculateMonthlyInstallment(calculateDeferredPrice(320000), 12) * 1,
    remainingAmount: calculateDeferredPrice(320000) - calculateMonthlyInstallment(calculateDeferredPrice(320000), 12) * 1,
    paidInstallments: 1, status: "نشط", startDate: daysAgo(30), firstDueDate: daysAgo(0),
    payments: generatePayments(calculateDeferredPrice(320000), 12, 1),
  },
];

// ============================================================
// PAYMENTS
// ============================================================
export const seedPayments: Payment[] = [
  { id: "pay-1", paymentNumber: "PAY-30001", contractId: "ic-2", employeeName: "نورا سعيد الحضرمي", amount: calculateMonthlyInstallment(calculateDeferredPrice(450000), 18), status: "ناجح", method: "محفظة إلكترونية", createdAt: daysAgo(30), installmentNumber: 1 },
  { id: "pay-2", paymentNumber: "PAY-30002", contractId: "ic-2", employeeName: "نورا سعيد الحضرمي", amount: calculateMonthlyInstallment(calculateDeferredPrice(450000), 18), status: "ناجح", method: "تحويل بنكي", createdAt: daysAgo(0), installmentNumber: 2 },
  { id: "pay-3", paymentNumber: "PAY-30003", contractId: "ic-3", employeeName: "عبدالرحمن المخلافي", amount: calculateMonthlyInstallment(calculateDeferredPrice(320000), 12), status: "ناجح", method: "نقدي", createdAt: daysAgo(0), installmentNumber: 1 },
  { id: "pay-4", paymentNumber: "PAY-30004", contractId: "ic-1", employeeName: "أحمد محمد الصالح", amount: calculateMonthlyInstallment(calculateDeferredPrice(285000), 12), status: "قيد المعالجة", method: "محفظة إلكترونية", createdAt: daysAgo(0), installmentNumber: 1 },
];

// ============================================================
// SETTLEMENTS
// ============================================================
export const seedSettlements: Settlement[] = [
  { id: "set-1", merchantId: "m-2", merchantName: "اليمن للإلكترونيات", orderId: "o-3", orderNumber: "ORD-5003", saleValue: 320000, merchantAmount: 304000, status: "مدفوع", date: daysAgo(15) },
  { id: "set-2", merchantId: "m-5", merchantName: "مركز الأثاث اليمني", orderId: "o-2", orderNumber: "ORD-5002", saleValue: calculateDeferredPrice(450000), merchantAmount: 427500, status: "قيد التنفيذ", date: daysAgo(2) },
  { id: "set-3", merchantId: "m-8", merchantName: "اليمن فون", orderId: "o-1", orderNumber: "ORD-5001", saleValue: calculateDeferredPrice(285000), merchantAmount: 270750, status: "قيد المعالجة", date: daysAgo(3) },
];

// ============================================================
// DELIVERIES
// ============================================================
export const seedDeliveries: Delivery[] = [
  { id: "del-1", orderId: "o-1", orderNumber: "ORD-5001", customerName: "أحمد محمد الصالح", governorate: "أمانة العاصمة", city: "أمانة العاصمة", area: "حدة", address: "شارع حدة - منزل رقم 12", phone: "0771111111", notes: "", status: "قيد التجهيز", createdAt: daysAgo(3) },
  { id: "del-2", orderId: "o-2", orderNumber: "ORD-5002", customerName: "نورا سعيد الحضرمي", governorate: "عدن", city: "عدن", area: "المعبلا", address: "حي المعبلا - شارع 10", phone: "0779999999", notes: "الاتصال قبل التوصيل", status: "استلمته شركة التوصيل", createdAt: daysAgo(2) },
  { id: "del-3", orderId: "o-3", orderNumber: "ORD-5003", customerName: "عبدالرحمن المخلافي", governorate: "تعز", city: "تعز", area: "شارع جمال", address: "شارع جمال - مبنى 5", phone: "0773030303", notes: "", status: "تم التسليم", createdAt: daysAgo(18), driverName: "سائق التوصيل - أبو بكر" },
  { id: "del-4", orderId: "o-4", orderNumber: "ORD-5004", customerName: "سالم عبدالله باعباد", governorate: "أمانة العاصمة", city: "أمانة العاصمة", area: "التعاون", address: "شارع التعاون - عمارة 7", phone: "0778888888", notes: "", status: "في الطريق", createdAt: daysAgo(1), driverName: "سائق التوصيل - منصور" },
];

// ============================================================
// NOTIFICATIONS
// ============================================================
export const seedNotifications: Notification[] = [
  { id: "n-1", userId: "u-employee", title: "تم قبول طلب التقسيط", message: "تم قبول طلب التقسيط الخاص بك لهاتف iPhone 15 Pro Max 256GB", type: "installment", read: false, createdAt: daysAgo(3), link: "/employee/installments" },
  { id: "n-2", userId: "u-employee", title: "طلبك قيد التجهيز", message: "طلبك رقم ORD-5001 قيد التجهيز لدى التاجر", type: "order", read: false, createdAt: daysAgo(2), link: "/employee/orders" },
  { id: "n-3", userId: "u-employee", title: "موعد القسط القادم", message: "موعد القسط القادم بعد 27 يوماً بقيمة 34,775 ريال", type: "installment", read: true, createdAt: daysAgo(1), link: "/employee/installments" },
  { id: "n-4", userId: "u-merchant", title: "طلب جديد", message: "استلمت طلباً جديداً رقم ORD-5001", type: "order", read: false, createdAt: daysAgo(3), link: "/merchant/orders" },
  { id: "n-5", userId: "u-admin", title: "طلب تقسيط جديد", message: "طلب تقسيط جديد رقم INS-10025 بانتظار المراجعة", type: "installment", read: false, createdAt: daysAgo(0), link: "/admin/installments" },
  { id: "n-6", userId: "u-company", title: "موظف جديد انضم", message: "تم تسجيل الموظف عبدالرحمن المخلافي في شركتك", type: "system", read: true, createdAt: daysAgo(30), link: "/company/employees" },
];

// ============================================================
// AUDIT LOGS
// ============================================================
export const seedAuditLogs: AuditLog[] = [
  { id: "log-1", actor: "مدير المنصة", actorRole: "admin", action: "وافق على طلب تقسيط", entity: "InstallmentApplication", entityId: "ia-1", timestamp: daysAgo(3), details: "الموافقة على طلب تقسيط رقم INS-10021 للموظف أحمد محمد الصالح" },
  { id: "log-2", actor: "خالد العولقي", actorRole: "merchant", action: "تحديث حالة طلب", entity: "Order", entityId: "o-1", timestamp: daysAgo(2), details: "تحديث حالة الطلب ORD-5001 إلى: قيد التجهيز" },
  { id: "log-3", actor: "أحمد محمد الصالح", actorRole: "employee", action: "إنشاء طلب", entity: "Order", entityId: "o-1", timestamp: daysAgo(5), details: "إنشاء طلب تقسيط رقم ORD-5001" },
  { id: "log-4", actor: "مدير المنصة", actorRole: "admin", action: "تسجيل دفعة", entity: "Payment", entityId: "pay-3", timestamp: daysAgo(0), details: "تسجيل دفعة تجريبية بقيمة 32,533 ريال للعقد CON-20003" },
  { id: "log-5", actor: "خالد العولقي", actorRole: "merchant", action: "تحديث حالة طلب", entity: "Order", entityId: "o-3", timestamp: daysAgo(18), details: "تحديث حالة الطلب ORD-5003 إلى: تم التسليم" },
];
