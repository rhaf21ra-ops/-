"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { Star, MapPin, Package } from "lucide-react";

export default function MerchantsPage() {
  const { merchants, products } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">التجار</h1>
          <p className="text-muted-foreground">تسوق من متاجر يمنية موثوقة</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.filter(m => m.status === "نشط").map(m => {
            const productCount = products.filter(p => p.merchantId === m.id).length;
            return (
              <Link key={m.id} href={`/shop?merchant=${m.id}`}>
                <Card className="hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        {m.storeName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1">{m.storeName}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{m.rating}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{m.city}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{productCount} منتج</span>
                          <span>المالك: {m.ownerName}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}
