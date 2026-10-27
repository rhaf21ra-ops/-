"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth, getDashboardPath } from "@/lib/auth-context";
import { demoAccounts, demoSession } from "@/lib/demo-db";
import { isStaffRole } from "@/lib/permissions";
import { BRAND } from "@/lib/brand";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function AdminLoginContent() {
  const { user, loading: authLoading, demoMode, signIn, signOut } = useAuth();
  const router = useRouter();
  const redirect = useSearchParams().get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ownerExists, setOwnerExists] = useState(true);

  useEffect(() => {
    if (demoMode) setOwnerExists(demoAccounts.hasOwner());
  }, [demoMode, user]);

  // Already signed in as owner or staff: go straight to the work area.
  useEffect(() => {
    if (authLoading || !user) return;
    if (user.roles.includes("admin") || user.roles.some(isStaffRole)) {
      router.replace(redirect && redirect.startsWith("/") ? redirect : getDashboardPath(user.role));
    }
  }, [user, authLoading, router, redirect]);

  const notStaff = !!user && !user.roles.includes("admin") && !user.roles.some(isStaffRole);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    if (demoMode && !ownerExists) {
      // First run in demo mode: this device creates the single owner account.
      if (!name.trim() || !email.includes("@") || password.length < 6) {
        setBusy(false);
        return setError("أكمل الاسم والبريد وكلمة مرور 6 أحرف أو أكثر");
      }
      const acc = demoAccounts.add({ email: email.trim(), password, fullName: name.trim(), phone: "", roles: ["admin"], status: "active", identityStatus: "verified" });
      demoSession.set(acc.id);
      toast.success("تم إنشاء حساب المالك");
      setBusy(false);
      return;
    }
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      toast.error("فشل الدخول", { description: err });
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary-foreground"><ShieldCheck className="h-7 w-7" /></div>
            <CardTitle className="text-2xl">دخول الإدارة</CardTitle>
            <p className="text-sm text-muted-foreground">للمالك وموظفي {BRAND.name} فقط</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {notStaff && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center justify-between gap-2 text-sm">
                  هذا الحساب ليس حساب إدارة.
                  <Button type="button" size="sm" variant="outline" onClick={() => signOut()}>تسجيل الخروج</Button>
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={submit} className="space-y-4">
              {demoMode && !ownerExists && (
                <div>
                  <Label htmlFor="al-name" className="mb-1.5 block">اسم المالك</Label>
                  <Input id="al-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <Label htmlFor="al-email" className="mb-1.5 block">البريد الإلكتروني</Label>
                <Input id="al-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="al-pass" className="mb-1.5 block">كلمة المرور</Label>
                <Input id="al-pass" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : demoMode && !ownerExists ? "إنشاء حساب المالك والدخول" : "دخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
