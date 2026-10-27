import type { LucideIcon } from "lucide-react";
import { Home, Users, Store, Building2, Package, ShoppingBag, CreditCard, Wallet, Receipt, BarChart3, Settings, ScrollText, Truck, ShieldCheck, KeyRound, PackagePlus, FileText, Headphones as HeadphonesIcon, Plug, MapPinned, Ticket, Megaphone, ShieldAlert, Calculator } from "lucide-react";

export const adminNavItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "الرئيسية", icon: Home },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/staff", label: "الحسابات والصلاحيات", icon: KeyRound },
  { href: "/admin/merchants", label: "التجار", icon: Store },
  { href: "/admin/companies", label: "الشركات", icon: Building2 },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/requests", label: "طلبات منتجات غير مدرجة", icon: PackagePlus },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/admin/installments", label: "التقسيط", icon: CreditCard },
  { href: "/admin/payments", label: "المدفوعات", icon: Wallet },
  { href: "/admin/delivery", label: "التوصيل", icon: Truck },
  { href: "/admin/settlements", label: "التسويات", icon: Receipt },
  { href: "/admin/reports", label: "التقارير", icon: BarChart3 },
  { href: "/admin/audit-logs", label: "سجل العمليات", icon: ScrollText },
  { href: "/staff/identity", label: "التحقق من الهوية", icon: ShieldCheck },
  { href: "/admin/integrations", label: "API & Integrations", icon: Plug },
  { href: "/admin/branches", label: "الفروع وبريدها", icon: MapPinned },
  { href: "/admin/coupons", label: "الكوبونات", icon: Ticket },
  { href: "/admin/advertisements", label: "الإعلانات", icon: Megaphone },
  { href: "/admin/fraud", label: "مكافحة الاحتيال", icon: ShieldAlert },
  { href: "/admin/calculator", label: "حاسبة التقسيط", icon: Calculator },
  { href: "/admin/support", label: "خدمة العملاء", icon: HeadphonesIcon },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];
