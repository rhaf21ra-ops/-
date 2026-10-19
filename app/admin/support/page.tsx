"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Headphones, Loader2, Search, Send, ArrowRight, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Home, Users, Store, Building2, Package, ShoppingBag, CreditCard, Wallet, Receipt, BarChart3, Settings, ScrollText, Truck, ShieldCheck, KeyRound } from "lucide-react";

const adminNav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "الرئيسية", icon: Home },
  { href: "/admin/users", label: "المستخدمون", icon: Users },
  { href: "/admin/staff", label: "الحسابات والصلاحيات", icon: KeyRound },
  { href: "/admin/merchants", label: "التجار", icon: Store },
  { href: "/admin/companies", label: "الشركات", icon: Building2 },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
  { href: "/admin/installments", label: "التقسيط", icon: CreditCard },
  { href: "/admin/payments", label: "المدفوعات", icon: Wallet },
  { href: "/admin/delivery", label: "التوصيل", icon: Truck },
  { href: "/admin/settlements", label: "التسويات", icon: Receipt },
  { href: "/admin/reports", label: "التقارير", icon: BarChart3 },
  { href: "/admin/audit-logs", label: "سجل العمليات", icon: ScrollText },
  { href: "/staff/identity", label: "التحقق من الهوية", icon: ShieldCheck },
  { href: "/admin/support", label: "خدمة العملاء", icon: Headphones },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

type Ticket = {
  id: string; ticket_number: string; user_id: string; subject: string; body: string | null;
  status: string; category: string; created_at: string; updated_at: string;
  full_name: string | null; phone: string | null; email: string | null; assigned_to: string | null;
};

type Reply = { id: string; message: string; is_staff: boolean; created_at: string; user_id: string };

const STATUS_LABELS: Record<string, string> = {
  open: "جديدة", in_review: "قيد المراجعة", waiting_user: "بانتظار رد المستخدم", replied: "تم الرد", closed: "مغلقة",
};
const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800", in_review: "bg-amber-100 text-amber-800",
  waiting_user: "bg-orange-100 text-orange-800", replied: "bg-green-100 text-green-800", closed: "bg-neutral-100 text-neutral-600",
};
const CATEGORY_LABELS: Record<string, string> = {
  login: "تسجيل الدخول", identity: "توثيق الهوية", account: "الحساب",
  company: "حساب الشركة", employees: "الموظفون", password: "كلمة المرور", other: "أخرى",
};

export default function AdminSupportPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newCount, setNewCount] = useState(0);

  const load = useCallback(async () => {
    let query = supabase.from("support_tickets")
      .select("id, ticket_number, user_id, subject, body, status, category, created_at, updated_at, full_name, phone, email, assigned_to")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data, error } = await query;
    if (error) { console.error("load tickets", error); setTickets([]); return; }
    setTickets(data as Ticket[]);
    setNewCount((data as Ticket[]).filter(t => t.status === "open").length);
  }, [supabase, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function openTicket(ticket: Ticket) {
    setSelected(ticket);
    setReplies([]);
    const { data } = await supabase
      .from("support_ticket_replies")
      .select("id, message, is_staff, created_at, user_id")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setReplies((data ?? []) as Reply[]);
  }

  async function updateStatus(status: string) {
    if (!selected) return;
    const { error } = await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (error) { toast.error("تعذّr تحديث الحالة"); return; }
    toast.success("تم تحديث حالة التذكرة");
    setSelected(prev => prev ? { ...prev, status } : null);
    load();
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    const { data: session } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("support_ticket_replies")
      .insert({ ticket_id: selected.id, user_id: session.session?.user?.id, message: replyText.trim(), is_staff: true });
    if (error) {
      toast.error("تعذّr إرسال الرد");
    } else {
      toast.success("تم إرسال الرد");
      setReplyText("");
      setReplies(prev => [...prev, {
        id: crypto.randomUUID(), message: replyText.trim(), is_staff: true,
        created_at: new Date().toISOString(), user_id: session.session?.user?.id ?? "",
      }]);
      await updateStatus("replied");
    }
    setSending(false);
  }

  const filtered = tickets?.filter(t => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return t.ticket_number?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q) || t.full_name?.toLowerCase().includes(q);
  }) ?? [];

  return (
    <DashboardLayout navItems={adminNav} title="خدمة العملاء" role="admin">
      {!selected ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">تذاكر خدمة العملاء</h1>
            {newCount > 0 && <Badge className="bg-red-100 text-red-800">{newCount} تذكرة جديدة</Badge>}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث برقم التذكرة أو الاسم أو العنوان" className="pr-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="open">جديدة</SelectItem>
                <SelectItem value="in_review">قيد المراجعة</SelectItem>
                <SelectItem value="waiting_user">بانتظار رد المستخدم</SelectItem>
                <SelectItem value="replied">تم الرد</SelectItem>
                <SelectItem value="closed">مغلقة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tickets === null && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {tickets && filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              لا توجد تذاكر
            </CardContent></Card>
          )}

          {/* Desktop table */}
          {filtered.length > 0 && (
            <>
              <Card className="hidden md:block">
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم التذكرة</TableHead>
                        <TableHead>المرسل</TableHead>
                        <TableHead>العنوان</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(t => (
                        <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openTicket(t)}>
                          <TableCell className="text-xs font-mono" dir="ltr">{t.ticket_number}</TableCell>
                          <TableCell className="text-sm">{t.full_name || "—"}</TableCell>
                          <TableCell className="text-sm">{t.subject}</TableCell>
                          <TableCell className="text-sm">{CATEGORY_LABELS[t.category] || t.category}</TableCell>
                          <TableCell><Badge className={STATUS_COLORS[t.status] || ""} variant="secondary">{STATUS_LABELS[t.status] || t.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar-YE")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map(t => (
                  <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openTicket(t)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-medium text-sm truncate flex-1">{t.subject}</p>
                        <Badge className={STATUS_COLORS[t.status] || ""} variant="secondary">{STATUS_LABELS[t.status] || t.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground" dir="ltr">{t.ticket_number}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">{t.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar-YE")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-primary">
            <ArrowRight className="h-4 w-4" /> رجوع للقائمة
          </button>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold">{selected.subject}</h2>
                <Badge className={STATUS_COLORS[selected.status] || ""} variant="secondary">{STATUS_LABELS[selected.status] || selected.status}</Badge>
              </div>
              <p className="text-xs font-mono text-muted-foreground" dir="ltr">{selected.ticket_number}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">المرسل:</span> {selected.full_name || "—"}</div>
                <div><span className="text-muted-foreground">النوع:</span> {CATEGORY_LABELS[selected.category] || selected.category}</div>
                <div><span className="text-muted-foreground">الهاتف:</span> <span dir="ltr">{selected.phone || "—"}</span></div>
                <div><span className="text-muted-foreground">البريد:</span> <span dir="ltr">{selected.email || "—"}</span></div>
              </div>
              {selected.body && <div className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">{selected.body}</div>}
              <p className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString("ar-YE")}</p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-medium text-sm">سجل المحادثة</h3>
            {replies.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ردود بعد</p>}
            {replies.map(r => (
              <div key={r.id} className={`rounded-lg p-3 ${r.is_staff ? "bg-primary/5 border border-primary/20" : "bg-neutral-50"}`}>
                <p className="text-xs font-medium mb-1">{r.is_staff ? "موظف خدمة العملاء" : "المستخدم"}</p>
                <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("ar-YE")}</p>
              </div>
            ))}
          </div>

          {selected.status !== "closed" && (
            <div className="space-y-3">
              <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="اكتب ردك للمستخدم..." />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={sendReply} disabled={sending || !replyText.trim()} className="flex-1">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 ml-2" />إرسال الرد</>}
                </Button>
                <Select value={selected.status} onValueChange={updateStatus}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">جديدة</SelectItem>
                    <SelectItem value="in_review">قيد المراجعة</SelectItem>
                    <SelectItem value="waiting_user">بانتظار رد المستخدم</SelectItem>
                    <SelectItem value="replied">تم الرد</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
