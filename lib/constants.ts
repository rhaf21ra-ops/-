export const GOVERNORATES = [
  "أمانة العاصمة",
  "صنعاء",
  "عدن",
  "تعز",
  "إب",
  "الحديدة",
  "حضرموت",
  "المكلا",
  "مأرب",
  "ذمار",
  "البيضاء",
  "لحج",
  "أبين",
  "شبوة",
  "حجة",
  "صعدة",
  "ريمة",
  "المحويت",
  "عمران",
  "الضالع",
  "الجوف",
  "سقطرى",
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

export const CATEGORIES = [
  "الإلكترونيات",
  "الهواتف",
  "الأجهزة المنزلية",
  "الأثاث",
  "الملابس",
  "الأحذية",
  "العطور",
  "الجمال",
  "الأغذية",
  "مستلزمات الأطفال",
  "الرياضة",
  "السيارات",
  "أخرى",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<string, string> = {
  "الإلكترونيات": "laptop",
  "الهواتف": "smartphone",
  "الأجهزة المنزلية": "washing-machine",
  "الأثاث": "sofa",
  "الملابس": "shirt",
  "الأحذية": "footprints",
  "العطور": "flower",
  "الجمال": "sparkles",
  "الأغذية": "utensils",
  "مستلزمات الأطفال": "baby",
  "الرياضة": "dumbbell",
  "السيارات": "car",
  "أخرى": "tag",
};

export const ORDER_STATUSES = [
  "جديد",
  "قيد المراجعة",
  "تمت الموافقة",
  "قيد التجهيز",
  "تم الشحن",
  "تم التسليم",
  "ملغي",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const INSTALLMENT_STATUSES = [
  "جديد",
  "قيد المراجعة",
  "مقبول",
  "مرفوض",
  "مكتمل",
  "متعثر",
  "نشط",
] as const;

export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number];

export const PAYMENT_STATUSES = ["ناجح", "فشل", "قيد المعالجة"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUSES_EN: Record<PaymentStatus, string> = {
  "ناجح": "Success",
  "فشل": "Failed",
  "قيد المعالجة": "Pending",
};

export const DELIVERY_STATUSES = [
  "جديد",
  "قيد التجهيز",
  "استلمته شركة التوصيل",
  "في الطريق",
  "تم التسليم",
  "تعذر التسليم",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const SETTLEMENT_STATUSES = ["قيد المعالجة", "قيد التنفيذ", "مدفوع"] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const INSTALLMENT_PAYMENT_STATUSES = ["مستحق", "مدفوع", "متأخر", "قادم"] as const;
export type InstallmentPaymentStatus = (typeof INSTALLMENT_PAYMENT_STATUSES)[number];

export const EMPLOYEE_STATUSES = ["نشط", "إجازة", "متوقف", "منتهي الخدمة"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const MERCHANT_STATUSES = ["نشط", "قيد المراجعة", "موقوف"] as const;
export type MerchantStatus = (typeof MERCHANT_STATUSES)[number];

export const ORDER_TYPE = ["نقدي", "تقسيط"] as const;
export type OrderType = (typeof ORDER_TYPE)[number];

export type UserRole = "customer" | "employee" | "merchant" | "company" | "admin" | "financial" | "staff";

export const ROLE_LABELS: Record<UserRole, string> = {
  customer: "عميل",
  employee: "موظف",
  merchant: "تاجر",
  company: "شركة",
  admin: "مدير المنصة",
  financial: "الجهة المالية التجريبية",
  staff: "موظف المنصة",
};

export const REGISTERABLE_ROLES: UserRole[] = ["customer", "employee", "merchant", "company"];

export type UserStatus = "pending" | "active" | "rejected" | "suspended";

export const USER_STATUSES: UserStatus[] = ["pending", "active", "rejected", "suspended"];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending: "بانتظار التفعيل",
  active: "نشط",
  rejected: "مرفوض",
  suspended: "موقوف",
};

export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  pending: "yellow",
  active: "green",
  rejected: "red",
  suspended: "orange",
};

export type Permission =
  | "view_profile"
  | "edit_profile"
  | "view_orders"
  | "create_order"
  | "view_installments"
  | "view_company"
  | "manage_employees"
  | "manage_products"
  | "manage_orders"
  | "manage_settlements"
  | "manage_users"
  | "review_identity"
  | "manage_financing"
  | "view_reports";

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_profile: "عرض الملف الشخصي",
  edit_profile: "تعديل الملف الشخصي",
  view_orders: "عرض الطلبات",
  create_order: "إنشاء طلب",
  view_installments: "عرض الأقساط",
  view_company: "عرض الشركة",
  manage_employees: "إدارة الموظفين",
  manage_products: "إدارة المنتجات",
  manage_orders: "إدارة الطلبات",
  manage_settlements: "إدارة التسويات",
  manage_users: "إدارة المستخدمين",
  review_identity: "مراجعة الهوية",
  manage_financing: "إدارة التمويل",
  view_reports: "عرض التقارير",
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  customer: ["view_profile", "edit_profile", "view_orders", "create_order", "view_installments"],
  employee: ["view_profile", "edit_profile", "view_orders", "create_order", "view_installments"],
  merchant: ["view_profile", "edit_profile", "manage_products", "manage_orders", "manage_settlements", "view_reports"],
  company: ["view_profile", "edit_profile", "view_company", "manage_employees", "view_orders", "view_reports"],
  admin: [
    "view_profile", "edit_profile", "view_orders", "create_order", "view_installments",
    "view_company", "manage_employees", "manage_products", "manage_orders", "manage_settlements",
    "manage_users", "review_identity", "manage_financing", "view_reports",
  ],
  financial: ["view_profile", "edit_profile", "manage_financing", "view_reports"],
  staff: ["view_profile", "edit_profile", "review_identity"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  customer: "/customer",
  employee: "/employee",
  merchant: "/merchant",
  company: "/company",
  admin: "/admin",
  financial: "/financial",
  staff: "/staff/identity",
};

export type IdentityDocumentType = "بطاقة شخصية" | "جواز سفر";

export const IDENTITY_DOCUMENT_TYPES: IdentityDocumentType[] = ["بطاقة شخصية", "جواز سفر"];

export type VerificationStatus = "بانتظار المراجعة" | "تم التحقق" | "تعذر التحقق" | "طلب إعادة الرفع";

export const VERIFICATION_STATUSES: VerificationStatus[] = [
  "بانتظار المراجعة",
  "تم التحقق",
  "تعذر التحقق",
  "طلب إعادة الرفع",
];

export type InstallmentRequestStatus =
  | "طلب جديد"
  | "قيد المراجعة"
  | "بانتظار المستندات"
  | "بانتظار التحقق من الهوية"
  | "موافق"
  | "مرفوض"
  | "مكتمل";

export const INSTALLMENT_REQUEST_STATUSES: InstallmentRequestStatus[] = [
  "طلب جديد",
  "قيد المراجعة",
  "بانتظار المستندات",
  "بانتظار التحقق من الهوية",
  "موافق",
  "مرفوض",
  "مكتمل",
];
