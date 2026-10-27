"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Headphones, Loader2, ArrowRight, Send, MessageCircle } from "lucide-react";
import Link from "next/link";

type Ticket = {
  id: string; ticket_number: string; subject: string; body: string | null;
  status: string; category: string; created_at: string; updated_at: string;
  full_name: string | null; phone: string | null; email: string | null;
};

type Reply = {
  id: string; message: string; is_staff: boolean; created_at: string; user_id: string;
};

const STATUS_LABELS: Record<string, string> = {
  open: "جديدة", in_review: "قيد المراجعة", waiting_user: "بانتظار ردك", replied: "تم الرد", closed: "مغلقة",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800", in_review: "bg-amber-100 text-amber-800",
  waiting_user: "bg-orange-100 text-orange-800", replied: "bg-green-100 text-green-800", closed: "bg-neutral-100 text-neutral-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  login: "تسجيل الدخول", identity: "توثيق الهوية", account: "الحساب",
  company: "حساب الشركة", employees: "الموظفون", password: "كلمة المرور", other: "أخرى",
};

export default function MyTicketsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user?.id) { setTickets([]); return; }
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, body, status, category, created_at, updated_at, full_name, phone, email")
      .eq("user_id", session.session.user.id)
      .order("created_at", { ascending: false });
    if (error) { console.error("load tickets", error); setTickets([]); return; }
    setTickets(data as Ticket[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function openTicket(ticket: Ticket) {
    setSelected(ticket);
    setLoadingReplies(true);
    setReplies([]);
    const { data } = await supabase
      .from("support_ticket_replies")
      .select("id, message, is_staff, created_at, user_id")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setReplies((data ?? []) as Reply[]);
    setLoadingReplies(false);
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    const { data: session } = await supabase.auth.getSession();
    const { error } = await supabase
      .from("support_ticket_replies")
      .insert({ ticket_id: selected.id, user_id: session.session?.user?.id, message: replyText.trim(), is_staff: false });
    if (error) {
      toast.error("تعذّr إرسال الرد");
    } else {
      toast.success("تم إرسال ردك");
      setReplyText("");
      setReplies(prev => [...prev, {
        id: crypto.randomUUID(), message: replyText.trim(), is_staff: false,
        created_at: new Date().toISOString(), user_id: session.session?.user?.id ?? "",
      }]);
    }
    setSending(false);
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-4">يجب تسجيل الدخول لمتابعة تذاكرك</p>
          <Link href="/login"><Button>تسجيل الدخول</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">تذاكري</h1>
            </div>
            <Link href="/support"><Button size="sm"><Headphones className="h-4 w-4 ml-2" />تذكرة جديدة</Button></Link>
          </div>

          {tickets === null && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {tickets?.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              لا توجد تذاكر بعد. <Link href="/support" className="text-primary hover:underline">أرسل تذكرة جديدة</Link>
            </CardContent></Card>
          )}

          {!selected && tickets && tickets.length > 0 && (
            <div className="space-y-3">
              {tickets.map(t => (
                <Card key={t.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openTicket(t)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{t.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1" dir="ltr">{t.ticket_number}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {CATEGORY_LABELS[t.category] || t.category} · {new Date(t.created_at).toLocaleDateString("ar-YE")}
                        </p>
                      </div>
                      <Badge className={STATUS_COLORS[t.status] || "bg-neutral-100 text-neutral-600"} variant="secondary">
                        {STATUS_LABELS[t.status] || t.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selected && (
            <div className="space-y-4">
              <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-primary">
                <ArrowRight className="h-4 w-4" /> رجوع للقائمة
              </button>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold">{selected.subject}</h2>
                    <Badge className={STATUS_COLORS[selected.status] || "bg-neutral-100"} variant="secondary">
                      {STATUS_LABELS[selected.status] || selected.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground" dir="ltr">{selected.ticket_number}</p>
                  {selected.body && <p className="text-sm text-muted-foreground mt-2">{selected.body}</p>}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h3 className="font-medium text-sm">الردود</h3>
                {loadingReplies && <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>}
                {!loadingReplies && replies.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ردود بعد</p>}
                {replies.map(r => (
                  <div key={r.id} className={`rounded-lg p-3 ${r.is_staff ? "bg-primary/5 border border-primary/20" : "bg-neutral-50"}`}>
                    <p className="text-xs font-medium mb-1">{r.is_staff ? "فريق خدمة العملاء" : "أنت"}</p>
                    <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("ar-YE")}</p>
                  </div>
                ))}
              </div>

              {selected.status !== "closed" && (
                <div className="space-y-2">
                  <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="اكتب ردك..." />
                  <Button onClick={sendReply} disabled={sending || !replyText.trim()} className="w-full">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 ml-2" />إرسال</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
