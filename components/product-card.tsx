"use client"
import Link from "next/link"
import { MoneyApprox } from "@/components/MoneyApprox"
import Image from "next/image"
import { ShoppingCart, Star, MapPin, CreditCard } from "lucide-react"
import { Product } from "@/lib/types"
import { formatCurrency } from "@/lib/brand"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/lib/store"

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useApp()

  const handleAdd = () => {
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] || "",
      merchantId: product.merchantId,
      merchantName: product.merchantName,
      quantity: 1,
      cashPrice: product.cashPrice,
      deferredPrice: product.deferredPrice,
      paymentType: "نقدي",
    })
  }

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-200 animate-fade-in flex flex-col h-full">
      <Link href={`/shop/${product.id}`} className="block relative aspect-square overflow-hidden bg-muted">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {product.featured && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">مميز</Badge>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white font-semibold">نفذت الكمية</span>
          </div>
        )}
      </Link>
      <CardContent className="p-4 flex-1">
        <Link href={`/shop/${product.id}`}>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 hover:text-primary transition-colors">{product.name}</h3>
        </Link>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.merchantName}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-medium">{product.rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({product.reviewsCount})</span>
          <span className="text-xs text-muted-foreground mr-auto flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />{product.city}
          </span>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-primary">{formatCurrency(product.cashPrice, product.currency)}</span>
            <span className="text-xs text-muted-foreground">نقدي</span>
          </div>
          <MoneyApprox amount={product.cashPrice} currency={product.currency} />
          {product.installmentAvailable && (
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">{formatCurrency(product.deferredPrice, product.currency)} تقسيط</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          onClick={handleAdd}
          size="sm"
          className="w-full"
          disabled={product.stock === 0}
        >
          <ShoppingCart className="h-4 w-4 ml-1" />
          أضف للسلة
        </Button>
      </CardFooter>
    </Card>
  )
}
