// REAL MODE data layer: reads the signed-in user's view of the database (RLS decides what each role sees)
// and maps it onto the shapes the dashboards already use. All writes go through RPCs / RLS-guarded inserts.
import { supabase } from "@/lib/supabase-client";
import type {
  User, Employee, Company, Merchant, Product, Order, OrderItem, InstallmentApplication, InstallmentContract,
  Payment, Settlement, Delivery, Notification, AuditLog, InstallmentRequest, FinancingDetails,
  InstallmentPaymentSchedule, OrderStatus, DeliveryStatus,
} from "@/lib/types";
import type { UserRole, InstallmentStatus, MerchantStatus, EmployeeStatus, VerificationStatus } from "@/lib/constants";
import type { GuaranteeType } from "@/components/GuaranteeSelect";
import type { BranchRecord } from "@/lib/branches";

type Row = Record<string, any>;
const one = <T,>(x: T | T[] | null | undefined): T | undefined => (Array.isArray(x) ? x[0] : x ?? undefined);
const num = (x: unknown) => Number(x ?? 0);

async function safe<T>(label: string, p: PromiseLike<{ data: T | null; error: any }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await p;
    if (error) { console.warn(`[real-data] ${label}:`, error.message); return fallback; }
    return (data ?? fallback) as T;
  } catch (e) {
    console.warn(`[real-data] ${label} failed`, e);
    return fallback;
  }
}

// ── status maps ───────────────────────────────────────────────
const MERCHANT_AR: Record<string, MerchantStatus> = { pending: "قيد المراجعة", active: "نشط", suspended: "موقوف" };
const MERCHANT_DB: Record<string, string> = { "قيد المراجعة": "pending", "نشط": "active", "موقوف": "suspended" };
const EMP_STATUS_AR: Record<string, EmployeeStatus> = { active: "نشط", on_leave: "إجازة", suspended: "متوقف", terminated: "منتهي الخدمة" };
const EMP_STATUS_DB: Record<string, string> = { "نشط": "active", "إجازة": "on_leave", "متوقف": "suspended", "منتهي الخدمة": "terminated" };
const ELIG_AR: Record<string, Employee["eligibility"]> = { pending: "قيد المراجعة", eligible: "مؤهل", ineligible: "غير مؤهل" };
const ELIG_DB: Record<string, string> = { "قيد المراجعة": "pending", "مؤهل": "eligible", "غير مؤهل": "ineligible" };
const ORDER_AR: Record<string, OrderStatus> = {
  new: "جديد", under_review: "قيد المراجعة", awaiting_payment: "قيد المراجعة", approved: "تمت الموافقة", processing: "قيد التجهيز",
  shipped: "تم الشحن", delivery_failed: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي", returned: "ملغي", refunded: "ملغي",
};
export const ORDER_DB: Record<string, string> = {
  "قيد المراجعة": "under_review", "تمت الموافقة": "approved", "قيد التجهيز": "processing", "تم الشحن": "shipped", "تم التسليم": "delivered", "ملغي": "cancelled",
};
export const DELIVERY_DB: Record<string, string> = {
  "قيد التجهيز": "processing", "استلمته شركة التوصيل": "shipped", "في الطريق": "shipped", "تم التسليم": "delivered", "تعذر التسليم": "delivery_failed",
};
const DELIVERY_AR: Record<string, DeliveryStatus> = {
  new: "جديد", under_review: "جديد", awaiting_payment: "جديد", approved: "جديد", processing: "قيد التجهيز", shipped: "في الطريق",
  delivery_failed: "تعذر التسليم", delivered: "تم التسليم",
};
const SETTLEMENT_AR: Record<string, Settlement["status"]> = { processing: "قيد المعالجة", in_progress: "قيد التنفيذ", paid: "مدفوع" };
export const SETTLEMENT_DB: Record<string, string> = { "قيد المعالجة": "processing", "قيد التنفيذ": "in_progress", "مدفوع": "paid" };
const IDENT_AR: Record<string, VerificationStatus | undefined> = {
  pending: "بانتظار المراجعة", verified: "تم التحقق", rejected: "تعذر التحقق", needs_changes: "طلب إعادة الرفع",
};
const INST_AR: Record<string, InstallmentPaymentSchedule["status"]> = { due: "مستحق", paid: "مدفوع", overdue: "متأخر", late: "متأخر", upcoming: "قادم" };
const AUDIT_AR: Record<string, string> = {
  order_placed: "إنشاء طلب", order_status_changed: "تغيير حالة طلب", application_approved: "قبول طلب تقسيط", application_rejected: "رفض طلب تقسيط",
  company_approved_application: "موافقة الشركة على طلب", company_rejected_application: "رفض الشركة لطلب", payment_recorded: "تسجيل دفعة",
  merchant_status_changed: "تغيير حالة تاجر", company_status_changed: "تغيير حالة شركة", employee_joined_company: "انضمام موظف لشركة",
  employee_limits_set: "تحديد أهلية وحد موظف", settlement_status: "تحديث تسوية", merchant_commission_changed: "تغيير عمولة تاجر",
  identity_submitted: "إرسال هوية", identity_approved: "قبول هوية", identity_rejected: "رفض هوية",
};

export function applicationStatus(a: Row): InstallmentStatus {
  if (a.status === "rejected") return "مرفوض";
  if (a.status === "approved") return "مقبول";
  if (a.status === "completed") return "مكتمل";
  if (a.review_stage === "company") return "بانتظار الشركة";
  return "قيد المراجعة";
}

function mainRole(roles: string[]): UserRole {
  if (roles.includes("admin")) return "admin";
  if (roles.some((r) => r.startsWith("staff_"))) return "staff";
  for (const r of ["financial", "company", "merchant", "employee", "customer"] as const) if (roles.includes(r)) return r;
  return "customer";
}

export type Snapshot = {
  users: User[]; employees: Employee[]; companies: Company[]; merchants: Merchant[]; products: Product[]; orders: Order[];
  installmentApplications: InstallmentApplication[]; installmentContracts: InstallmentContract[]; installmentRequests: InstallmentRequest[];
  payments: Payment[]; settlements: Settlement[]; deliveries: Delivery[]; notifications: Notification[]; auditLogs: AuditLog[];
  markup: number; branches: BranchRecord[]; guaranteeTypes: GuaranteeType[];
};

// ids of installments, needed to record a payment by (contract, number)
export const installmentIndex: Record<string, Record<number, { id: string; amount: number }>> = {};
// merchant row of the signed-in merchant (store id is needed to insert products)
export const ownStore: { merchantId?: string; storeId?: string } = {};

const publicImage = (r: Row) => r.url || (r.storage_path ? supabase.storage.from("product-images").getPublicUrl(r.storage_path).data.publicUrl : "");
const sortedImages = (rows: Row[] | null | undefined) => [...(rows ?? [])].sort((a, b) => num(a.position) - num(b.position)).map(publicImage).filter(Boolean);

export async function loadSnapshot(userId: string | null): Promise<Snapshot> {
  // Reference data (public)
  const [branchRows, gtRows, markupRaw] = await Promise.all([
    safe<Row[]>("branches", supabase.from("branches").select("id, name, region, active").eq("active", true).limit(1000), []),
    safe<Row[]>("guarantee_types", supabase.from("guarantee_types").select("*").eq("active", true).order("sort_order"), []),
    userId
      ? safe<any>("markup", supabase.rpc("effective_markup"), null)
      : safe<any>("markup", supabase.from("platform_settings").select("value").eq("key", "default_markup_percent").maybeSingle(), null),
  ]);
  const markup = typeof markupRaw === "number" ? markupRaw : Number(markupRaw?.value ?? markupRaw ?? 22) || 22;
  const branches: BranchRecord[] = branchRows.filter((b) => b.region).map((b) => ({ id: b.id, region: b.region, name: b.name, is_active: true }));
  const guaranteeTypes: GuaranteeType[] = gtRows.map((g) => ({
    id: g.id, code: g.code, name_ar: g.name_ar, description_ar: g.description_ar ?? null, requires_guarantor: !!g.requires_guarantor,
    audience: g.audience ?? "both", fields: Array.isArray(g.fields) ? g.fields : [],
  }));
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const gtById = new Map(guaranteeTypes.map((g) => [g.id, g]));

  const [prodRows, merchRows, merchPub, compRows, compPub] = await Promise.all([
    safe<Row[]>("products", supabase.from("products")
      .select("*, stores(name, city, merchant_id), categories(name), product_images(url, storage_path, position)")
      .order("created_at", { ascending: false }).limit(500), []),
    safe<Row[]>("merchants", supabase.from("merchants").select("*").limit(500), []),
    safe<Row[]>("merchants_public", supabase.from("merchants_public").select("*").limit(500), []),
    safe<Row[]>("companies", supabase.from("companies").select("*").limit(500), []),
    safe<Row[]>("companies_public", supabase.from("companies_public").select("*").limit(500), []),
  ]);

  const merchants: Merchant[] = merchRows.map((m) => ({
    id: m.id, userId: m.owner_id, storeName: m.store_name || m.business_name, ownerName: m.owner_name || "", phone: "", email: "", city: "", address: "",
    status: MERCHANT_AR[m.status] ?? "قيد المراجعة", rating: num(m.rating), salesTotal: num(m.sales_total), createdAt: m.created_at,
  }));
  for (const m of merchPub) if (!merchants.some((x) => x.id === m.id)) {
    merchants.push({ id: m.id, userId: "", storeName: m.store_name || m.business_name, ownerName: "", phone: "", email: "", city: "", address: "", status: "نشط", rating: num(m.rating), salesTotal: 0, createdAt: "" });
  }
  const merchantName = new Map(merchants.map((m) => [m.id, m.storeName]));
  if (userId) {
    const mine = merchRows.find((m) => m.owner_id === userId);
    if (mine) {
      ownStore.merchantId = mine.id;
      const st = await safe<Row[]>("own store", supabase.from("stores").select("id").eq("merchant_id", mine.id).limit(1), []);
      ownStore.storeId = st[0]?.id;
    }
  }

  const companiesRaw: Row[] = [...compRows];
  for (const c of compPub) if (!companiesRaw.some((x) => x.id === c.id)) companiesRaw.push({ ...c, status: "active", owner_id: "" });

  const products: Product[] = prodRows.map((p) => {
    const store = one<Row>(p.stores);
    const price = Math.round(num(p.cash_price) * (1 - num(p.discount_percent) / 100));
    const mid = p.merchant_id || store?.merchant_id || "";
    return {
      id: p.id, merchantId: mid, merchantName: merchantName.get(mid) || store?.name || "", name: p.name, description: p.description || "",
      cashPrice: price, deferredPrice: Math.round(price * (1 + markup / 100)), category: (one<Row>(p.categories)?.name || "أخرى") as Product["category"],
      stock: num(p.stock), images: sortedImages(p.product_images), installmentAvailable: p.installment_available !== false,
      city: p.city || store?.city || "", rating: num(p.rating), reviewsCount: 0, soldCount: num(p.sold_count),
      specs: Array.isArray(p.specs) ? p.specs : [], featured: !!p.featured, visible: p.active !== false && p.visible !== false, createdAt: p.created_at,
    };
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  // People
  const [empRows, orderRows, appRows, contractRows, payRows, comRows, notifRows, auditRows, profRows, roleRows, detailRows] = await Promise.all([
    safe<Row[]>("employees", supabase.from("employees").select("*").limit(1000), []),
    safe<Row[]>("orders", supabase.from("orders")
      .select("*, order_items(id, product_id, merchant_id, quantity, unit_price, installment_months, products(name, product_images(url, storage_path, position)))")
      .order("created_at", { ascending: false }).limit(500), []),
    safe<Row[]>("financing_applications", supabase.from("financing_applications").select("*").order("created_at", { ascending: false }).limit(500), []),
    safe<Row[]>("contracts", supabase.from("contracts").select("*, installments(*)").order("created_at", { ascending: false }).limit(500), []),
    safe<Row[]>("payments", supabase.from("payments").select("*, installments(number)").order("paid_at", { ascending: false }).limit(1000), []),
    safe<Row[]>("commissions", supabase.from("commissions").select("*, settlements(status, created_at), order_items(order_id, orders(order_number, created_at), products(name))").order("created_at", { ascending: false }).limit(500), []),
    userId ? safe<Row[]>("notifications", supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100), []) : Promise.resolve([] as Row[]),
    safe<Row[]>("audit_logs", supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200), []),
    safe<Row[]>("user_profiles", supabase.from("user_profiles").select("id, full_name, phone, email, status, identity_status, created_at").limit(1000), []),
    safe<Row[]>("user_roles", supabase.from("user_roles").select("user_id, roles(name)").limit(3000), []),
    safe<Row[]>("guarantee_details", supabase.from("financing_guarantee_details").select("application_id, details").limit(500), []),
  ]);

  const profById = new Map(profRows.map((p) => [p.id, p]));
  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows) { const n = one<Row>(r.roles)?.name; if (n) rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), n]); }
  const users: User[] = profRows.map((p) => ({
    id: p.id, email: p.email || "", name: p.full_name, role: mainRole(rolesByUser.get(p.id) ?? ["customer"]), phone: p.phone || "",
    createdAt: p.created_at, status: p.status, verificationStatus: IDENT_AR[p.identity_status],
  }));

  const employees: Employee[] = empRows.map((e) => {
    const pr = profById.get(e.user_id);
    return {
      id: e.id, userId: e.user_id, name: e.full_name || pr?.full_name || "", employeeNumber: e.employee_number || "", phone: pr?.phone || "",
      email: pr?.email || "", companyId: e.company_id || "", jobTitle: e.job_title || "", salary: num(e.salary), hireDate: e.hire_date || "",
      status: EMP_STATUS_AR[e.status] ?? "نشط", eligibility: ELIG_AR[e.eligibility] ?? "قيد المراجعة", installmentLimit: num(e.installment_limit),
      usedLimit: num(e.used_limit), city: "",
    };
  });
  const empCountByCompany = new Map<string, number>();
  for (const e of employees) empCountByCompany.set(e.companyId, (empCountByCompany.get(e.companyId) ?? 0) + 1);
  const companies: Company[] = companiesRaw.map((c) => ({
    id: c.id, userId: c.owner_id || "", name: c.name, contactName: c.contact_name || "", phone: c.phone || "", email: "",
    employeeCount: c.employee_count ?? empCountByCompany.get(c.id) ?? 0, city: c.city || "", status: MERCHANT_AR[c.status] ?? "قيد المراجعة", createdAt: c.created_at || "",
  }));

  // Orders
  const detailsByApp = new Map(detailRows.map((d) => [d.application_id, d.details as Record<string, string>]));
  const appByOrder = new Map(appRows.filter((a) => a.order_id).map((a) => [a.order_id, a]));
  const financingOf = (a: Row | undefined): FinancingDetails | undefined => {
    if (!a) return undefined;
    const b = branchById.get(a.branch_id);
    const g = gtById.get(a.guarantee_type_id);
    return {
      region: b?.region || "", branchId: a.branch_id || "", branchName: b?.name || "", guaranteeCode: (g?.code || "account") as FinancingDetails["guaranteeCode"],
      guaranteeName: g?.name_ar || "", guaranteeDetails: detailsByApp.get(a.id) ?? {}, guarantorName: a.guarantor_name || undefined,
      guarantorPhone: a.guarantor_phone || undefined, guarantorIdNumber: a.guarantor_id_number || undefined,
    };
  };
  const orders: Order[] = orderRows.map((o) => {
    const installment = o.payment_method === "installment";
    const months = installment ? num(o.order_items?.[0]?.installment_months) || 12 : 0;
    const items: OrderItem[] = (o.order_items ?? []).map((i: Row) => {
      const pr = productById.get(i.product_id);
      const unit = num(i.unit_price);
      return {
        productId: i.product_id, productName: one<Row>(i.products)?.name || pr?.name || "", productImage: sortedImages(one<Row>(i.products)?.product_images)[0] || pr?.images[0] || "",
        merchantId: i.merchant_id || "", merchantName: merchantName.get(i.merchant_id) || pr?.merchantName || "", quantity: i.quantity, cashPrice: unit,
        deferredPrice: Math.round(unit * (1 + markup / 100)), paymentType: installment ? "تقسيط" : "نقدي",
      };
    });
    void months;
    return {
      id: o.id, orderNumber: o.order_number, customerName: o.recipient_name, customerId: o.user_id, items, total: num(o.total),
      paymentType: installment ? "تقسيط" : "نقدي", status: ORDER_AR[o.status] ?? "قيد المراجعة", city: o.city, governorate: o.governorate,
      address: o.address, phone: o.phone, notes: o.notes || "", createdAt: o.created_at, merchantIds: [...new Set(items.map((i) => i.merchantId).filter(Boolean))],
      financing: financingOf(appByOrder.get(o.id)),
    };
  });
  const deliveries: Delivery[] = orderRows.filter((o) => !["cancelled", "returned", "refunded"].includes(o.status)).map((o) => ({
    id: o.id, orderId: o.id, orderNumber: o.order_number, customerName: o.recipient_name, governorate: o.governorate, city: o.city, area: "", address: o.address,
    phone: o.phone, notes: o.notes || "", status: DELIVERY_AR[o.status] ?? "جديد", createdAt: o.created_at,
  }));

  // Applications / contracts / payments
  const empById = new Map(employees.map((e) => [e.id, e]));
  const orderNum = new Map(orderRows.map((o) => [o.id, o.order_number]));
  void orderNum;
  const installmentApplications: InstallmentApplication[] = appRows.map((a) => ({
    id: a.id, applicationNumber: "INS-" + String(a.id).slice(0, 6).toUpperCase(), employeeId: a.employee_id || a.applicant_user_id,
    employeeName: a.applicant_name || empById.get(a.employee_id)?.name || profById.get(a.applicant_user_id)?.full_name || "", companyId: a.company_id || "",
    companyName: a.company_name || "", productId: "", productName: a.product_summary || "", merchantId: "", merchantName: a.merchant_summary || "",
    cashPrice: num(a.cash_price), deferredPrice: num(a.deferred_price), durationMonths: a.months, monthlyInstallment: num(a.monthly_installment),
    status: applicationStatus(a), createdAt: a.created_at, reviewedAt: a.admin_decided_at || undefined, reviewedBy: a.admin_decided_by ? "الإدارة" : undefined,
    rejectionReason: a.rejection_reason || undefined, financing: financingOf(a),
  }));
  const installmentRequests: InstallmentRequest[] = appRows.filter((a) => a.company_id).map((a) => ({
    id: a.id, requestNumber: "REQ-" + String(a.id).slice(0, 6).toUpperCase(), userId: a.applicant_user_id,
    userName: a.applicant_name || "", userRole: "employee" as UserRole, productId: "", productName: a.product_summary || "", productImage: "", merchantId: "",
    merchantName: a.merchant_summary || "", cashPrice: num(a.cash_price), deferredPrice: num(a.deferred_price), durationMonths: a.months,
    monthlyInstallment: num(a.monthly_installment), status: a.status === "rejected" ? "مرفوض" : a.status === "approved" ? "موافق" : a.status === "completed" ? "مكتمل" : "قيد المراجعة",
    createdAt: a.created_at, companyId: a.company_id, companyApproved: a.company_approved ?? null, companyReviewedAt: a.company_decided_at || undefined,
    companyNotes: a.company_note || undefined, rejectionReason: a.rejection_reason || undefined, financing: financingOf(a),
  }));
  const appById = new Map(appRows.map((a) => [a.id, a]));

  const installmentContracts: InstallmentContract[] = contractRows.map((c) => {
    const a = appById.get(c.application_id) ?? {};
    const sch = [...(c.installments ?? [])].sort((x: Row, y: Row) => x.number - y.number);
    installmentIndex[c.id] = Object.fromEntries(sch.map((i: Row) => [i.number, { id: i.id, amount: num(i.amount) }]));
    const paid = sch.filter((i: Row) => i.status === "paid");
    const paidAmount = paid.reduce((s: number, i: Row) => s + num(i.amount), 0);
    const total = num(a.deferred_price) || sch.reduce((s: number, i: Row) => s + num(i.amount), 0);
    const payments: InstallmentPaymentSchedule[] = sch.map((i: Row) => ({
      number: i.number, amount: num(i.amount), dueDate: i.due_date, status: INST_AR[i.status] ?? "قادم",
    }));
    return {
      id: c.id, applicationId: c.application_id, contractNumber: c.contract_number || "CON-" + String(c.id).slice(0, 6).toUpperCase(),
      employeeId: a.employee_id || a.applicant_user_id || "", employeeName: a.applicant_name || "", productName: a.product_summary || "", totalAmount: total,
      monthlyInstallment: num(a.monthly_installment), durationMonths: a.months ?? sch.length, paidAmount, remainingAmount: Math.max(0, total - paidAmount),
      paidInstallments: paid.length, status: c.status === "completed" ? "مكتمل" : c.status === "defaulted" ? "متعثر" : c.status === "active" ? "نشط" : "جديد",
      startDate: c.start_date || c.created_at, firstDueDate: sch[0]?.due_date || "", payments,
    };
  });
  const contractById = new Map(installmentContracts.map((c) => [c.id, c]));
  const payments: Payment[] = payRows.map((p) => ({
    id: p.id, paymentNumber: p.payment_number || "PAY-" + String(p.id).slice(0, 6).toUpperCase(), contractId: p.contract_id || "",
    employeeName: contractById.get(p.contract_id)?.employeeName || "", amount: num(p.amount), status: p.status === "failed" ? "فشل" : p.status === "processing" ? "قيد المعالجة" : "ناجح",
    method: p.method || "", createdAt: p.paid_at, installmentNumber: one<Row>(p.installments)?.number,
  }));

  const settlements: Settlement[] = comRows.map((c) => {
    const oi = one<Row>(c.order_items);
    const ord = one<Row>(oi?.orders);
    return {
      id: c.id, merchantId: c.merchant_id, merchantName: merchantName.get(c.merchant_id) || "", orderId: oi?.order_id || "", orderNumber: ord?.order_number || "",
      saleValue: num(c.gross), merchantAmount: num(c.net), status: SETTLEMENT_AR[one<Row>(c.settlements)?.status ?? "processing"] ?? "قيد المعالجة",
      date: ord?.created_at || c.created_at,
    };
  });

  const notifications: Notification[] = notifRows.map((n) => ({
    id: n.id, userId: n.user_id, title: n.title, message: n.body || "", type: (n.type || "system") as Notification["type"], read: !!n.read, createdAt: n.created_at, link: n.link || undefined,
  }));
  const auditLogs: AuditLog[] = auditRows.map((l) => {
    const actor = profById.get(l.actor_id);
    return {
      id: String(l.id), actor: actor?.full_name || "النظام", actorRole: mainRole(rolesByUser.get(l.actor_id) ?? ["customer"]), action: AUDIT_AR[l.action] || l.action,
      entity: l.entity || "", entityId: l.entity_id || "", timestamp: l.created_at, details: l.details ? JSON.stringify(l.details) : "",
    };
  });

  return { users, employees, companies, merchants, products, orders, installmentApplications, installmentContracts, installmentRequests, payments, settlements, deliveries, notifications, auditLogs, markup, branches, guaranteeTypes };
}

// ── Writes ────────────────────────────────────────────────────
const ERRORS: [RegExp, string][] = [
  [/insufficient stock/i, "الكمية المطلوبة غير متوفرة في المخزون"],
  [/merchant is not active/i, "متجر هذا المنتج غير مفعّل حالياً"],
  [/product not available/i, "أحد المنتجات لم يعد متاحاً"],
  [/account is not active/i, "حسابك غير مفعّل بعد: تحتاج مراجعة الهوية أولاً"],
  [/not authenticated/i, "سجّل الدخول أولاً"],
  [/not allowed/i, "ليست لديك صلاحية لهذا الإجراء"],
  [/identity is not verified/i, "هوية مقدّم الطلب لم تُوثَّق بعد"],
  [/not eligible/i, "الموظف غير مؤهل للتقسيط"],
  [/limit exceeded/i, "تجاوز سقف التقسيط المتاح للموظف"],
  [/not waiting for the company/i, "الطلب ليس بانتظار قرار الشركة"],
  [/not waiting for the platform/i, "الطلب ما زال بانتظار موافقة الشركة أو تم البت فيه"],
  [/reason is required/i, "اكتب سبب الرفض"],
  [/amount must equal/i, "المبلغ يجب أن يساوي قيمة القسط"],
  [/already paid/i, "هذا القسط مدفوع مسبقاً"],
  [/must be approved/i, "طلب التقسيط يجب أن يُوافق عليه قبل التجهيز"],
  [/order is closed|already delivered/i, "الطلب مغلق ولا يمكن تغييره"],
  [/only cancel/i, "لا يمكن الإلغاء بعد الموافقة"],
  [/guarantee/i, "بيانات الضمان غير مكتملة أو غير مناسبة لحسابك"],
  [/branch/i, "اختر فرعاً صحيحاً"],
  [/delivery data/i, "بيانات التوصيل غير مكتملة"],
  [/company is not active/i, "هذه الشركة غير مفعّلة"],
  [/only employee/i, "هذا الإجراء لحسابات الموظفين فقط"],
];
export function explain(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e ?? "");
  return ERRORS.find(([re]) => re.test(m))?.[1] ?? "تعذّر تنفيذ العملية. حاول مرة أخرى";
}
export type Result = { ok: true; id?: string } | { ok: false; error: string };
const wrap = async (p: PromiseLike<{ data?: any; error: any }>): Promise<Result> => {
  try { const { data, error } = await p; return error ? { ok: false, error: explain(error) } : { ok: true, id: typeof data === "string" ? data : undefined }; }
  catch (e) { return { ok: false, error: explain(e) }; }
};

export const db = {
  placeOrder(p: {
    items: { productId: string; quantity: number }[]; payment: "نقدي" | "تقسيط"; recipient: string; phone: string; governorate: string; city: string;
    address: string; notes?: string; months?: number; guaranteeTypeId?: number | null; guaranteeDetails?: Record<string, string>;
    guarantorName?: string; guarantorPhone?: string; guarantorIdNumber?: string; branchId?: string;
  }) {
    return wrap(supabase.rpc("place_order", {
      p_items: p.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      p_payment: p.payment === "تقسيط" ? "installment" : "cash_on_delivery",
      p_recipient: p.recipient, p_phone: p.phone, p_governorate: p.governorate, p_city: p.city, p_address: p.address, p_notes: p.notes || null,
      p_months: p.payment === "تقسيط" ? p.months ?? null : null, p_guarantee_type_id: p.guaranteeTypeId ?? null,
      p_guarantee_details: p.guaranteeDetails ?? {}, p_guarantor_name: p.guarantorName || null, p_guarantor_phone: p.guarantorPhone || null,
      p_guarantor_id_number: p.guarantorIdNumber || null, p_branch_id: p.branchId || null,
    }));
  },
  joinCompany: (companyId: string, job?: string, number?: string) => wrap(supabase.rpc("join_company", { p_company: companyId, p_job: job || null, p_number: number || null })),
  companySetEmployee: (e: Employee) => wrap(supabase.rpc("company_set_employee", {
    p_emp: e.id, p_eligibility: ELIG_DB[e.eligibility] ?? "pending", p_limit: e.installmentLimit, p_salary: e.salary || null, p_status: EMP_STATUS_DB[e.status] ?? null,
  })),
  companyDecide: (id: string, approve: boolean, note?: string) => wrap(supabase.rpc("company_decide_application", { p_app: id, p_approve: approve, p_note: note || null })),
  decideApplication: (id: string, approve: boolean, note?: string) => wrap(supabase.rpc("decide_application", { p_app: id, p_approve: approve, p_note: note || null })),
  recordPayment: (installmentId: string, amount: number, method: string) => wrap(supabase.rpc("record_payment", { p_installment: installmentId, p_amount: amount, p_method: method })),
  refreshInstallments: () => wrap(supabase.rpc("refresh_installment_status")),
  setOrderStatus: (orderId: string, dbStatus: string, note?: string) => wrap(supabase.rpc("update_order_status", { p_order: orderId, p_status: dbStatus, p_note: note || null })),
  setMerchantStatus: (id: string, status: string) => wrap(supabase.rpc("set_merchant_status", { p_merchant: id, p_status: MERCHANT_DB[status] ?? status })),
  setCompanyStatus: (id: string, status: string) => wrap(supabase.rpc("set_company_status", { p_company: id, p_status: MERCHANT_DB[status] ?? status })),
  setSettlement: (commissionId: string, status: string) => wrap(supabase.rpc("set_commission_settlement", { p_commission: commissionId, p_status: SETTLEMENT_DB[status] ?? status })),
  markNotificationRead: (id: string) => wrap(supabase.from("notifications").update({ read: true }).eq("id", id)),

  async saveProduct(input: Partial<Product> & { id?: string }): Promise<Result> {
    try {
      let merchantId = ownStore.merchantId, storeId = ownStore.storeId;
      if (!input.id && (!merchantId || !storeId)) return { ok: false, error: "لا يوجد متجر لحسابك بعد" };
      const cat = input.category
        ? (await supabase.from("categories").select("id").eq("name", input.category).maybeSingle()).data?.id ?? null
        : undefined;
      const row: Row = {};
      if (input.name !== undefined) row.name = input.name;
      if (input.description !== undefined) row.description = input.description;
      if (input.cashPrice !== undefined) { row.cash_price = input.cashPrice; row.discount_percent = 0; }
      if (input.stock !== undefined) row.stock = input.stock;
      if (input.city !== undefined) row.city = input.city;
      if (input.installmentAvailable !== undefined) row.installment_available = input.installmentAvailable;
      if (input.specs !== undefined) row.specs = input.specs;
      if (input.visible !== undefined) { row.visible = input.visible; row.active = input.visible; }
      if (input.featured !== undefined) row.featured = input.featured;
      if (cat !== undefined) row.category_id = cat;

      let productId = input.id;
      if (!productId) {
        const { data, error } = await supabase.from("products").insert({ ...row, store_id: storeId, merchant_id: merchantId }).select("id").single();
        if (error) return { ok: false, error: explain(error) };
        productId = data.id as string;
      } else if (Object.keys(row).length) {
        const { error } = await supabase.from("products").update(row).eq("id", productId);
        if (error) return { ok: false, error: explain(error) };
      }

      if (input.images) {
        // keep already-uploaded images, upload new data: URLs (files) into the merchant's own folder
        const mid = merchantId ?? (await supabase.from("products").select("merchant_id").eq("id", productId).single()).data?.merchant_id;
        const { data: existing } = await supabase.from("product_images").select("id, url, storage_path").eq("product_id", productId);
        const keepPaths = new Set<string>();
        const rows: Row[] = [];
        let pos = 0;
        for (const src of input.images) {
          if (src.startsWith("data:")) {
            const blob = await (await fetch(src)).blob();
            const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
            const path = `${mid}/${productId}/${crypto.randomUUID()}.${ext}`;
            const up = await supabase.storage.from("product-images").upload(path, blob, { contentType: blob.type, upsert: false });
            if (up.error) return { ok: false, error: "تعذّر رفع إحدى الصور (الحجم الأقصى 5 ميجابايت، JPG أو PNG أو WebP)" };
            rows.push({ product_id: productId, storage_path: path, position: pos++ });
          } else {
            const hit = (existing ?? []).find((e) => publicImage(e) === src);
            if (hit?.storage_path) { keepPaths.add(hit.storage_path); rows.push({ __keep: hit.id, position: pos++ }); }
          }
        }
        const removeIds = (existing ?? []).filter((e) => !keepPaths.has(e.storage_path)).map((e) => e.id);
        if (removeIds.length) await supabase.from("product_images").delete().in("id", removeIds);
        const inserts = rows.filter((r) => !r.__keep);
        if (inserts.length) {
          const { error } = await supabase.from("product_images").insert(inserts);
          if (error) return { ok: false, error: "تعذّر حفظ الصور" };
        }
        for (const r of rows.filter((r) => r.__keep)) await supabase.from("product_images").update({ position: r.position }).eq("id", r.__keep);
      }
      return { ok: true, id: productId };
    } catch (e) {
      return { ok: false, error: explain(e) };
    }
  },
  async deleteProduct(id: string): Promise<Result> {
    const del = await supabase.from("products").delete().eq("id", id);
    if (!del.error) return { ok: true };
    // referenced by past orders: hide it instead
    return wrap(supabase.from("products").update({ active: false, visible: false }).eq("id", id));
  },
  async setCommission(merchantId: string, percent: number): Promise<Result> {
    return wrap(supabase.from("merchants").update({ commission_percent: percent }).eq("id", merchantId));
  },
};
