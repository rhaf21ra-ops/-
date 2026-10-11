"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { useApp } from "@/lib/store";
import { Bell } from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const { currentUser, notifications, markNotificationRead } = useApp();
  const myNotifs = notifications.filter(n => n.userId === currentUser?.id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">الإشعارات</h1>

        {myNotifs.length === 0 ? (
          <EmptyState icon={Bell} title="لا توجد إشعارات" description="ستظهر هنا جميع إشعاراتك" />
        ) : (
          <div className="space-y-3 max-w-2xl">
            {myNotifs.map(n => (
              <Card key={n.id} className={!n.read ? "border-primary/30 bg-primary/5" : ""} onClick={() => markNotificationRead(n.id)}>
                <CardContent className="p-4 flex items-start gap-3 cursor-pointer">
                  <div className={`h-2.5 w-2.5 rounded-full mt-2 shrink-0 ${!n.read ? "bg-primary" : "bg-muted"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm">{n.title}</p>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(n.createdAt).toLocaleDateString("ar-YE")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    {n.link && <Link href={n.link} className="text-xs text-primary hover:underline mt-2 inline-block">عرض التفاصيل</Link>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
