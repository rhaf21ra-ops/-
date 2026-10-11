"use client"
import Link from "next/link"
import { ArrowLeft, ShoppingCart, CreditCard, ShieldCheck, Truck, Store, Users, TrendingUp, Star, MapPin } from "lucide-react"
import { useApp } from "@/lib/store"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BRAND, formatCurrency } from "@/lib/brand"
import { CATEGORIES, CATEGORY_ICONS } from "@/lib/constants"

export default function HomePage() {
  const { products, merchants, companies } = useApp()

  const featuredProducts = products.filter(p => p.featured).slice(0, 8)
  const newProducts = products.slice(0, 8)

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/30">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, hsl(158 64% 30%) 0%, transparent 50%)" }} />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-2xl animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
              <ShieldCheck className="h-4 w-4" />
              منصة يمنية موثوقة للتسوق والتقسيط
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              {BRAND.tagline}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              تسوق من أفضل المتاجر في اليمن، وادفع نقداً أو بالتقسيط عبر خصم من راتبك الشهري. مناسب لموظفي الشركات المسجلين معنا.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop">
                <Button size="lg" className="text-base">
                  <ShoppingCart className="h-5 w-5 ml-2" />
                  ابدأ التسوق
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline" className="text-base">
                  كيف يعمل؟
                  <ArrowLeft className="h-5 w-5 mr-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{merchants.length}+</p>
                <p className="text-xs text-muted-foreground">متجر مسجل</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{companies.reduce((s, c) => s + c.employeeCount, 0)}+</p>
                <p className="text-xs text-muted-foreground">موظف مستفيد</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{products.length}+</p>
                <p className="text-xs text-muted-foreground">منتج متاح</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">22</p>
                <p className="text-xs text-muted-foreground">محافظة مغطاة</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: CreditCard, title: "تقسيط مريح", desc: "ادفع على أقساط شهرية تخصم من راتبك، حتى 24 شهر بدون فائدة مركبة." },
            { icon: ShieldCheck, title: "تسوق آمن", desc: "جميع المتاجر موثقة، والمنتجات أصلية، والدفعات محمية ومضمونة." },
            { icon: Truck, title: "توصيل لكل اليمن", desc: "نوصّل لكل المحافظات اليمنية مع إمكانية الدفع عند الاستلام." },
          ].map((f, i) => (
            <Card key={i} className="text-center p-6 hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <CardContent className="pt-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                  <f.icon className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">تصفح حسب التصنيف</h2>
          <Link href="/categories" className="text-sm font-medium text-primary hover:underline">عرض الكل</Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {CATEGORIES.slice(0, 12).map((cat) => (
            <Link key={cat} href={`/shop?category=${encodeURIComponent(cat)}`}>
              <Card className="p-4 text-center hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2">
                  <CategoryIcon name={CATEGORY_ICONS[cat]} />
                </div>
                <p className="text-xs font-medium line-clamp-1">{cat}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">منتجات مميزة</h2>
            <Link href="/shop" className="text-sm font-medium text-primary hover:underline">عرض الكل</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">وصل حديثاً</h2>
          <Link href="/shop" className="text-sm font-medium text-primary hover:underline">عرض الكل</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {newProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">هل أنت موظف في شركة مسجلة؟</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            سجل الآن وابدأ التسوق بالتقسيط عبر خصم مريح من راتبك الشهري
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base">
              إنشاء حساب جديد
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

function CategoryIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    laptop: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7h18M3 7l1.5-3h15L21 7M3 7v12h18V7M9 11h6" /></svg>,
    smartphone: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>,
  }
  return icons[name] || <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12c0 1.1.9 2 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
}
