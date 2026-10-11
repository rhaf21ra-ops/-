import Link from "next/link"
import { Store, Mail, Phone, MapPin } from "lucide-react"
import { BRAND } from "@/lib/brand"

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">{BRAND.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{BRAND.tagline}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">روابط سريعة</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/shop" className="hover:text-foreground">المتجر</Link></li>
              <li><Link href="/categories" className="hover:text-foreground">التصنيفات</Link></li>
              <li><Link href="/merchants" className="hover:text-foreground">التجار</Link></li>
              <li><Link href="/how-it-works" className="hover:text-foreground">كيف يعمل</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">معلومات</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/installment-info" className="hover:text-foreground">معلومات التقسيط</Link></li>
              <li><Link href="/installment-terms" className="hover:text-foreground">شروط التقسيط</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">الشروط والأحكام</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">سياسة الخصوصية</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">تواصل معنا</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/admin-login" className="flex items-center gap-2 hover:text-foreground"><Mail className="h-4 w-4" /> دخول الإدارة والموظفين</Link></li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> صنعاء، اليمن</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 space-y-2 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {BRAND.name}. جميع الحقوق محفوظة.</p>
          <p className="text-xs max-w-3xl mx-auto leading-relaxed">
            هذه منصة تجريبية (Demo) ولا تقدم خدمات مالية فعلية. خدمات التقسيط والدفع الفعلية تخضع مستقبلاً للجهات المرخصة من البنك المركزي اليمني والأنظمة المعمول بها في الجمهورية اليمنية.
            التحقق من الهوية خطوة منفصلة عن تقييم الأهلية المالية، ولا يتم اتخاذ أي قرار تمويلي بشكل تلقائي.
          </p>
        </div>
      </div>
    </footer>
  )
}
