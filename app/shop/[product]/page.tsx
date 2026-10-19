"use client";

import { useParams, useRouter } from "next/navigation";
import { MoneyApprox } from "@/components/MoneyApprox";
import { asCurrency, roundMoney } from "@/lib/currency";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useApp } from "@/lib/store";
import { formatCurrency, calculateMonthlyInstallment, INSTALLMENT_DURATIONS, BRAND } from "@/lib/brand";
import { Star, MapPin, Store, ShoppingCart, CreditCard, CheckCircle2, XCircle, Truck, ShieldCheck, Package, FileText, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { products, addToCart, currentUser, createInstallmentRequest, isReal } = useApp();
  const product = products.find(p => p.id === params.product);

  const [selectedImage, setSelectedImage] = useState(0);
  const [duration, setDuration] = useState(12);
  const [quantity, setQuantity] = useState(1);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <EmptyState
            icon={Package}
            title="المنتج غير موجود"
            description="قد يكون هذا المنتج قد حُذف أو الرابط غير صحيح"
            actionLabel="العودة للمتجر"
            actionHref="/shop"
          />
        </div>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  const pcur = asCurrency(product.currency);
  const monthly = roundMoney(product.deferredPrice / duration, pcur);
  const inStock = product.stock > 0;

  const handleAddToCart = (paymentType: "نقدي" | "تقسيط") => {
    if (!inStock) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0],
      merchantId: product.merchantId,
      merchantName: product.merchantName,
      quantity,
      currency: pcur,
      cashPrice: product.cashPrice,
      deferredPrice: product.deferredPrice,
      paymentType,
      durationMonths: paymentType === "تقسيط" ? duration : undefined,
    });
    toast.success(`تمت إضافة ${quantity} من المنتج إلى السلة`);
  };

  const handleBuyNow = (paymentType: "نقدي" | "تقسيط") => {
    handleAddToCart(paymentType);
    router.push("/cart");
  };

  const handleInstallmentRequest = () => {
    if (!currentUser) {
      toast.error("يجب تسجيل الدخول", { description: "يرجى تسجيل الدخول لتقديم طلب التقسيط" });
      router.push("/login");
      return;
    }
    if (currentUser.role !== "employee" && currentUser.role !== "customer") {
      toast.error("هذا الحساب غير مؤهل", { description: "طلب التقسيط متاح للموظفين والعملاء فقط" });
      return;
    }
    if (!product?.installmentAvailable) {
      toast.error("المنتج غير متاح للتقسيط");
      return;
    }
    setShowRequestDialog(true);
    setRequestSubmitted(false);
  };

  const submitInstallmentRequest = () => {
    if (!currentUser || !product) return;
    if (isReal) {
      // Real mode: an installment request is an order with a guarantee and a branch, completed at checkout.
      addToCart({
        productId: product.id, productName: product.name, productImage: product.images[0] || "", merchantId: product.merchantId,
        merchantName: product.merchantName, quantity, currency: pcur, cashPrice: product.cashPrice, deferredPrice: product.deferredPrice,
        paymentType: "تقسيط", durationMonths: duration,
      });
      router.push("/checkout");
      return;
    }
    const req = createInstallmentRequest({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      productId: product.id,
      productName: product.name,
      productImage: product.images[0],
      merchantId: product.merchantId,
      merchantName: product.merchantName,
      currency: pcur,
      cashPrice: product.cashPrice,
      deferredPrice: product.deferredPrice,
      durationMonths: duration,
      monthlyInstallment: monthly,
    });
    setRequestSubmitted(true);
    toast.success("تم تقديم طلب التقسيط", { description: `رقم الطلب: ${req.requestNumber}` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button onClick={() => router.push("/")} className="hover:text-foreground">الرئيسية</button>
          <span>/</span>
          <button onClick={() => router.push("/shop")} className="hover:text-foreground">المتجر</button>
          <span>/</span>
          <button onClick={() => router.push(`/shop?category=${encodeURIComponent(product.category)}`)} className="hover:text-foreground">{product.category}</button>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Gallery */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="aspect-square bg-muted">
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === i ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.category}</Badge>
                {product.installmentAvailable && (
                  <Badge className="bg-primary text-primary-foreground">
                    <CreditCard className="h-3 w-3 ml-1" />
                    متاح بالتقسيط
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-3">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link href={`/merchants/${product.merchantId}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Store className="h-4 w-4" />
                  {product.merchantName}
                </Link>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{product.rating}</span>
                  <span className="text-muted-foreground">({product.reviewsCount} تقييم)</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {product.city}
                </div>
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <Card className={inStock ? "border-primary/30" : ""}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">السعر النقدي</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(product.cashPrice, pcur)}</p>
                  <p className="text-xs text-muted-foreground mt-1">دفع مرة واحدة</p>
                  <MoneyApprox amount={product.cashPrice} currency={pcur} />
                </CardContent>
              </Card>
              <Card className={product.installmentAvailable ? "border-primary/30" : "opacity-50"}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">السعر المؤجل</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(product.deferredPrice, pcur)}</p>
                  <p className="text-xs text-muted-foreground mt-1">عبر خطة تقسيط</p>
                  <MoneyApprox amount={product.deferredPrice} currency={pcur} />
                </CardContent>
              </Card>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 text-sm">
              {inStock ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-600">متوفر في المخزون</span>
                  <span className="text-muted-foreground">({product.stock} قطعة)</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-600">نفذت الكمية</span>
                </>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">الكمية:</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</Button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>+</Button>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" variant="outline" onClick={() => handleBuyNow("نقدي")} disabled={!inStock}>
                <ShoppingCart className="h-5 w-5 ml-2" />
                شراء نقداً
              </Button>
              <Button size="lg" onClick={() => handleBuyNow("تقسيط")} disabled={!inStock || !product.installmentAvailable}>
                <CreditCard className="h-5 w-5 ml-2" />
                شراء بالتقسيط
              </Button>
            </div>
            {/* Installment Request Button */}
            {product.installmentAvailable && (
              <Button size="lg" variant="secondary" className="w-full gap-2" onClick={handleInstallmentRequest} disabled={!inStock}>
                <FileText className="h-5 w-5 ml-2" />
                طلب بالتقسيط
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" onClick={() => handleAddToCart("نقدي")} disabled={!inStock}>
                <ShoppingCart className="h-4 w-4 ml-2" />
                أضف للسلة (نقدي)
              </Button>
              <Button variant="ghost" onClick={() => handleAddToCart("تقسيط")} disabled={!inStock || !product.installmentAvailable}>
                <CreditCard className="h-4 w-4 ml-2" />
                أضف للسلة (تقسيط)
              </Button>
            </div>

            {/* Installment Calculator */}
            {product.installmentAvailable && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    احسب قسطك
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {INSTALLMENT_DURATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          duration === d
                            ? "bg-primary text-primary-foreground"
                            : "bg-white border hover:bg-muted"
                        }`}
                      >
                        {d} شهراً
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">القسط الشهري</p>
                      <p className="font-bold text-primary text-sm">{formatCurrency(monthly, pcur)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">إجمالي المبلغ</p>
                      <p className="font-bold text-sm">{formatCurrency(product.deferredPrice, pcur)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">عدد الأقساط</p>
                      <p className="font-bold text-sm">{duration} قسط</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/10 text-center">
                    <p className="text-xs text-muted-foreground">
                      تاريخ أول قسط: {new Date(Date.now() + 30 * 86400000).toLocaleDateString("ar-YE")}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    * هذه أرقام تجريبية توضيحية وليست عرضاً مالياً حقيقياً
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center">
                <Truck className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">توصيل محلي</p>
              </div>
              <div className="text-center">
                <ShieldCheck className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">تسوق آمن</p>
              </div>
              <div className="text-center">
                <Store className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">تاجر يمني</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description & Specs */}
        <div className="mt-12">
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="description">الوصف</TabsTrigger>
              <TabsTrigger value="specs">المواصفات</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="specs" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {product.specs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {product.specs.map((spec, i) => (
                        <div key={i} className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground text-sm">{spec.label}</span>
                          <span className="font-medium text-sm">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">لا توجد مواصفات إضافية</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="h-16 lg:hidden" />
      <Footer />
      <BottomNav />

      {/* Installment Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              طلب تقسيط
            </DialogTitle>
            <DialogDescription>
              {requestSubmitted ? "تم تقديم طلبك بنجاح" : "مراجعة تفاصيل طلب التقسيط"}
            </DialogDescription>
          </DialogHeader>

          {requestSubmitted ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-bold text-lg">تم تقديم الطلب بنجاح</p>
                <p className="text-sm text-muted-foreground mt-1">
                  سيتم مراجعة طلبك من قبل الإدارة وإشعارك بالنتيجة
                </p>
              </div>
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  تقديم الطلب لا يعني الموافقة التلقائية. سيتم التحقق من الهوية وتقييم الأهلية قبل الموافقة.
                </AlertDescription>
              </Alert>
              <Button className="w-full" onClick={() => setShowRequestDialog(false)}>
                حسناً
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <img src={product.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.merchantName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">السعر النقدي</p>
                  <p className="font-bold">{formatCurrency(product.cashPrice, pcur)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">السعر المؤجل</p>
                  <p className="font-bold text-primary">{formatCurrency(product.deferredPrice, pcur)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">المدة</p>
                  <p className="font-bold">{duration} شهراً</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-1">القسط الشهري</p>
                  <p className="font-bold text-primary">{formatCurrency(monthly, pcur)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {INSTALLMENT_DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      duration === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                    }`}
                  >
                    {d} شهراً
                  </button>
                ))}
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  تقديم الطلب لا يعني الموافقة التلقائية. سيتم التحقق من الهوية وتقييم الأهلية وفقاً للأنظمة المعمول بها.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRequestDialog(false)}>
                  إلغاء
                </Button>
                <Button className="flex-1" onClick={submitInstallmentRequest}>
                  <FileText className="h-4 w-4 ml-2" />
                  تأكيد الطلب
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
