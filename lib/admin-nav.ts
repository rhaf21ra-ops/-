import type { LucideIcon } from "lucide-react";
import { Home, Users, Store, Building2, Package, ShoppingBag, CreditCard, Wallet, Receipt, BarChart3, Settings, ScrollText, Truck, ShieldCheck, KeyRound, Headphones as HeadphonesIcon } from "lucide-react";

export const adminNavItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "الرئيسية", icon: Home },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/staff", label: "الحسابات والصلاحيات", icon: KeyRound },
  { href: "/admin/merchants", label: "التجار", icon: Store },
  { href: "/admin/companies", label: "الشركات", icon: Building2 },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/admin/installments", label: "التقسيط", icon: CreditCard },
  { href: "/admin/payments", label: "المدفوعات", icon: Wallet },
  { href: "/admin/delivery", label: "التوصيل", icon: Truck },
  { href: "/admin/settlements", label: "التسويات", icon: Receipt },
  { href: "/admin/reports", label: "التقارير", icon: BarChart3 },
  { href: "/admin/audit-logs", label: "سجل العمليات", icon: ScrollText },
  { href: "/staff/identity", label: "التحقق من الهوية", icon: ShieldCheck },
  { href: "/admin/support", label: "خدمة العملاء", icon: HeadphonesIcon },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];
