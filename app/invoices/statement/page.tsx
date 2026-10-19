"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatementDocument } from "@/components/invoice/StatementDocument";
import { usePdfDownload } from "@/components/invoice/useDownload";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { ArrowRight, Download, Loader2, FileSpreadsheet } from "lucide-react";

export default function StatementPage() {
  const { currentUser, installmentContracts, payments, employees, isReal } = useApp();
  const pdf = usePdfDownload();
  const [scale] = useState(() => (typeof window === "undefined" ? 1 : Math.min(1, (Math.min(window.innerWidth, 900) - 40) / 794)));

  // Real mode: the database returns only this person's contracts (an admin sees everyone's). Demo mode filters here.
  const contracts = useMemo(() => {
    if (!currentUser) return [];
    if (isReal || currentUser.role === "admin") return installmentContracts;
    const emp = employees.find((e) => e.userId === currentUser.id);
    return installmentContracts.filter((c) => c.employeeId === currentUser.id || (emp && c.employeeId === emp.id));
  }, [installmentContracts, employees, currentUser, isReal]);

  async function go() {
    const ok = await pdf.download("statement-" + new Date().toISOString().slice(0, 10));
    ok ? toast.success("تم تنزيل كشف الحساب PDF") : toast.error("تعذر إنشاء ملف PDF");
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Link href="/invoices" className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowRight className="h-4 w-4" />الفواتير</Link>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileSpreadsheet className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold">كشف حساب التقسيط</h1>
              <p className="text-sm text-muted-foreground">كل عقودك وأقساطك والمدفوع والمتبقي، في ملف PDF واحد.</p>
            </div>
          </div>
          {currentUser && <Button onClick={go} disabled={pdf.busy || contracts.length === 0}>{pdf.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="ml-1 h-4 w-4" />تنزيل PDF</>}</Button>}
        </div>

        {!currentUser ? (
          <Card><CardContent className="space-y-3 p-8 text-center"><p>سجّل الدخول لعرض كشف حسابك.</p><Link href="/login?redirect=/invoices/statement"><Button>تسجيل الدخول</Button></Link></CardContent></Card>
        ) : (
          <>
            {contracts.length === 0 && <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد عقود تقسيط على حسابك بعد.</CardContent></Card>}
            {/* hidden, untransformed copy that is captured into the PDF */}
            <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden>
              <StatementDocument ref={pdf.ref} holder={currentUser.name} contracts={contracts} payments={payments} />
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top right", width: 794, height: contracts.length ? undefined : 0 }}>
                <StatementDocument holder={currentUser.name} contracts={contracts} payments={payments} />
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
