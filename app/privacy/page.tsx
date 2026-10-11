"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-6">سياسة الخصوصية</h1>
        <Card>
          <CardContent className="p-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">1. جمع البيانات</h2>
              <p>نجمع بيانات أساسية عند تسجيلك في المنصة مثل الاسم والبريد الإلكتروني ورقم الهاتف. في هذه النسخة التجريبية لا يتم جمع أو تخزين بيانات حساسة مثل أرقام البطاقات البنكية أو كلمات المرور بصيغتها الأصلية.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">2. استخدام البيانات</h2>
              <p>تُستخدم بياناتك لتوفير تجربة تسوق أفضل وإدارة طلباتك وحسابك. لا تُباع أو تُشارك بياناتك مع أطراف ثالثة لأغراض تسويقية.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">3. حماية البيانات</h2>
              <p>نتخذ إجراءات معقولة لحماية بياناتك من الوصول غير المصرح به. تشمل هذه الإجراءات مصادقة المستخدمين وتقييد الصلاحيات حسب الدور (RBAC) وتسجيل العمليات (Audit Logs).</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">4. بيانات التجار والشركات</h2>
              <p>البيانات التي يقدمها التجار والشركات (مثل معلومات المتجر وبيانات الموظفين) تُستخدم لإدارة العمليات داخل المنصة فقط. الشركات مسؤولة عن دقة بيانات موظفيها.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">5. حقوق المستخدم</h2>
              <p>يحق لك الوصول إلى بياناتك وتعديلها من خلال صفحة الملف الشخصي. يحق لك طلب حذف حسابك، علماً بأن بعض البيانات قد تُحفظ لأغراض تسجيل العمليات.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">6. ملفات الارتباط (Cookies)</h2>
              <p>تستخدم المنصة ملفات ارتباط محلية (Local Storage) لحفظ حالة تسجيل الدخول ومحتويات السلة. لا تُستخدم ملفات ارتباط لتتبع سلوكك خارج المنصة.</p>
            </section>
            <section>
              <h2 className="font-bold text-foreground text-lg mb-2">7. البيانات التجريبية</h2>
              <p>جميع البيانات المعروضة في هذه النسخة هي بيانات تجريبية وهمية ولا تمثل أشخاصاً أو شركات حقيقية. لا تُخزن أي بيانات مالية حقيقية.</p>
            </section>
            <p className="text-xs text-muted-foreground pt-4 border-t">آخر تحديث: سبتمبر 2026 - هذه سياسة تجريبية لنسخة Demo</p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
