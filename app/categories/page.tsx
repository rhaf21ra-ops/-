"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES, CATEGORY_ICONS } from "@/lib/constants";
import * as Icons from "lucide-react";
import { useApp } from "@/lib/store";

export default function CategoriesPage() {
  const { products } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">التصنيفات</h1>
          <p className="text-muted-foreground">تصفح المنتجات حسب التصنيف</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {CATEGORIES.map(cat => {
            const iconName = CATEGORY_ICONS[cat] || "tag";
            const Icon = (Icons as any)[iconName] || Icons.Tag;
            const count = products.filter(p => p.category === cat).length;
            return (
              <Link key={cat} href={`/shop?category=${encodeURIComponent(cat)}`}>
                <Card className="hover:shadow-lg hover:border-primary transition-all cursor-pointer group text-center">
                  <CardContent className="p-6">
                    <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{cat}</h3>
                    <p className="text-xs text-muted-foreground">{count} منتج</p>
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
