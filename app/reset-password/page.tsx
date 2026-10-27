"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, KeyRound, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;

    const settle = (ok: boolean, errMsg?: string) => {
      if (settled.current) return;
      settled.current = true;
      if (ok) setVerified(true);
      else setError(errMsg || "رابط استعادة كلمة المرور غير صالح أو منتهي الصلاحية. اطلب رابطاً جديداً.");
      setChecking(false);
    };

    // Check if there's a hash fragment in the URL (recovery token)
    const hash = window.location.hash;

    if (hash && hash.includes("access_token")) {
      // The recovery link has a hash fragment — listen for onAuthStateChange
      // which fires PASSWORD_RECOVERY once the client processes the hash.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          settle(true);
        } else if (event === "SIGNED_IN" && session) {
          // Some Supabase versions fire SIGNED_IN instead
          settle(true);
        } else if (event === "TOKEN_REFRESHED" && session) {
          settle(true);
        }
      });

      // Also try getSession() in case the hash was already processed
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) settle(true);
      });

      // Timeout fallback: if nothing fires within 8 seconds, show error
      const timeout = setTimeout(() => settle(false, "انتهت مهلة معالجة رابط الاستعادة. اطلب رابطاً جديداً."), 8000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }

    // No hash fragment — check if already logged in (e.g. user navigated here manually)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) settle(true);
      else settle(false);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError("تعذّر تحديث كلمة المرور. حاول مرة أخرى");
        setLoading(false);
        return;
      }

      toast.success("تم تغيير كلمة المرور بنجاح");
      // Sign out so the recovery session doesn't linger
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">جارٍ التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl">إعادة تعيين كلمة المرور</CardTitle>
              {verified && <p className="text-sm text-muted-foreground">أدخل كلمة المرور الجديدة</p>}
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {verified && (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><KeyRound className="h-5 w-5 ml-2" />حفظ كلمة المرور الجديدة</>}
                  </Button>
                </form>
              )}
              {error && (
                <div className="text-center pt-2">
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    طلب رابط استعادة جديد
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
