"use client";

import { forwardRef, useEffect, useState } from "react";
import type { Invoice } from "@/lib/types";
import { CURRENCY_INFO, convertRounded, formatMoneyLatin, type Rates } from "@/lib/currency";
import { BRAND } from "@/lib/brand";

export type ScheduleRow = { number: number; dueDate: string; amount: number; status: string };

const KIND_TITLE: Record<Invoice["kind"], string> = { sale: "فاتورة بيع نقدي", installment_sale: "فاتورة بيع بالتقسيط" };
const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "");

/** Public address a QR code points to. */
export const verifyUrl = (code: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${code}`;

export function useQrDataUrl(text: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!text) { setUrl(null); return; }
    import("qrcode")
      .then((m) => (m.default ?? m).toDataURL(text, { margin: 1, width: 240, errorCorrectionLevel: "M" }))
      .then((u: string) => { if (alive) setUrl(u); })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; };
  }, [text]);
  return url;
}

/** The printable invoice (A4 width). The same element is shown on screen, printed, and captured to PDF. */
export const InvoiceDocument = forwardRef<HTMLDivElement, { invoice: Invoice; schedule?: ScheduleRow[]; rates?: Rates }>(
  function InvoiceDocument({ invoice: v, schedule, rates }, ref) {
    const qr = useQrDataUrl(v.verifyCode ? verifyUrl(v.verifyCode) : null);
    const cur = v.currency;
    const money = (n: number) => formatMoneyLatin(n, cur);
    const installment = v.kind === "installment_sale";
    const otherCurrencies = (["YER", "SAR", "USD"] as const).filter((c) => c !== cur);

    return (
      <div ref={ref} dir="rtl" style={{ width: 794, background: "#fff", color: "#111", padding: 40, fontFamily: "inherit" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #0F6B4F", paddingBottom: 16 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#0F6B4F" }}>{BRAND.name}</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{BRAND.tagline}</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{KIND_TITLE[v.kind]}</div>
            <div dir="ltr" style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{v.invoiceNumber}</div>
            <div style={{ fontSize: 12, color: "#555" }}>التاريخ: {fmtDate(v.issuedAt)}</div>
            <div style={{ fontSize: 12, color: v.status === "void" ? "#DC2626" : "#16A34A", fontWeight: 700 }}>
              {v.status === "void" ? "فاتورة ملغاة" : "فاتورة سارية"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
          <div style={{ border: "1px solid #E2E8E4", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6B7A72", marginBottom: 4 }}>العميل</div>
            <div style={{ fontWeight: 700 }}>{v.buyerName || "—"}</div>
            <div dir="ltr" style={{ fontSize: 12, textAlign: "right" }}>{v.buyerPhone}</div>
            <div style={{ fontSize: 12, color: "#444" }}>{v.buyerAddress}</div>
          </div>
          <div style={{ border: "1px solid #E2E8E4", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6B7A72", marginBottom: 4 }}>البائع (التاجر)</div>
            <div style={{ fontWeight: 700 }}>{v.merchantName || "—"}</div>
            <div style={{ fontSize: 12, color: "#444" }}>رقم الطلب: <span dir="ltr">{v.orderNumber}</span></div>
            <div style={{ fontSize: 12, color: "#444" }}>العملة: {CURRENCY_INFO[cur].label}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#E6F4EE" }}>
              {["#", "المنتج", "الكمية", "سعر الوحدة", "الإجمالي"].map((h) => (
                <th key={h} style={{ border: "1px solid #CBD5CE", padding: "8px 6px", textAlign: "right" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.items.map((i, idx) => (
              <tr key={idx}>
                <td style={{ border: "1px solid #E2E8E4", padding: "8px 6px" }}>{idx + 1}</td>
                <td style={{ border: "1px solid #E2E8E4", padding: "8px 6px" }}>
                  {i.name}
                  {i.origCurrency && i.origCurrency !== cur && i.origUnitPrice != null && (
                    <div style={{ fontSize: 10, color: "#6B7A72" }}>
                      السعر الأصلي {formatMoneyLatin(i.origUnitPrice, i.origCurrency)}، حُوّل إلى {CURRENCY_INFO[cur].label}
                    </div>
                  )}
                </td>
                <td style={{ border: "1px solid #E2E8E4", padding: "8px 6px" }}>{i.qty}</td>
                <td style={{ border: "1px solid #E2E8E4", padding: "8px 6px" }} dir="ltr">{money(i.unitPrice)}</td>
                <td style={{ border: "1px solid #E2E8E4", padding: "8px 6px", fontWeight: 700 }} dir="ltr">{money(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginTop: 16, alignItems: "flex-start" }}>
          <div style={{ textAlign: "center" }}>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR" width={110} height={110} />
            ) : (
              <div style={{ width: 110, height: 110, background: "#F1F4F2" }} />
            )}
            <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>امسح للتحقق من صحة الفاتورة</div>
            <div dir="ltr" style={{ fontSize: 10, color: "#555" }}>{v.verifyCode}</div>
          </div>

          <div style={{ minWidth: 300, fontSize: 13 }}>
            <Row label="المجموع" value={money(v.subtotal)} />
            {v.discount > 0 && <Row label="الخصم" value={`- ${money(v.discount)}`} />}
            {v.shipping > 0 && <Row label="التوصيل" value={money(v.shipping)} />}
            <Row label={installment ? "السعر النقدي" : "الإجمالي المستحق"} value={money(v.total)} bold={!installment} />
            {installment && v.deferredTotal != null && (
              <>
                <Row label={`نسبة الزيادة (${v.markupPercent ?? ""}%)`} value={money(v.deferredTotal - v.total)} />
                <Row label="إجمالي التقسيط" value={money(v.deferredTotal)} bold />
                <Row label={`القسط الشهري (${v.months} شهراً)`} value={money(v.monthly ?? 0)} />
              </>
            )}
            {rates && (
              <div style={{ marginTop: 8, fontSize: 11, color: "#6B7A72", textAlign: "left" }} dir="ltr">
                ≈ {otherCurrencies.map((c) => formatMoneyLatin(convertRounded(installment && v.deferredTotal != null ? v.deferredTotal : v.total, cur, c, rates), c)).join("  |  ")}
              </div>
            )}
          </div>
        </div>

        {installment && schedule && schedule.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>جدول الأقساط (للعقد كاملاً)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F1F4F2" }}>
                  {["القسط", "تاريخ الاستحقاق", "المبلغ", "الحالة"].map((h) => (
                    <th key={h} style={{ border: "1px solid #CBD5CE", padding: "5px 6px", textAlign: "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((r) => (
                  <tr key={r.number}>
                    <td style={{ border: "1px solid #E2E8E4", padding: "5px 6px" }}>{r.number}</td>
                    <td style={{ border: "1px solid #E2E8E4", padding: "5px 6px" }} dir="ltr">{fmtDate(r.dueDate)}</td>
                    <td style={{ border: "1px solid #E2E8E4", padding: "5px 6px" }} dir="ltr">{money(r.amount)}</td>
                    <td style={{ border: "1px solid #E2E8E4", padding: "5px 6px" }}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 10, borderTop: "1px solid #E2E8E4", fontSize: 10, color: "#6B7A72", lineHeight: 1.7 }}>
          هذه الفاتورة صادرة إلكترونياً من منصة {BRAND.name}. أي تعديل عليها يُبطلها. للتحقق من صحتها امسح رمز QR أو افتح الرابط:{" "}
          <span dir="ltr">{typeof window !== "undefined" ? `${window.location.origin}/verify` : "/verify"}</span>
        </div>
      </div>
    );
  },
);

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px dashed #E2E8E4", fontWeight: bold ? 800 : 400, fontSize: bold ? 15 : 13 }}>
      <span>{label}</span>
      <span dir="ltr">{value}</span>
    </div>
  );
}
