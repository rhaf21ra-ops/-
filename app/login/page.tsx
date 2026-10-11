"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth, getDashboardPath } from "@/lib/auth-context";
import { isSupabaseConfigured } from "@/lib/supabase-client";
import { BRAND } from "@/lib/brand";
import { Mail, Lock, LogIn, User, Briefcase, Building2, ShieldCheck, ShoppingBag, Eye, EyeOff, AlertCircle, Landmark } from "lucide-react";
import { toast } from "sonner";

function LoginContent() {
  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirect || getDashboardPath(user.role));
    }
  }, [user, authLoading, router, redirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      toast.error("فشل تسجيل الدخول", { description: signInError });
      setLoading(false);
      return;
    }
    toast.success("تم تسجيل الدخول بنجاح");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-2">س</div>
              <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
              <p className="text-sm text-muted-foreground">مرحباً بك في {BRAND.name}</p>
              {!isSupabaseConfigured && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">الموقع غير مربوط بقاعدة البيانات بعد. أضف مفاتيح Supabase في إعدادات Netlify ثم أعد النشر.</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@demo.com" className="pr-10" required dir="ltr" />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pr-10 pl-10" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "جاري تسجيل الدخول..." : (<><LogIn className="h-5 w-5 ml-2" />تسجيل الدخول</>)}
                </Button>
              </form>
              <div className="text-center text-sm">
                <span className="text-muted-foreground">ليس لديك حساب؟ </span>
                <Link href="/register" className="text-primary font-medium hover:underline">إنشاء حساب</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">جاري التحميل...</div></div>}>
      <LoginContent />
    </Suspense>
  );
}
