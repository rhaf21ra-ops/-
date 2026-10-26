"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";

type Check = { name: string; ok: boolean | null; detail: string; fix?: string };

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const KEY_ = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** One-tap connection check. Shows what is wrong and how to fix it. Prints no secret (only the key's prefix). */
export default function StatusPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(true);

  async function run() {
    setRunning(true);
    const out: Check[] = [];
    const add = (c: Check) => { out.push(c); setChecks([...out]); };

    add({
      name: "متغيرات Netlify داخل هذا البناء",
      ok: isSupabaseConfigured,
      detail: isSupabaseConfigured ? "موجودة" : "غير موجودة: أضفها في Netlify ثم أعد النشر",
      fix: isSupabaseConfigured ? undefined : "أضف NEXT_PUBLIC_SUPABASE_URL ومفتاح Supabase العام في Netlify، ثم من Deploys اختر Trigger deploy > Clear cache and deploy site. تغيير المتغيرات لا يظهر إلا بعد إعادة بناء جديدة.",
    });
    if (!isSupabaseConfigured) { setRunning(false); return; }

    let host = "";
    try { host = new URL(URL_).host; } catch { /* handled below */ }
    const urlOk = /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(URL_);
    add({
      name: "صيغة عنوان المشروع (URL)",
      ok: urlOk,
      detail: host ? `${host}${URL_.replace(/\/$/, "").split(host)[1] || ""}` : "عنوان غير صالح",
      fix: urlOk ? undefined : "يجب أن يكون بالشكل https://xxxxxxxx.supabase.co فقط، بلا /rest/v1 ولا /dashboard. انسخه من Project Settings > API > Project URL.",
    });
    const keyKind = KEY_.startsWith("sb_publishable_") ? "publishable" : KEY_.startsWith("eyJ") ? "anon (JWT)" : KEY_.startsWith("sb_secret_") ? "SECRET" : "غير معروف";
    add({
      name: "نوع المفتاح",
      ok: keyKind === "publishable" || keyKind === "anon (JWT)",
      detail: keyKind === "SECRET" ? "هذا مفتاح سري! لا تضعه في متغير NEXT_PUBLIC" : keyKind,
      fix: keyKind === "SECRET" ? "احذف هذا المفتاح من Netlify فوراً وأنشئ غيره من Supabase، ثم ضع المفتاح العام sb_publishable_... فقط." : keyKind === "غير معروف" ? "استخدم المفتاح العام الذي يبدأ بـ sb_publishable_ أو anon public." : undefined,
    });

    // Auth server reachable + email confirmation setting
    try {
      const r = await fetch(`${URL_.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: KEY_ } });
      if (!r.ok) throw new Error(String(r.status));
      const s = await r.json();
      add({ name: "خادم الحسابات (Auth)", ok: true, detail: "يستجيب" });
      add({
        name: "التسجيل مفتوح",
        ok: !s.disable_signup,
        detail: s.disable_signup ? "التسجيل معطّل" : "مفتوح",
        fix: s.disable_signup ? "في Supabase: Authentication > Sign In / Providers، فعّل Allow new users to sign up." : undefined,
      });
      add({
        name: "تأكيد البريد (Confirm email)",
        ok: !!s.mailer_autoconfirm,
        detail: s.mailer_autoconfirm ? "معطّل (صحيح)" : "مفعّل",
        fix: s.mailer_autoconfirm ? undefined : "هذا يمنع الدخول بعد التسجيل. في Supabase: Authentication > Sign In / Providers > Email، أوقف Confirm email واحفظ.",
      });
    } catch (e) {
      add({ name: "خادم الحسابات (Auth)", ok: false, detail: "لا يستجيب: " + (e as Error).message, fix: "تحقق من عنوان المشروع والمفتاح. إن كان المشروع متوقفاً (Paused) فشغّله من لوحة Supabase." });
    }

    // Database objects, one per migration milestone
    const tables: [string, string, string][] = [
      ["roles", "الجداول الأساسية (0001)", "نفّذ ملف supabase/setup_all.sql كاملاً في SQL Editor على مشروع جديد."],
      ["branches", "الفروع (0005 و0012)", "نفّذ setup_all.sql كاملاً."],
      ["guarantee_types", "أنواع الضمانات (0005)", "نفّذ setup_all.sql كاملاً."],
      ["companies_public", "سير العمل (0013)", "قاعدتك أقدم من الإصدار الحالي. أنشئ مشروعاً جديداً ونفّذ setup_all.sql الحالي من المستودع، أو نفّذ ملف 0013_workflow.sql بعد 0012."],
    ];
    for (const [t, label, fix] of tables) {
      const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
      add({ name: label, ok: !error, detail: error ? error.message : `${count ?? 0} صف`, fix: error ? fix : undefined });
    }
    const { data: roles } = await supabase.from("roles").select("name");
    if (roles) add({ name: "الأدوار", ok: roles.length >= 11, detail: `${roles.length} دوراً`, fix: roles.length >= 11 ? undefined : "الأدوار ناقصة: أعد تنفيذ setup_all.sql على مشروع فارغ." });

    // Is a user signed in right now?
    const { data: s } = await supabase.auth.getSession();
    add({ name: "جلسة الدخول الحالية", ok: null, detail: s.session ? `مسجّل: ${s.session.user.email}` : "لا يوجد دخول" });
    setRunning(false);
  }

  useEffect(() => { run(); }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8" dir="rtl">
      <h1 className="mb-1 text-2xl font-bold">فحص الاتصال بقاعدة البيانات</h1>
      <p className="mb-5 text-sm text-muted-foreground">افتح هذه الصفحة بعد أي تغيير في Netlify أو Supabase. لا تعرض أي سر.</p>
      <div className="space-y-3">
        {checks.map((c, i) => (
          <div key={i} className={`rounded-xl border p-3 ${c.ok === false ? "border-red-300 bg-red-50" : c.ok ? "border-green-300 bg-green-50" : "bg-card"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{c.ok === false ? "❌" : c.ok ? "✅" : "ℹ️"} {c.name}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">{c.detail}</span>
            </div>
            {c.fix && <p className="mt-2 text-sm text-red-800">الحل: {c.fix}</p>}
          </div>
        ))}
        {running && <p className="text-sm text-muted-foreground">جارٍ الفحص...</p>}
      </div>
      <div className="mt-6 flex gap-3 text-sm">
        <button type="button" onClick={run} className="rounded-lg border px-4 py-2">إعادة الفحص</button>
        <Link href="/register" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">إنشاء حساب</Link>
        <Link href="/admin-login" className="rounded-lg border px-4 py-2">دخول الإدارة</Link>
      </div>
    </main>
  );
}
