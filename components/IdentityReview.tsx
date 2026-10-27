"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MessageSquareWarning, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Submission = {
  id: string; user_id: string; document_type: "national_id" | "passport";
  created_at: string; capture_meta: { method?: string; captured_at?: Record<string, string> } | null;
};
type Person = { id: string; full_name: string | null; phone: string | null };
type Past = { status: string; decision_reason: string | null; created_at: string };
type Decision = "approved" | "rejected" | "needs_changes";

const LABELS: Record<string, string> = {
  front: "الوجه الأمامي", back: "الوجه الخلفي", selfie_with_id: "سيلفي مع البطاقة",
  passport_photo: "صفحة الجواز", selfie_with_passport: "سيلفي مع الجواز",
};
const STATUS_AR: Record<string, string> = {
  approved: "موافق", rejected: "مرفوض", needs_changes: "مطلوب تعديل", submitted: "قيد المراجعة",
};

/** Reviewer screen: list of pending identities -> view photos -> approve / reject / ask for changes. */
export function IdentityReview() {
  const supabase = createClient();
  const [list, setList] = useState<Submission[] | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [open, setOpen] = useState<Submission | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const { data, error: e } = await supabase.from("identity_submissions")
      .select("id, user_id, document_type, created_at, capture_meta")
      .eq("status", "submitted").order("created_at", { ascending: true });
    if (e) { console.error("load submissions failed", e); setError("تعذّر تحميل الطلبات"); return setList([]); }
    const rows = (data ?? []) as Submission[];
    setList(rows);
    if (rows.length) {
      const { data: profiles } = await supabase.from("user_profiles")
        .select("id, full_name, phone").in("id", rows.map((r) => r.user_id));
      setPeople(Object.fromEntries(((profiles ?? []) as Person[]).map((p) => [p.id, p])));
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  if (open) {
    return <Detail submission={open} person={people[open.user_id]}
      onClose={() => setOpen(null)}
      onDecided={() => { setList((l) => (l ?? []).filter((s) => s.id !== open.id)); setOpen(null); }} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">طلبات التحقق من الهوية {list ? `(${list.length})` : ""}</h2>
        <button type="button" onClick={() => { setList(null); load(); }} className="flex items-center gap-1 text-sm text-primary">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </div>
      {list === null && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-error">{error}</p>}
      {list?.length === 0 && !error && <p className="rounded-xl bg-white p-8 text-center text-neutral-500">لا توجد طلبات بانتظار المراجعة</p>}
      {list?.map((s) => (
        <button key={s.id} type="button" onClick={() => setOpen(s)}
          className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 text-start">
          <span>
            <span className="block font-medium">{people[s.user_id]?.full_name || "بدون اسم"}</span>
            <span className="block text-sm text-neutral-500" dir="ltr">{people[s.user_id]?.phone ?? ""}</span>
          </span>
          <span className="text-sm text-neutral-500">
            {s.document_type === "national_id" ? "بطاقة شخصية" : "جواز سفر"} · {new Date(s.created_at).toLocaleDateString("ar-YE")}
          </span>
        </button>
      ))}
    </div>
  );
}

function Detail({ submission, person, onClose, onDecided }: {
  submission: Submission; person?: Person; onClose: () => void; onDecided: () => void;
}) {
  const supabase = createClient();
  const [images, setImages] = useState<Record<string, string> | null>(null);   // blob: URLs, not expiring links
  const [past, setPast] = useState<Past[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<Decision | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;
    const created: string[] = [];
    (async () => {
      // استخدام API المحلي (service_role) بدل Edge Function - أسرع ويعمل مع env الحالي
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch('/api/identity-file-url', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ submissionId: submission.id }),
      });
      const data = res.ok ? await res.json().catch(() => null) : null;
      const error = res.ok ? null : new Error(`HTTP ${res.status}`);
      if (!alive) return;
      if (error || !data?.urls) { console.error("signed urls failed", error); return setLoadError("تعذّر عرض الصور أو لا تملك الصلاحية - تأكد من تسجيل الدخول كموظف مراجعة"); }
      const out: Record<string, string> = {};
      for (const [key, url] of Object.entries(data.urls as Record<string, string>)) {
        try {
          const blob = await (await fetch(url)).blob();
          const obj = URL.createObjectURL(blob);
          created.push(obj); out[key] = obj;
        } catch (e) { console.error("image fetch failed", key, e); }
      }
      if (alive) setImages(out);
    })();
    supabase.from("identity_submissions").select("status, decision_reason, created_at")
      .eq("user_id", submission.user_id).neq("id", submission.id).order("created_at", { ascending: false })
      .then(({ data }) => alive && setPast((data ?? []) as Past[]));
    return () => { alive = false; created.forEach((u) => URL.revokeObjectURL(u)); };
  }, [supabase, submission.id, submission.user_id]);

  async function decide(decision: Decision) {
    if (decision !== "approved" && reason.trim().length < 3) return toast.error("اكتب سبباً واضحاً (3 أحرف على الأقل)");
    setBusy(decision);
    const { error } = await supabase.rpc("review_identity", {
      sid: submission.id, decision, reason: decision === "approved" ? null : reason.trim(),
    });
    setBusy(null);
    if (error) {
      console.error("review failed", error);
      return toast.error(error.message.includes("own identity") ? "لا يمكنك مراجعة هويتك بنفسك"
        
        : error.message.includes("already") ? "تمت مراجعة هذا الطلب مسبقاً" : "تعذّر حفظ القرار");
    }
    toast.success(decision === "approved" ? "تم تفعيل الحساب" : decision === "rejected" ? "تم رفض الطلب وإبلاغ المستخدم" : "تم طلب التعديل من المستخدم");
    onDecided();
  }

  const sent = submission.capture_meta?.captured_at;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onClose} className="text-sm text-primary">← رجوع للقائمة</button>
      <div className="rounded-xl bg-white p-4">
        <p className="font-bold">{person?.full_name || "بدون اسم"}</p>
        <p className="text-sm text-neutral-500" dir="ltr">{person?.phone ?? ""}</p>
        <p className="mt-1 text-sm text-neutral-500">
          {submission.document_type === "national_id" ? "بطاقة شخصية" : "جواز سفر"} · طريقة الالتقاط المعلنة: {submission.capture_meta?.method ?? "غير معروفة"}
        </p>
      </div>

      {past.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm">
          <p className="mb-1 font-medium">محاولات سابقة</p>
          {past.map((p, i) => <p key={i}>{new Date(p.created_at).toLocaleDateString("ar-YE")} · {STATUS_AR[p.status] ?? p.status}{p.decision_reason ? ` · ${p.decision_reason}` : ""}</p>)}
        </div>
      )}

      {loadError && <p className="rounded-lg bg-red-50 p-3 text-error">{loadError}</p>}
      {!images && !loadError && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {images && Object.entries(images).map(([key, src]) => (
          <figure key={key} className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={LABELS[key] ?? key} className="w-full rounded-lg border border-neutral-200" />
            <figcaption className="text-sm text-neutral-500">
              {LABELS[key] ?? key}{sent?.[key] ? ` · ${new Date(sent[key]).toLocaleString("ar-YE")}` : ""}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-700">السبب (إلزامي عند الرفض أو طلب التعديل، ويصل للمستخدم)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2" placeholder="مثال: صورة البطاقة غير واضحة، أعد التصوير بإضاءة أفضل" />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sticky bottom-0 bg-white pt-2">
          <button type="button" disabled={!!busy} onClick={() => decide("approved")}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-bold text-white disabled:opacity-50 shadow-lg">
            {busy === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} موافقة وتفعيل
          </button>
          <button type="button" disabled={!!busy} onClick={() => decide("needs_changes")}
            className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-bold text-white disabled:opacity-50 shadow-lg">
            {busy === "needs_changes" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareWarning className="h-4 w-4" />} يحتاج تعديل
          </button>
          <button type="button" disabled={!!busy} onClick={() => decide("rejected")}
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50 shadow-lg">
            {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} رفض
          </button>
        </div>
        <p className="text-xs text-center text-muted-foreground">اضغط موافقة لتفعيل حساب المستخدم فوراً</p>
      </div>
    </div>
  );
}
