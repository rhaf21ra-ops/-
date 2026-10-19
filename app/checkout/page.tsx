"use client";

import { useRouter } from "next/navigation";
import { CurrencySwitch } from "@/components/CurrencySwitch";
import { roundMoney } from "@/lib/currency";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useApp } from "@/lib/store";
import { formatCurrency, INSTALLMENT_DURATIONS } from "@/lib/brand";
import { GOVERNORATES } from "@/lib/constants";
import { guaranteeOptionsFor } from "@/lib/guarantees";
import { findBranch, isBranchInRegion } from "@/lib/branches";
import { GuaranteeSelect, emptyGuarantee, validateGuarantee, type GuaranteeValue } from "@/components/GuaranteeSelect";
import { RegionBranchSelect } from "@/components/RegionBranchSelect";
import type { FinancingDetails } from "@/lib/types";
import { CreditCard, Wallet, Truck, CheckCircle2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function CheckoutPage() {
  const {
    cart, clearCart, createOrder, createInstallmentApplication, createInstallmentRequest,
    currentUser, employees, companies, addAuditLog, isReal, placeOrder, toPay, payCurrency, markup,
  } = useApp();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    phone: "",
    governorate: "",
    city: "",
    area: "",
    address: "",
    notes: "",
  });
  const [paymentType, setPaymentType] = useState<"نقدي" | "تقسيط">("نقدي");
  const [duration, setDuration] = useState(12);
  // Installment-only fields. Cash orders ignore them entirely.
  const [region, setRegion] = useState("");
  const [branchId, setBranchId] = useState("");
  const [guarantee, setGuarantee] = useState<GuaranteeValue>(emptyGuarantee);
  const [submitting, setSubmitting] = useState(false);

  // Real mode: the server total has no delivery fee yet, so none is shown (never display a price that is not charged).
  const deliveryFee = isReal ? 0 : toPay(5000, "YER");

  const employee = employees.find(emp => emp.userId === currentUser?.id);
  const company = employee ? companies.find(c => c.id === employee.companyId) : null;
  const guaranteeTypes = guaranteeOptionsFor(!!employee, company);

  // Every unit price is converted and rounded in the pay currency first (same rule as the server), then the markup is applied to the total.
  const cashTotal = cart.reduce((sum, item) => sum + toPay(item.cashPrice, item.currency) * item.quantity, 0);
  const deferredTotal = roundMoney(cashTotal * (1 + markup / 100), payCurrency);
  const monthlyInstallment = roundMoney(deferredTotal / duration, payCurrency);
  const orderSubtotal = paymentType === "تقسيط" ? deferredTotal : cashTotal;
  const grandTotal = orderSubtotal + deliveryFee;

  /** Returns the validated financing block, or null after showing the error. */
  const buildFinancing = (): FinancingDetails | null => {
    if (!region) {
      toast.error("اختر المنطقة", { description: "المنطقة مطلوبة لطلب التقسيط" });
      return null;
    }
    if (!branchId || !isBranchInRegion(branchId, region)) {
      toast.error("اختر الفرع", { description: "اختر فرعاً من المنطقة التي اخترتها" });
      return null;
    }
    const guaranteeError = validateGuarantee(guaranteeTypes, guarantee);
    if (guaranteeError) {
      toast.error("الضمان غير مكتمل", { description: guaranteeError });
      return null;
    }
    const branch = findBranch(branchId);
    const type = guaranteeTypes.find(t => t.id === guarantee.guaranteeTypeId);
    if (!branch || !type) {
      toast.error("تعذّر التحقق من الفرع أو الضمان");
      return null;
    }
    return {
      region,
      branchId,
      branchName: branch.name,
      guaranteeCode: type.code as FinancingDetails["guaranteeCode"],
      guaranteeName: type.name_ar,
      guaranteeDetails: guarantee.details,
      ...(type.requires_guarantor && {
        guarantorName: guarantee.guarantorName,
        guarantorPhone: guarantee.guarantorPhone,
        guarantorIdNumber: guarantee.guarantorIdNumber || undefined,
      }),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.governorate || !formData.city || !formData.address) {
      toast.error("البيانات غير مكتملة", { description: "يرجى تعبئة جميع الحقول المطلوبة" });
      return;
    }

    const financing = paymentType === "تقسيط" ? buildFinancing() : null;
    if (paymentType === "تقسيط" && !financing) return;

    if (isReal) {
      if (!currentUser) {
        toast.error("سجّل الدخول أولاً لإتمام الطلب");
        router.push("/login?redirect=/checkout");
        return;
      }
      setSubmitting(true);
      const r = await placeOrder({
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        payment: paymentType,
        recipient: formData.name,
        phone: formData.phone,
        governorate: formData.governorate,
        city: formData.city,
        address: formData.area ? `${formData.area} - ${formData.address}` : formData.address,
        notes: formData.notes,
        months: duration,
        guaranteeTypeId: guarantee.guaranteeTypeId,
        guaranteeDetails: guarantee.details,
        guarantorName: guarantee.guarantorName,
        guarantorPhone: guarantee.guarantorPhone,
        guarantorIdNumber: guarantee.guarantorIdNumber,
        branchId: financing?.branchId,
        currency: payCurrency,
      });
      setSubmitting(false);
      if (!r.ok) {
        toast.error("تعذّر إنشاء الطلب", { description: r.error });
        return;
      }
      toast.success(paymentType === "تقسيط" ? "تم إرسال طلب التقسيط" : "تم إنشاء الطلب", {
        description: paymentType === "تقسيط" ? "سيراجعه الطرف المختص ثم تُعلَم بالنتيجة" : "سنوافيك بحالة التوصيل",
      });
      clearCart();
      router.push(currentUser.role === "employee" ? "/employee/orders" : "/customer");
      return;
    }

    setSubmitting(true);

    const items = cart.map(item => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      merchantId: item.merchantId,
      merchantName: item.merchantName,
      quantity: item.quantity,
      cashPrice: toPay(item.cashPrice, item.currency),
      deferredPrice: toPay(item.deferredPrice, item.currency),
      paymentType,
    }));

    const merchantIds = [...new Set(items.map(i => i.merchantId))];

    const order = createOrder({
      customerName: formData.name,
      customerId: employee?.id || currentUser?.id || "",
      items,
      total: grandTotal,
      currency: payCurrency,
      months: paymentType === "تقسيط" ? duration : undefined,
      paymentType,
      status: paymentType === "تقسيط" ? "قيد المراجعة" : "جديد",
      city: formData.city,
      governorate: formData.governorate,
      address: formData.address,
      phone: formData.phone,
      notes: formData.notes,
      merchantIds,
      ...(financing && { financing }),
    });

    if (paymentType === "تقسيط" && financing && cart.length > 0) {
      const firstItem = cart[0];
      const productName = cart.length > 1 ? `${firstItem.productName} و${cart.length - 1} منتجات أخرى` : firstItem.productName;

      // Employees with a normal guarantee follow the employee application path (unchanged).
      // Company guarantee, and every customer, go through a request. Company guarantee waits for the company.
      if (employee && company && financing.guaranteeCode !== "company") {
        createInstallmentApplication({
          employeeId: employee.id,
          employeeName: employee.name,
          companyId: company.id,
          companyName: company.name,
          productId: firstItem.productId,
          productName,
          merchantId: firstItem.merchantId,
          merchantName: firstItem.merchantName,
          currency: payCurrency,
          cashPrice: cashTotal,
          deferredPrice: deferredTotal,
          durationMonths: duration,
          monthlyInstallment,
          financing,
        });
      } else {
        createInstallmentRequest({
          userId: currentUser?.id || "",
          userName: currentUser?.name || formData.name,
          userRole: currentUser?.role || "customer",
          productId: firstItem.productId,
          productName,
          productImage: firstItem.productImage,
          merchantId: firstItem.merchantId,
          merchantName: firstItem.merchantName,
          currency: payCurrency,
          cashPrice: cashTotal,
          deferredPrice: deferredTotal,
          durationMonths: duration,
          monthlyInstallment,
          companyId: employee && company && financing.guaranteeCode === "company" ? company.id : undefined,
          companyApproved: employee && company && financing.guaranteeCode === "company" ? null : undefined,
          financing,
        });
      }

      toast.success("تم إرسال طلب التقسيط بنجاح", {
        description: `رقم الطلب: ${order.orderNumber} - سيتم مراجعة طلبك قريباً`,
      });
      addAuditLog({
        actor: currentUser?.name || "مستخدم",
        actorRole: currentUser?.role || "employee",
        action: "إنشاء طلب تقسيط",
        entity: "Order",
        entityId: order.id,
        details: `طلب ${order.orderNumber} - منطقة ${financing.region} - فرع ${financing.branchName} - ${financing.guaranteeName}`,
      });
    } else {
      toast.success("تم إنشاء الطلب بنجاح", {
        description: `رقم الطلب: ${order.orderNumber}`,
      });
      addAuditLog({
        actor: currentUser?.name || "مستخدم",
        actorRole: currentUser?.role || "employee",
        action: "إنشاء طلب",
        entity: "Order",
        entityId: order.id,
        details: `إنشاء طلب ${paymentType} رقم ${order.orderNumber}`,
      });
    }

    clearCart();
    setSubmitting(false);

    if (currentUser?.role === "employee") {
      router.push("/employee/orders");
    } else {
      router.push("/");
    }
  };

  useEffect(() => {
    if (cart.length === 0) {
      router.push("/cart");
    }
  }, [cart.length, router]);

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">إتمام الطلب</h1>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
          {/* Form fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery info */}
            <Card>
              <CardContent className="p-5">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  بيانات التوصيل
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block">الاسم الكامل *</Label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="الاسم الكامل" required />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">رقم الهاتف *</Label>
                    <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="07XXXXXXXX" required dir="ltr" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">المحافظة *</Label>
                    <Select value={formData.governorate} onValueChange={v => setFormData({ ...formData, governorate: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                      <SelectContent>
                        {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">المدينة *</Label>
                    <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="المدينة" required />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">المنطقة</Label>
                    <Input value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} placeholder="المنطقة / الحي" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 block">العنوان التفصيلي *</Label>
                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="الشارع، رقم المنزل، أقرب معلم" required />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 block">ملاحظات التوصيل</Label>
                    <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="أي ملاحظات إضافية للتوصيل" rows={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card>
              <CardContent className="p-5">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  طريقة الدفع
                </h2>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setPaymentType("نقدي")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      paymentType === "نقدي" ? "border-primary bg-primary/5" : "border-border hover:border-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className={`h-6 w-6 ${paymentType === "نقدي" ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-bold text-sm">الدفع النقدي</p>
                        <p className="text-xs text-muted-foreground">دفع كامل عند الاستلام</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("تقسيط")}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      paymentType === "تقسيط" ? "border-primary bg-primary/5" : "border-border hover:border-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className={`h-6 w-6 ${paymentType === "تقسيط" ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-bold text-sm">خطة تقسيط</p>
                        <p className="text-xs text-muted-foreground">ادفع على أقساط شهرية</p>
                      </div>
                    </div>
                  </button>
                </div>

                {paymentType === "تقسيط" && (
                  <div className="space-y-6 bg-primary/5 rounded-xl p-4 border border-primary/20">
                    <div>
                      <Label className="mb-2 block font-medium">اختر مدة التقسيط</Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {INSTALLMENT_DURATIONS.map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDuration(d)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              duration === d ? "bg-primary text-primary-foreground" : "bg-white border"
                            }`}
                          >
                            {d} شهراً
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">القسط الشهري:</span>
                          <span className="font-bold text-primary mr-2">{formatCurrency(monthlyInstallment, payCurrency)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">إجمالي المبلغ المؤجل:</span>
                          <span className="font-bold mr-2">{formatCurrency(deferredTotal, payCurrency)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white p-4 border">
                      <RegionBranchSelect
                        region={region}
                        onRegionChange={setRegion}
                        branchId={branchId}
                        onBranchChange={setBranchId}
                      />
                    </div>

                    <div className="rounded-xl bg-white p-4 border">
                      <GuaranteeSelect
                        types={guaranteeTypes}
                        value={guarantee}
                        onChange={setGuarantee}
                      />
                      {employee && !company && (
                        <p className="mt-3 text-xs text-muted-foreground">حسابك غير مرتبط بشركة، لذلك لا تظهر ضمانة الشركة.</p>
                      )}
                    </div>

                    <p className="text-[10px] text-muted-foreground">
                      * اختيار الضمان لا يعني الموافقة على التمويل. القرار النهائي للجهة المالية المخوّلة.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card className="sticky top-20">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-bold text-lg">ملخص الطلب</h2>
                <CurrencySwitch />
                <Separator />
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center gap-2 text-sm">
                      <img src={item.productImage} alt="" className="w-10 h-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs line-clamp-1">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity}x · {item.paymentType}</p>
                      </div>
                      <span className="text-xs font-medium">
                        {formatCurrency(toPay(paymentType === "تقسيط" ? item.deferredPrice : item.cashPrice, item.currency) * item.quantity, payCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">إجمالي المنتجات</span>
                    <span>{formatCurrency(orderSubtotal, payCurrency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رسوم التوصيل</span>
                    <span>{formatCurrency(deliveryFee, payCurrency)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-bold">الإجمالي</span>
                  <span className="font-bold text-primary">{formatCurrency(grandTotal, payCurrency)}</span>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? (
                    "جاري المعالجة..."
                  ) : paymentType === "تقسيط" ? (
                    <>
                      <CreditCard className="h-5 w-5 ml-2" />
                      إرسال طلب التقسيط
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 ml-2" />
                      تأكيد الطلب
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Truck className="h-3 w-3" />
                  توصيل لجميع المحافظات
                </p>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>

      <div className="h-16 lg:hidden" />
      <Footer />
      <BottomNav />
    </div>
  );
}
