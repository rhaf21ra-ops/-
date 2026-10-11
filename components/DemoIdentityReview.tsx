"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, MessageSquareWarning, X } from "lucide-react";
import { toast } from "sonner";
import { demoIdentity, type DemoIdentity } from "@/lib/demo-db";
import { useAuth } from "@/lib/auth-context";

const LABELS: Record<string, string> = {
  front: "الوجه الأمامي", back: "الوجه الخلفي", selfie_with_id: "سيلفي مع البطاقة",
  passport_photo: "صفحة الجواز", selfie_with_passport: "سيلفي مع الجواز",
};

/** Demo-mode reviewer screen (same flow as IdentityReview, data kept in this browser). */
export function DemoIdentityReview() {
  const { user } = useAuth();
  const [list, setList] = useState<DemoIdentity[]>([]);
  const [open, setOpen] = useState<DemoIdentity | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => setList(demoIdentity.all().filter((x) => x.status === "submitted")), []);
  useEffect(() => {
    load();
    window.addEventListener("qistuha-demo-change", load);
    return () => window.removeEventListener("qistuha-demo-change", load);
  }, [load]);

  function decide(d: "approved" | "rejected" | "needs_changes") {
    if (!open) return;
    if (d !== "approved" && reason.trim().length < 3) return toast.error("اكتب السبب");
    demoIdentity.decide(open.id, d, reason.trim(), user?.fullName ?? "");
    toast.success("تم حفظ القرار");
    setOpen(null); setReason(""); load();
  }

  if (open) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setOpen(null)} className="text-sm text-primary">← رجوع</button>
        <h2 className="text-lg font-bold">{open.userName} <span className="text-sm font-normal text-neutral-500" dir="ltr">{open.userEmail}</span></h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Object.entries(open.images).map(([k, src]) => (
            <figure key={k} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={LABELS[k] ?? k} className="aspect-[4/3] w-full rounded-lg object-cover" />
              <figcaption className="text-xs text-neutral-500">{LABELS[k] ?? k}</figcaption>
            </figure>
          ))}
        </div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="السبب (مطلوب عند الرفض أو طلب التعديل)" className="w-full rounded-lg border p-3 text-sm" rows={3} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => decide("approved")} className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-white"><Check className="h-4 w-4" /> موافقة</button>
          <button type="button" onClick={() => decide("needs_changes")} className="flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-white"><MessageSquareWarning className="h-4 w-4" /> طلب تعديل</button>
          <button type="button" onClick={() => decide("rejected")} className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-white"><X className="h-4 w-4" /> رفض</button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">طلبات التحقق من الهوية ({list.length}) <span className="text-xs font-normal text-neutral-500">وضع تجريبي</span></h2>
      {list.length === 0 && <p className="rounded-xl bg-white p-8 text-center text-neutral-500">لا توجد طلبات بانتظار المراجعة</p>}
      {list.map((s) => (
        <button key={s.id} type="button" onClick={() => setOpen(s)} className="flex w-full items-center justify-between rounded-xl border bg-white p-4 text-start">
          <span><span className="block font-medium">{s.userName}</span><span className="block text-sm text-neutral-500" dir="ltr">{s.userEmail}</span></span>
          <span className="text-sm text-neutral-500">{s.doc === "national_id" ? "بطاقة شخصية" : "جواز سفر"} · {new Date(s.submittedAt).toLocaleDateString("ar-YE")}</span>
        </button>
      ))}
    </div>
  );
}
