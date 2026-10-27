"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Headphones, Loader2, Send, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "login", label: "مشكلة في تسجيل الدخول" },
  { value: "identity", label: "مشكلة في توثيق الهوية" },
  { value: "account", label: "مشكلة في الحساب" },
  { value: "company", label: "مشكلة في حساب الشركة" },
  { value: "employees", label: "مشكلة في الموظفين" },
  { value: "password", label: "مشكلة في كلمة المرور" },
  { value: "other", label: "مشكلة أخرى" },
];

export default function SupportPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!subject.trim() || !body.trim()) {
      setError("يرجى ملء العنوان وشرح المشكلة");
      return;
    }
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) {
        setError("يجب تسجيل الدخول لإرسال تذكرة دعم");
        setLoading(false);
        return;
      }

      const { data, error: insertError } = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          category,
          subject: subject.trim(),
          body: body.trim(),
          status: "open",
        })
        .select("ticket_number")
        .single();

      if (insertError || !data) {
        setError("تعذّر إرسال التذكرة. حاول مرة أخرى");
        setLoading(false);
        return;
      }

      setTicketNumber(data.ticket_number);
      toast.success("تم إرسال تذكرتك بنجاح");
      setSubject("");
      setBody("");
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  if (ticketNumber) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">تم إرسال تذكرتك بنجاح</h1>
            <p className="text-muted-foreground mb-4">رقم التذكرة الخاص بك:</p>
            <p className="text-xl font-bold text-primary mb-6" dir="ltr">{ticketNumber}</p>
            <p className="text-sm text-muted-foreground mb-6">
              سيقوم فريق خدمة العملاء بمراجعة تذكرتك والرد عليك في أقرب وقت. يمكنك متابعة حالة تذكرتك من صفحة تذاكري.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/support/my-tickets"><Button className="w-full">متابعة تذاكري</Button></Link>
              <Button variant="outline" onClick={() => setTicketNumber("")}>إرسال تذكرة جديدة</Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">خدمة العملاء</h1>
              <p className="text-sm text-muted-foreground">أرسل لنا مشكلتك وسنرد عليك في أقرب وقت</p>
            </div>
          </div>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block">الاسم</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="اسمك الكامل" required />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">البريد الإلكتروني</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" placeholder="name@example.com" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block">رقم الهاتف</Label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="7XXXXXXXX" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">نوع المشكلة</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">عنوان الرسالة</Label>
                  <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="ملخص المشكلة" required />
                </div>
                <div>
                  <Label className="mb-1.5 block">شرح المشكلة</Label>
                  <Textarea value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="اشرح مشكلتك بالتفصيل..." required />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5 ml-2" />إرسال إلى خدمة العملاء</>}
                </Button>
              </form>
              {user && (
                <div className="mt-4 text-center">
                  <Link href="/support/my-tickets" className="text-sm text-primary hover:underline">
                    <ArrowRight className="h-4 w-4 inline ml-1" />متابعة تذاكري السابقة
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
