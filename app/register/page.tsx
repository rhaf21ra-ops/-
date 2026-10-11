"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IdentityCapture } from "@/components/IdentityCapture";
import { useAuth, getDashboardPath, type UserRole as AuthUserRole } from "@/lib/auth-context";
import { GOVERNORATES, IDENTITY_DOCUMENT_TYPES } from "@/lib/constants";
import type { UserRole, IdentityDocumentType } from "@/lib/constants";
import { User, Briefcase, Building2, UserPlus, Mail, Phone, MapPin, Building, Hash, Wallet, BriefcaseBusiness, ShoppingBag, IdCard, Camera, Upload, ShieldCheck, Info, AlertTriangle, CheckCircle2, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function RegisterContent() {
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") as UserRole) || "customer";

  const [step, setStep] = useState<"account" | "verification">("account");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [registeredUserId, setRegisteredUserId] = useState("");

  const update = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

  const needsVerification = true; // every account type verifies identity

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.name || !formData.phone || !formData.password) {
      toast.error("البيانات غير مكتملة", { description: "يرجى تعبئة جميع الحقول المطلوبة" });
      return;
    }

    setLoading(true);
    const { error, userId } = await signUp(formData.email, formData.password, formData.name, formData.phone, role as AuthUserRole);
    if (error) {
      toast.error("فشل إنشاء الحساب", { description: error });
      setLoading(false);
      return;
    }
    setRegisteredUserId(userId ?? "");
    toast.success("تم إنشاء الحساب");
    if (needsVerification) {
      // Identity verification starts during sign-up, not later at checkout.
      setStep("verification");
    } else {
      router.push(getDashboardPath(role as AuthUserRole));
    }
    setLoading(false);
  };

  const roleOptions: { value: UserRole; label: string; icon: any; desc: string }[] = [
    { value: "customer", label: "عميل", icon: ShoppingBag, desc: "تسوق واطلب التقسيط" },
    { value: "employee", label: "موظف", icon: User, desc: "تسوق واطلب التقسيط براتبك" },
    { value: "merchant", label: "تاجر", icon: Briefcase, desc: "اعرض منتجاتك" },
    { value: "company", label: "شركة", icon: Building2, desc: "أدر موظفيك" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-2">
                س
              </div>
              <CardTitle className="text-2xl">
                {step === "account" ? "إنشاء حساب جديد" : "التحقق من الهوية"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {step === "account" ? "انضم إلى منصة قسطها" : "خطوة التحقق من الهوية لإكمال التسجيل"}
              </p>

              <div className="flex items-center justify-center gap-2 mt-3">
                <div className={`h-2 w-16 rounded-full ${step === "account" ? "bg-primary" : "bg-primary/40"}`} />
                {needsVerification && <div className={`h-2 w-16 rounded-full ${step === "verification" ? "bg-primary" : "bg-muted"}`} />}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === "account" ? (
                <>
                  {/* Role selection */}
                  <div>
                    <Label className="mb-2 block">نوع الحساب</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {roleOptions.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRole(opt.value)}
                          className={`p-4 rounded-xl border-2 text-center transition-all ${
                            role === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted"
                          }`}
                        >
                          <opt.icon className={`h-7 w-7 mx-auto mb-2 ${role === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="font-bold text-sm">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleAccountSubmit} className="space-y-4">
                    {/* Customer fields */}
                    {role === "customer" && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="الاسم الكامل *" icon={User} value={formData.name || ""} onChange={v => update("name", v)} placeholder="الاسم الكامل" required />
                        <Field label="رقم الهاتف *" icon={Phone} value={formData.phone || ""} onChange={v => update("phone", v)} placeholder="07XXXXXXXX" dir="ltr" required />
                        <Field label="البريد الإلكتروني *" icon={Mail} value={formData.email || ""} onChange={v => update("email", v)} placeholder="example@demo.com" dir="ltr" required />
                        <div>
                          <Label className="mb-1.5 block">المدينة</Label>
                          <Select value={formData.city || ""} onValueChange={v => update("city", v)}>
                            <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                            <SelectContent>
                              {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Employee fields */}
                    {role === "employee" && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="الاسم الكامل *" icon={User} value={formData.name || ""} onChange={v => update("name", v)} placeholder="الاسم الكامل" required />
                        <Field label="رقم الهاتف *" icon={Phone} value={formData.phone || ""} onChange={v => update("phone", v)} placeholder="07XXXXXXXX" dir="ltr" required />
                        <Field label="البريد الإلكتروني *" icon={Mail} value={formData.email || ""} onChange={v => update("email", v)} placeholder="example@demo.com" dir="ltr" required />
                        <div>
                          <Label className="mb-1.5 block">الشركة</Label>
                          <Select value={formData.company || ""} onValueChange={v => update("company", v)}>
                            <SelectTrigger><SelectValue placeholder="اختر شركتك" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="c-1">شركة الأمل للمقاولات</SelectItem>
                              <SelectItem value="c-2">مجموعة اليمن للاستثمار</SelectItem>
                              <SelectItem value="c-3">شركة النور للتقنية</SelectItem>
                              <SelectItem value="c-5">شركة المستقبل للخدمات</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Field label="الوظيفة" icon={BriefcaseBusiness} value={formData.jobTitle || ""} onChange={v => update("jobTitle", v)} placeholder="مثلاً: مهندس" />
                        <Field label="الراتب الشهري (ر.ي)" icon={Wallet} value={formData.salary || ""} onChange={v => update("salary", v)} placeholder="مثلاً: 200000" type="number" />
                        <Field label="رقم الموظف" icon={Hash} value={formData.employeeNumber || ""} onChange={v => update("employeeNumber", v)} placeholder="EMP-XXX" />
                        <div>
                          <Label className="mb-1.5 block">المدينة</Label>
                          <Select value={formData.city || ""} onValueChange={v => update("city", v)}>
                            <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                            <SelectContent>
                              {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Merchant fields */}
                    {role === "merchant" && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="اسم المتجر *" icon={Building} value={formData.name || ""} onChange={v => update("name", v)} placeholder="اسم المتجر" required />
                        <Field label="اسم المسؤول *" icon={User} value={formData.ownerName || ""} onChange={v => update("ownerName", v)} placeholder="اسم المسؤول" required />
                        <Field label="رقم الهاتف *" icon={Phone} value={formData.phone || ""} onChange={v => update("phone", v)} placeholder="07XXXXXXXX" dir="ltr" required />
                        <Field label="البريد الإلكتروني *" icon={Mail} value={formData.email || ""} onChange={v => update("email", v)} placeholder="example@demo.com" dir="ltr" required />
                        <div>
                          <Label className="mb-1.5 block">المدينة *</Label>
                          <Select value={formData.city || ""} onValueChange={v => update("city", v)}>
                            <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                            <SelectContent>
                              {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Field label="العنوان" icon={MapPin} value={formData.address || ""} onChange={v => update("address", v)} placeholder="عنوان المتجر" />
                      </div>
                    )}

                    {/* Company fields */}
                    {role === "company" && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="اسم الشركة *" icon={Building} value={formData.name || ""} onChange={v => update("name", v)} placeholder="اسم الشركة" required />
                        <Field label="اسم المسؤول *" icon={User} value={formData.contactName || ""} onChange={v => update("contactName", v)} placeholder="اسم المسؤول" required />
                        <Field label="رقم الهاتف *" icon={Phone} value={formData.phone || ""} onChange={v => update("phone", v)} placeholder="07XXXXXXXX" dir="ltr" required />
                        <Field label="البريد الإلكتروني *" icon={Mail} value={formData.email || ""} onChange={v => update("email", v)} placeholder="example@demo.com" dir="ltr" required />
                        <Field label="عدد الموظفين" icon={User} value={formData.employeeCount || ""} onChange={v => update("employeeCount", v)} placeholder="مثلاً: 50" type="number" />
                        <div>
                          <Label className="mb-1.5 block">المدينة *</Label>
                          <Select value={formData.city || ""} onValueChange={v => update("city", v)}>
                            <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                            <SelectContent>
                              {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Password (common) */}
                    <Field label="كلمة المرور *" icon={Mail} value={formData.password || ""} onChange={v => update("password", v)} placeholder="••••••••" type="password" required />

                    {needsVerification && (
                      <Alert className="border-primary/20 bg-primary/5">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-xs">
                          بعد إنشاء الحساب ستنتقل مباشرة إلى التحقق من الهوية. يبقى الحساب قيد المراجعة حتى يوافق عليه أحد الموظفين المخوّلين.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? "جاري إنشاء الحساب..." : (
                        <>
                          <UserPlus className="h-5 w-5 ml-2" />
                          إنشاء الحساب
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                /* Verification step: live camera only (no file picker), reviewed by a staff member */
                <div className="space-y-4">
                  <Alert className="border-primary/20 bg-primary/5">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-sm">
                      التحقق من الهوية إلزامي لكل حساب. تُلتقط الصور من الكاميرا مباشرة، ثم يراجعها موظف مخوّل ويفعّل حسابك أو يطلب تعديلاً مع ذكر السبب.
                    </AlertDescription>
                  </Alert>
                  {registeredUserId ? (
                    <IdentityCapture
                      userId={registeredUserId}
                      onDone={() => {
                        toast.success("تم إرسال طلب التحقق", { description: "سنبلغك بالنتيجة بعد مراجعة الموظف" });
                        router.push(getDashboardPath(role as AuthUserRole));
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">تعذّر تحديد حسابك. سجّل الدخول ثم أكمل التحقق.</p>
                  )}
                </div>
              )}

              <div className="text-center text-sm">
                <span className="text-muted-foreground">لديك حساب بالفعل؟ </span>
                <Link href="/login" className="text-primary font-medium hover:underline">تسجيل الدخول</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Field({
  label, icon: Icon, value, onChange, placeholder, required, type = "text", dir,
}: {
  label: string; icon: any; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string; dir?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <div className="relative">
        <Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} className="pr-10" dir={dir} />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">جاري التحميل...</div></div>}>
      <RegisterContent />
    </Suspense>
  );
}
