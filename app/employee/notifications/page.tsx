"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { Home, ShoppingBag, CreditCard, Wallet, Bell, User, BellOff, Truck, Settings, CheckCheck, ExternalLink, PackagePlus, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Notification } from "@/lib/types";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/employee", label: "الرئيسية", icon: Home },
  { href: "/employee/orders", label: "طلباتي", icon: ShoppingBag },
  { href: "/employee/installments", label: "التقسيط", icon: CreditCard },
  { href: "/employee/payments", label: "المدفوعات", icon: Wallet },
  { href: "/request-product", label: "طلب منتج غير مدرج", icon: PackagePlus },
  { href: "/requests", label: "طلباتي الخاصة", icon: ClipboardList },
  { href: "/employee/notifications", label: "الإشعارات", icon: Bell },
  { href: "/employee/profile", label: "الملف الشخصي", icon: User },
];

const TYPE_FILTER_ALL = "الكل";
const READ_FILTER_ALL = "الكل";

const typeIcon: Record<Notification["type"], LucideIcon> = {
  order: ShoppingBag,
  installment: CreditCard,
  payment: Wallet,
  delivery: Truck,
  system: Settings,
};

const typeLabel: Record<Notification["type"], string> = {
  order: "طلب",
  installment: "تقسيط",
  payment: "دفع",
  delivery: "توصيل",
  system: "نظام",
};

export default function EmployeeNotificationsPage() {
  const { currentUser, notifications, markNotificationRead } = useApp();
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL);
  const [readFilter, setReadFilter] = useState<string>(READ_FILTER_ALL);

  const myNotifs = useMemo(
    () =>
      notifications
        .filter((n) => n.userId === currentUser?.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [notifications, currentUser]
  );

  const unreadCount = myNotifs.filter((n) => !n.read).length;

  const filteredNotifs = useMemo(() => {
    return myNotifs.filter((n) => {
      if (typeFilter !== TYPE_FILTER_ALL && n.type !== typeFilter)
        return false;
      if (readFilter === "غير مقروء" && n.read) return false;
      if (readFilter === "مقروء" && !n.read) return false;
      return true;
    });
  }, [myNotifs, typeFilter, readFilter]);

  const types = useMemo(
    () => Array.from(new Set(myNotifs.map((n) => n.type))),
    [myNotifs]
  );

  return (
    <DashboardLayout navItems={navItems} title="لوحة الموظف" role="employee">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0
              ? `لديك ${unreadCount} إشعار غير مقروء`
              : "جميع إشعاراتك مقروءة"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">النوع:</span>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TYPE_FILTER_ALL}>الكل</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {typeLabel[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            الحالة:
          </span>
          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={READ_FILTER_ALL}>الكل</SelectItem>
              <SelectItem value="غير مقروء">غير مقروء</SelectItem>
              <SelectItem value="مقروء">مقروء</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredNotifs.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="لا توجد إشعارات"
          description="لا توجد إشعارات مطابقة للفلتر الحالي"
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((n) => {
            const Icon = typeIcon[n.type] || Bell;
            return (
              <Card
                key={n.id}
                className={
                  !n.read ? "border-primary/30 bg-primary/5" : undefined
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        !n.read
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{n.title}</p>
                          {!n.read && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                              جديد
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(n.createdAt).toLocaleDateString("ar-YE")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {n.link && (
                          <Link
                            href={n.link}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            عرض التفاصيل
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        {!n.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => markNotificationRead(n.id)}
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            وضع علامة كمقروء
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
