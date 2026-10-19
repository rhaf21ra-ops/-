"use client";

import { useState, Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

function ForgotPasswordContent() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error("تعذّر إرسال رابط الاستعادة. تحقق من البريد وحاول مرة أخرى");
      } else {
        setSent(true);
        toast.success("تم إرسال رابط استعادة كلمة المرور إلى بريدك");
      }
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Mail className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl">نسيت كلمة المرور</CardTitle>
              <p className="text-sm text-muted-foreground">
                أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور
              </p>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    إذا كان البريد الإلكتروني مسجلاً في {BRAND.name}، فقد أرسلنا رابطاً لإعادة تعيين كلمة المرور.
                    تحقق من صندوق الوارد ومجلد الرسائل غير المرغوب فيها.
                  </p>
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      <ArrowRight className="h-4 w-4 ml-2" /> العودة لتسجيل الدخول
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="mb-1.5 block">البريد الإلكتروني</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="pr-10"
                          required
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "إرسال رابط الاستعادة"}
                    </Button>
                  </form>
                  <div className="text-center text-sm pt-2">
                    <Link href="/login" className="text-muted-foreground hover:text-primary">
                      <ArrowRight className="h-4 w-4 inline ml-1" /> العودة لتسجيل الدخول
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
