"use client";

import { forwardRef } from "react";
import type { InstallmentContract, Payment } from "@/lib/types";
import { asCurrency, CURRENCY_INFO, formatMoneyLatin } from "@/lib/currency";
import { BRAND } from "@/lib/brand";

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "—");

/** كشف حساب التقسيط: every contract of one person with schedule, payments and what is left. A4 width. */
export const StatementDocument = forwardRef<HTMLDivElement, { holder: string; contracts: InstallmentContract[]; payments: Payment[] }>(
  function StatementDocument({ holder, contracts, payments }, ref) {
    const totals = new Map<string, { total: number; paid: number; left: number }>();
    for (const c of contracts) {
      const k = asCurrency(c.currency);
      const t = totals.get(k) ?? { total: 0, paid: 0, left: 0 };
      t.total += c.totalAmount; t.paid += c.paidAmount; t.left += c.remainingAmount;
      totals.set(k, t);
    }
    return (
      <div ref={ref} dir="rtl" style={{ width: 794, background: "#fff", color: "#111", padding: 40, fontFamily: "inherit" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #0F6B4F", paddingBottom: 14 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0F6B4F" }}>{BRAND.name}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{BRAND.tagline}</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>كشف حساب التقسيط</div>
            <div style={{ fontSize: 12, color: "#555" }}>تاريخ الإصدار: {fmtDate(new Date().toISOString())}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 14 }}>صاحب الحساب: <b>{holder || "—"}</b></div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {[...totals.entries()].map(([cur, t]) => {
            const c = asCurrency(cur);
            return (
              <div key={cur} style={{ border: "1px solid #CBD5CE", borderRadius: 8, padding: 10, minWidth: 220, background: "#F8FAF9" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{CURRENCY_INFO[c].label}</div>
                <div style={{ fontSize: 12 }}>إجمالي العقود: <b dir="ltr">{formatMoneyLatin(t.total, c)}</b></div>
                <div style={{ fontSize: 12 }}>المسدد: <b dir="ltr" style={{ color: "#16A34A" }}>{formatMoneyLatin(t.paid, c)}</b></div>
                <div style={{ fontSize: 12 }}>المتبقي: <b dir="ltr" style={{ color: "#D98E04" }}>{formatMoneyLatin(t.left, c)}</b></div>
              </div>
            );
          })}
          {totals.size === 0 && <div style={{ fontSize: 13, color: "#6B7A72" }}>لا توجد عقود تقسيط.</div>}
        </div>

        {contracts.map((c) => {
          const cur = asCurrency(c.currency);
          const pays = payments.filter((p) => p.contractId === c.id);
          return (
            <div key={c.id} style={{ marginTop: 20, pageBreakInside: "avoid" }}>
              <div style={{ background: "#E6F4EE", padding: "8px 10px", borderRadius: 6, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span><b dir="ltr">{c.contractNumber}</b> · {c.productName}</span>
                <span>{c.status} · {c.durationMonths} شهراً · {CURRENCY_INFO[cur].label}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 6 }}>
                <thead>
                  <tr style={{ background: "#F1F4F2" }}>
                    {["القسط", "الاستحقاق", "المبلغ", "الحالة", "تاريخ السداد", "رقم الإيصال"].map((h) => (
                      <th key={h} style={{ border: "1px solid #CBD5CE", padding: "5px 6px", textAlign: "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.payments.map((r) => {
                    const pay = pays.find((p) => p.installmentNumber === r.number);
                    return (
                      <tr key={r.number}>
                        <td style={cell}>{r.number}</td>
                        <td style={cell} dir="ltr">{fmtDate(r.dueDate)}</td>
                        <td style={cell} dir="ltr">{formatMoneyLatin(r.amount, cur)}</td>
                        <td style={{ ...cell, color: r.status === "مدفوع" ? "#16A34A" : r.status === "متأخر" ? "#DC2626" : "#111" }}>{r.status}</td>
                        <td style={cell} dir="ltr">{fmtDate(r.paidAt ?? pay?.createdAt)}</td>
                        <td style={cell} dir="ltr">{pay?.paymentNumber ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 18 }}>
                <span>المسدد: <b dir="ltr">{formatMoneyLatin(c.paidAmount, cur)}</b></span>
                <span>المتبقي: <b dir="ltr">{formatMoneyLatin(c.remainingAmount, cur)}</b></span>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 24, paddingTop: 10, borderTop: "1px solid #E2E8E4", fontSize: 10, color: "#6B7A72" }}>
          كشف إلكتروني صادر من منصة {BRAND.name} بتاريخ الإصدار أعلاه، ويعكس الأقساط المسجّلة حتى لحظة الإصدار.
        </div>
      </div>
    );
  },
);

const cell: React.CSSProperties = { border: "1px solid #E2E8E4", padding: "5px 6px" };
