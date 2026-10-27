"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ImageFilePicker } from "@/components/ImageFilePicker";
import { useApp } from "@/lib/store";
import { formatCurrency } from "@/lib/brand";
import { CURRENCIES, CURRENCY_INFO, roundMoney, asCurrency, type Currency } from "@/lib/currency";
import { CATEGORIES, GOVERNORATES } from "@/lib/constants";
import { Home, Package, ShoppingBag, Boxes, Wallet, Settings, Plus, Pencil, Trash2, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/merchant", label: "الرئيسية", icon: Home },
  { href: "/merchant/products", label: "المنتجات", icon: Package },
  { href: "/merchant/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/merchant/inventory", label: "المخزون", icon: Boxes },
  { href: "/merchant/settlements", label: "التسويات", icon: Wallet },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/merchant/settings", label: "الإعدادات", icon: Settings },
];

export default function MerchantProductsPage() {
  const { currentUser, merchants, products, addProduct, updateProduct, deleteProduct, isReal, markup } = useApp();
  const merchant = merchants.find(m => m.userId === currentUser?.id);
  const myProducts = products.filter(p => p.merchantId === merchant?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "", description: "", cashPrice: "", currency: "YER" as Currency, category: "الإلكترونيات", stock: "10",
    images: [] as string[],
    installmentAvailable: true, city: merchant?.city || "أمانة العاصمة",
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", cashPrice: "", currency: "YER" as Currency, category: "الإلكترونيات", stock: "10", images: [] as string[], installmentAvailable: true, city: merchant?.city || "أمانة العاصمة" });
    setEditingId(null);
  };

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // منع التكرار عند الضغط السريع
    if (!formData.name || !formData.cashPrice) {
      toast.error("البيانات غير مكتملة");
      return;
    }
    if (formData.images.length === 0) {
      toast.error("أضف صورة واحدة على الأقل");
      return;
    }
    setSubmitting(true);
    const cashPrice = Number(formData.cashPrice);
    const productData = {
      merchantId: merchant!.id,
      merchantName: merchant!.storeName,
      name: formData.name,
      description: formData.description,
      cashPrice,
      currency: formData.currency,
      deferredPrice: roundMoney(cashPrice * (1 + markup / 100), formData.currency),
      category: formData.category as Product["category"],
      stock: Number(formData.stock),
      images: formData.images,
      installmentAvailable: formData.installmentAvailable,
      city: formData.city,
      specs: [],
      featured: false,
      visible: true,
    };

    if (editingId) {
      const ok = await Promise.resolve(updateProduct(editingId, productData));
      setSubmitting(false);
      if (ok === false) return;
      if (!isReal) toast.success("تم تحديث المنتج بنجاح");
    } else {
      const ok = await Promise.resolve(addProduct(productData));
      setSubmitting(false);
      if (ok === false) return;
      if (!isReal) toast.success("تم إضافة المنتج بنجاح");
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData({
      name: p.name, description: p.description, cashPrice: String(p.cashPrice), currency: asCurrency(p.currency),
      category: p.category, stock: String(p.stock), images: [...p.images],
      installmentAvailable: p.installmentAvailable, city: p.city,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    if (!isReal) toast.success("تم حذف المنتج");
  };

  return (
    <DashboardLayout navItems={navItems} title="منتجاتي" role="merchant">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">منتجاتي ({myProducts.length})</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" /> إضافة منتج</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل منتج" : "إضافة منتج جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">اسم المنتج *</Label>
                  <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label className="mb-1.5 block">التصنيف</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">السعر النقدي *</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" step={formData.currency === "YER" ? "1" : "0.01"} value={formData.cashPrice} onChange={e => setFormData({ ...formData, cashPrice: e.target.value })} required />
                    <Select value={formData.currency} onValueChange={v => setFormData({ ...formData, currency: v as Currency })}>
                      <SelectTrigger className="w-40 shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{CURRENCY_INFO[c].label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">اكتب السعر بالعملة التي تبيع بها. يستطيع المشتري الدفع أو التقسيط بأي عملة من الثلاث، ويُحوَّل السعر تلقائياً.</p>
                </div>
                <div>
                  <Label className="mb-1.5 block">المخزون</Label>
                  <Input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1.5 block">المدينة</Label>
                  <Select value={formData.city} onValueChange={v => setFormData({ ...formData, city: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="installment" checked={formData.installmentAvailable} onChange={e => setFormData({ ...formData, installmentAvailable: e.target.checked })} className="h-4 w-4 accent-primary" />
                  <Label htmlFor="installment">متاح للتقسيط</Label>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">الوصف</Label>
                  <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">صور المنتج</Label>
                  <ImageFilePicker images={formData.images} onChange={images => setFormData({ ...formData, images })} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">إلغاء</Button></DialogClose>
                <Button type="submit" disabled={submitting}>{submitting ? "جاري الحفظ..." : editingId ? "تحديث" : "إضافة"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {myProducts.length === 0 ? (
        <EmptyState icon={Package} title="لا توجد منتجات" description="ابدأ بإضافة منتجاتك ليعرضها العملاء" actionLabel="إضافة منتج" actionHref="#" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>السعر النقدي</TableHead>
                  <TableHead>السعر المؤجل</TableHead>
                  <TableHead>المخزون</TableHead>
                  <TableHead>التقسيط</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                        <span className="line-clamp-1 max-w-32">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.category}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(p.cashPrice, p.currency)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(p.deferredPrice, p.currency)}</TableCell>
                    <TableCell className="text-sm">{p.stock}</TableCell>
                    <TableCell className="text-sm">{p.installmentAvailable ? "نعم" : "لا"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
