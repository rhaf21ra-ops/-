"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, KeyRound, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }
    if (newPassword === currentPassword) {
      setError("كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية");
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });
      if (signInError) {
        setError("كلمة المرور الحالية غير صحيحة");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message === "Password should be at least 6 characters."
          ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
          : "تعذّر تحديث كلمة المرور. حاول مرة أخرى");
        setLoading(false);
        return;
      }

      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-4">يجب تسجيل الدخول لتغيير كلمة المرور</p>
          <Link href="/login"><Button>تسجيل الدخول</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Link href="/profile" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowRight className="h-4 w-4" /> العودة للملف الشخصي
          </Link>
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl">تغيير كلمة المرور</CardTitle>
              <p className="text-sm text-muted-foreground">أدخل كلمة المرور الحالية ثم كلمة المرور الجديدة</p>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">كلمة المرور الحالية</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="pr-10 pl-10"
                      required
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pr-10 pl-10"
                      required
                      dir="ltr"
                      placeholder="6 أحرف على الأقل"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">تأكيد كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pr-10 pl-10"
                      required
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><KeyRound className="h-5 w-5 ml-2" />تغيير كلمة المرور</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
