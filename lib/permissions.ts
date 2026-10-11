// Permission catalog (same codes as supabase/migrations/0002), built-in staff roles, and page access rules.
// The database is the real enforcement (RLS + has_permission). This file only decides which pages to show.

export const PERMISSIONS: { code: string; label: string }[] = [
  { code: "identity.review", label: "مراجعة وتأكيد هوية الحسابات" },
  { code: "merchants.view", label: "عرض التجار ومتاجرهم" },
  { code: "merchants.manage", label: "تفعيل/إيقاف التجار ومراجعة منتجاتهم" },
  { code: "financing.view", label: "عرض طلبات التمويل والعقود والأقساط" },
  { code: "financing.review", label: "مراجعة طلبات التمويل وإضافة ملاحظات" },
  { code: "payments.record", label: "تسجيل دفعات الأقساط" },
  { code: "orders.view", label: "عرض الطلبات" },
  { code: "orders.update", label: "تحديث حالة الطلبات والتوصيل" },
  { code: "support.manage", label: "الرد على تذاكر الدعم" },
];

export const BASE_ROLES = ["customer", "employee", "merchant", "company", "admin", "financial"] as const;

export type RoleDef = { name: string; label: string; perms: string[]; builtin: boolean };

export const BUILTIN_STAFF_ROLES: RoleDef[] = [
  { name: "staff_verification", label: "موظف مراقبة تأكيد الحساب", perms: ["identity.review"], builtin: true },
  { name: "staff_merchants", label: "موظف متابعة التجار", perms: ["merchants.view", "merchants.manage"], builtin: true },
  { name: "staff_financing", label: "موظف متابعة التمويلات", perms: ["financing.view", "financing.review", "payments.record"], builtin: true },
  { name: "staff_orders", label: "موظف الطلبات والتوصيل", perms: ["orders.view", "orders.update"], builtin: true },
  { name: "staff_support", label: "موظف الدعم", perms: ["support.manage"], builtin: true },
];

export const ROLE_LABEL_AR: Record<string, string> = {
  customer: "عميل", employee: "موظف (مشترٍ)", merchant: "تاجر", company: "شركة", admin: "المالك", financial: "الجهة المالية",
};

export const isStaffRole = (name: string) => !(BASE_ROLES as readonly string[]).includes(name);

/** Pages a staff member may open when they hold ANY of the listed permissions. Everything else under /admin is owner-only. */
export const PAGE_PERMISSIONS: [prefix: string, anyOf: string[]][] = [
  ["/staff/identity", ["identity.review"]],
  ["/admin/merchants", ["merchants.view"]],
  ["/admin/products", ["merchants.view"]],
  ["/admin/orders", ["orders.view"]],
  ["/admin/delivery", ["orders.view", "orders.update"]],
  ["/admin/installments", ["financing.view"]],
  ["/admin/payments", ["payments.record", "financing.view"]],
];

export type AccessSubject = { roles: string[]; permissions: string[] } | null;

const startsWithPath = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

/** Can this user open this path? Public paths return true. */
export function canAccess(path: string, who: AccessSubject): boolean {
  const roleOf = (r: string) => !!who && who.roles.includes(r);
  const isOwner = roleOf("admin");
  const hasStaff = !!who && who.roles.some(isStaffRole);

  if (startsWithPath(path, "/staff")) {
    if (isOwner) return true;
    if (!who || !hasStaff) return false;
    const rule = PAGE_PERMISSIONS.find(([p]) => startsWithPath(path, p));
    return rule ? rule[1].some((c) => who.permissions.includes(c)) : who.permissions.length > 0;
  }
  if (startsWithPath(path, "/admin-login")) return true;
  if (startsWithPath(path, "/admin")) {
    if (isOwner) return true;
    if (!who || !hasStaff) return false;
    const rule = PAGE_PERMISSIONS.find(([p]) => startsWithPath(path, p));
    return !!rule && rule[1].some((c) => who.permissions.includes(c));
  }
  if (startsWithPath(path, "/customer")) return roleOf("customer") || roleOf("employee") || isOwner;
  if (startsWithPath(path, "/employee")) return roleOf("employee") || isOwner;
  if (startsWithPath(path, "/merchant") && !startsWithPath(path, "/merchants")) return roleOf("merchant") || isOwner;
  if (startsWithPath(path, "/company")) return roleOf("company") || isOwner;
  if (startsWithPath(path, "/financial")) return roleOf("financial") || isOwner;
  return true;
}

export const needsLogin = (path: string) =>
  ["/customer", "/employee", "/merchant", "/company", "/financial", "/admin", "/staff"].some((p) => startsWithPath(path, p)) &&
  !startsWithPath(path, "/merchants") && !startsWithPath(path, "/admin-login");
