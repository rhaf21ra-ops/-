"use client";

import Link from "next/link";
import { CurrencySwitch } from "@/components/CurrencySwitch";
import { roundMoney } from "@/lib/currency";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { useApp } from "@/lib/store";
import { formatCurrency, INSTALLMENT_DURATIONS } from "@/lib/brand";
import { Trash2, ShoppingCart, ArrowLeft, CreditCard, Wallet, Truck } from "lucide-react";
import { toast } from "sonner";

export default function CartPage() {
  const { cart, removeFromCart, updateCartQuantity, updateCartPaymentType, clearCart, cartTotal, currentUser, toPay, payCurrency, isReal } = useApp();
  const router = useRouter();

  // Real mode: the server total has no delivery fee yet, so none is shown (never display a price that is not charged).
  const deliveryFee = cart.length > 0 && !isReal ? toPay(5000, "YER") : 0;
  const grandTotal = cartTotal + deliveryFee;

  const handleCheckout = () => {
    if (!currentUser) {
      toast.info("يجب تسجيل الدخول أولاً");
      router.push("/login?redirect=/checkout");
      return;
    }
    router.push("/checkout");
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <EmptyState
            icon={ShoppingCart}
            title="سلة المشتريات فارغة"
            description="لم تقم بإضافة أي منتجات بعد. تصفح المتجر واختر منتجاتك المفضلة."
            actionLabel="تصفح المنتجات"
            actionHref="/shop"
          />
        </div>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">سلة المشتريات</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map(item => (
              <Card key={item.productId}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-24 h-24 rounded-lg object-cover bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm line-clamp-2">{item.productName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.merchantName}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => { removeFromCart(item.productId); toast.success("تم حذف المنتج من السلة"); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {/* Payment type */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">طريقة الدفع:</span>
                          <Select
                            value={item.paymentType}
                            onValueChange={(v) => updateCartPaymentType(item.productId, v as "نقدي" | "تقسيط")}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="نقدي">نقدي</SelectItem>
                              <SelectItem value="تقسيط" disabled={!item.deferredPrice}>تقسيط</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Duration for installment */}
                        {item.paymentType === "تقسيط" && (
                          <Select
                            value={String(item.durationMonths || 12)}
                            onValueChange={v => updateCartPaymentType(item.productId, "تقسيط", Number(v))}
                          >
                            <SelectTrigger className="h-8 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INSTALLMENT_DURATIONS.map(d => (
                                <SelectItem key={d} value={String(d)}>{d} شهراً</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Quantity */}
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.productId, Math.max(1, item.quantity - 1))}>-</Button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}>+</Button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {item.paymentType === "تقسيط" ? "السعر المؤجل" : "السعر النقدي"}
                        </span>
                        <span className="font-bold text-primary">
                          {formatCurrency(toPay(item.paymentType === "تقسيط" ? item.deferredPrice : item.cashPrice, item.currency) * item.quantity, payCurrency)}
                        </span>
                      </div>
                      {item.paymentType === "تقسيط" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          قسط شهري: {formatCurrency(roundMoney(toPay(item.deferredPrice, item.currency) * item.quantity / (item.durationMonths || 12), payCurrency), payCurrency)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => { clearCart(); toast.success("تم تفريغ السلة"); }}>
                <Trash2 className="h-4 w-4 ml-2" />
                تفريغ السلة
              </Button>
              <Link href="/shop">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  متابعة التسوق
                </Button>
              </Link>
            </div>
          </div>

          {/* Summary */}
          <div>
            <Card className="sticky top-20">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-bold text-lg">ملخص الطلب</h2>
                <CurrencySwitch />
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">إجمالي المنتجات</span>
                    <span className="font-medium">{formatCurrency(cartTotal, payCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      رسوم التوصيل
                    </span>
                    <span className="font-medium">{formatCurrency(deliveryFee, payCurrency)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-bold">الإجمالي</span>
                  <span className="font-bold text-primary">{formatCurrency(grandTotal, payCurrency)}</span>
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  <CreditCard className="h-5 w-5 ml-2" />
                  إتمام الطلب
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  دفع آمن - نسخة تجريبية
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="h-16 lg:hidden" />
      <Footer />
      <BottomNav />
    </div>
  );
}
