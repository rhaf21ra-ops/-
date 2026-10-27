"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { currentUser } = useApp();

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-4">يجب تسجيل الدخول لعرض الملف الشخصي</p>
          <Button onClick={() => window.location.href = "/login"}>تسجيل الدخول</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">الملف الشخصي</h1>

        <div className="grid lg:grid-cols-3 gap-6 max-w-4xl">
          <Card className="lg:col-span-1">
            <CardContent className="p-6 text-center">
              <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-bold mb-3">
                {currentUser.name.charAt(0)}
              </div>
              <h2 className="font-bold text-lg">{currentUser.name}</h2>
              <p className="text-sm text-muted-foreground" dir="ltr">{currentUser.email}</p>
              <div className="mt-4 inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {ROLE_LABELS[currentUser.role]}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-lg">تعديل المعلومات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label className="mb-1.5 block">الاسم</Label><Input defaultValue={currentUser.name} /></div>
              <div><Label className="mb-1.5 block">البريد الإلكتروني</Label><Input defaultValue={currentUser.email} dir="ltr" /></div>
              <div><Label className="mb-1.5 block">رقم الهاتف</Label><Input defaultValue={currentUser.phone} dir="ltr" /></div>
              <Button onClick={() => toast.success("تم حفظ التغييرات")}>حفظ التغييرات</Button>
              <Link href="/profile/change-password">
                <Button variant="outline" className="w-full">
                  <KeyRound className="h-4 w-4 ml-2" /> تغيير كلمة المرور
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
