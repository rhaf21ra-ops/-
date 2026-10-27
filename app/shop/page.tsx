"use client";

import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/lib/store";
import { CATEGORIES, GOVERNORATES } from "@/lib/constants";
import { Search, SlidersHorizontal, Package, X } from "lucide-react";
import { useMemo, useState, Suspense } from "react";
import { formatCurrency } from "@/lib/brand";

const SORT_OPTIONS = [
  { value: "newest", label: "الأحدث" },
  { value: "best-selling", label: "الأكثر مبيعاً" },
  { value: "price-low", label: "السعر من الأقل للأعلى" },
  { value: "price-high", label: "السعر من الأعلى للأقل" },
];

function ShopContent() {
  const { products, merchants } = useApp();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [merchantId, setMerchantId] = useState("");
  const [installmentOnly, setInstallmentOnly] = useState(false);
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("newest");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.merchantName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    if (category) result = result.filter(p => p.category === category);
    if (merchantId) result = result.filter(p => p.merchantId === merchantId);
    if (installmentOnly) result = result.filter(p => p.installmentAvailable);
    if (city) result = result.filter(p => p.city === city);
    if (maxPrice) result = result.filter(p => p.cashPrice <= Number(maxPrice));

    switch (sort) {
      case "price-low": result.sort((a, b) => a.cashPrice - b.cashPrice); break;
      case "price-high": result.sort((a, b) => b.cashPrice - a.cashPrice); break;
      case "best-selling": result.sort((a, b) => b.soldCount - a.soldCount); break;
      default: result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [products, query, category, merchantId, installmentOnly, city, maxPrice, sort]);

  const clearFilters = () => {
    setQuery(""); setCategory(""); setMerchantId(""); setInstallmentOnly(false); setCity(""); setMaxPrice(""); setSort("newest");
  };

  const hasFilters = query || category || merchantId || installmentOnly || city || maxPrice;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6">
        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="ابحث عن منتج..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pr-10 h-12 text-base"
          />
        </div>

        <div className="flex gap-6">
          {/* Filters sidebar - desktop */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="sticky top-20">
              <CardContent className="p-4 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    الفلاتر
                  </h3>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                      <X className="h-3 w-3 ml-1" />
                      مسح
                    </Button>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">التصنيف</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="كل التصنيفات" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">التاجر</label>
                  <Select value={merchantId} onValueChange={setMerchantId}>
                    <SelectTrigger><SelectValue placeholder="كل التجار" /></SelectTrigger>
                    <SelectContent>
                      {merchants.map(m => <SelectItem key={m.id} value={m.id}>{m.storeName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">المدينة</label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger><SelectValue placeholder="كل المدن" /></SelectTrigger>
                    <SelectContent>
                      {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">السعر الأقصى (ر.ي)</label>
                  <Input
                    type="number"
                    placeholder="مثلاً 500000"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="installment"
                    checked={installmentOnly}
                    onChange={e => setInstallmentOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <label htmlFor="installment" className="text-sm font-medium cursor-pointer">
                    متاح بالتقسيط فقط
                  </label>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Products grid */}
          <div className="flex-1 min-w-0">
            {/* Sort & count */}
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{filteredProducts.length} منتج</span>
                <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters(true)}>
                  <SlidersHorizontal className="h-4 w-4 ml-1" />
                  فلترة
                </Button>
              </div>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={Package}
                title="لا توجد منتجات مطابقة"
                description="جرّب تغيير الفلاتر أو كلمة البحث"
                actionLabel="مسح الفلاتر"
                actionHref="#"
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-col items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold">لم تجد المنتج الذي تريده؟</p>
                <p className="text-sm text-muted-foreground">أرسل رابط المنتج أو صورته من أي متجر محلي، ونتواصل مع المتجر ونوفره لك بالتقسيط.</p>
              </div>
              <Link href="/request-product" className="shrink-0"><Button>طلب منتج غير مدرج</Button></Link>
            </div>
          </div>
        </div>

        {/* Mobile filters modal */}
        {showFilters && (
          <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setShowFilters(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">الفلاتر</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">التصنيف</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="كل التصنيفات" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">المدينة</label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger><SelectValue placeholder="كل المدن" /></SelectTrigger>
                    <SelectContent>
                      {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">السعر الأقصى</label>
                  <Input type="number" placeholder="مثلاً 500000" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="installment-mobile" checked={installmentOnly} onChange={e => setInstallmentOnly(e.target.checked)} className="h-4 w-4 accent-primary" />
                  <label htmlFor="installment-mobile" className="text-sm">متاح بالتقسيط فقط</label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={clearFilters}>مسح</Button>
                  <Button className="flex-1" onClick={() => setShowFilters(false)}>تطبيق ({filteredProducts.length})</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-16 lg:hidden" />
      <Footer />
      <BottomNav />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground">جاري التحميل...</div></div>}>
      <ShopContent />
    </Suspense>
  );
}
