"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { adminNavItems } from "@/lib/admin-nav";
import { useAuth } from "@/lib/auth-context";
import { PERMISSIONS, ROLE_LABEL_AR, isStaffRole, type RoleDef } from "@/lib/permissions";
import {
  listAccounts, listRoles, grantRole, revokeRole, setExtraPermission, createRole,
  updateRolePermissions, deleteRole, createDemoAccount, setAccountStatus, type AccountRow, type Result,
} from "@/lib/accounts";

const permLabel = (c: string) => PERMISSIONS.find((p) => p.code === c)?.label ?? c;
const IDENT_AR: Record<string, string> = { none: "لم يرسل", pending: "قيد المراجعة", verified: "موثّق", rejected: "مرفوض", needs_changes: "مطلوب تعديل" };

export default function StaffAdminPage() {
  const { demoMode } = useAuth();
  const [tab, setTab] = useState<"accounts" | "roles">("accounts");
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [a, r] = await Promise.all([listAccounts(), listRoles()]);
    setRows(a.rows); setErr(a.error ?? ""); setRoles(r);
  }, []);
  useEffect(() => {
    reload();
    window.addEventListener("qistuha-demo-change", reload);
    return () => window.removeEventListener("qistuha-demo-change", reload);
  }, [reload]);

  const run = async (p: Promise<Result>, ok = "تم") => {
    const r = await p;
    if (r.ok) { toast.success(ok); reload(); } else toast.error(r.error);
    return r.ok;
  };

  const shown = rows.filter((r) => !q || (r.fullName + r.email + r.phone).toLowerCase().includes(q.toLowerCase()));
  const account = rows.find((r) => r.id === sel) ?? null;

  return (
    <DashboardLayout navItems={adminNavItems} title="الحسابات والصلاحيات" role="admin">
      <div className="mx-auto max-w-5xl space-y-4">
        {demoMode && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">وضع تجريبي: الحسابات محفوظة في هذا المتصفح فقط. لحسابات حقيقية اربط Supabase (انظر README).</p>}
        <div className="flex gap-2">
          {(["accounts", "roles"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
              {t === "accounts" ? `الحسابات (${rows.length})` : `الأدوار والصلاحيات (${roles.length})`}
            </button>
          ))}
        </div>

        {tab === "accounts" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو البريد أو الهاتف" className="w-full rounded-lg border bg-card p-2.5 text-sm" />
              {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
              {shown.length === 0 && !err && <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">لا توجد حسابات</p>}
              {shown.map((r) => (
                <button key={r.id} type="button" onClick={() => setSel(r.id)}
                  className={`w-full rounded-xl border bg-card p-3 text-start ${sel === r.id ? "ring-2 ring-primary" : ""}`}>
                  <span className="block font-medium">{r.fullName}</span>
                  <span className="block text-xs text-muted-foreground" dir="ltr">{r.email}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {r.roles.map((x) => <span key={x} className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{ROLE_LABEL_AR[x] ?? roles.find((d) => d.name === x)?.label ?? x}</span>)}
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">هوية: {IDENT_AR[r.identityStatus] ?? r.identityStatus}</span>
                    {r.status === "suspended" && <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">موقوف</span>}
                  </span>
                </button>
              ))}
              {demoMode && <NewDemoAccount roles={roles} onCreate={(p) => run(Promise.resolve(createDemoAccount(p)), "تم إنشاء الحساب")} />}
            </div>

            <div>
              {!account ? <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">اختر حساباً لإدارة أدواره وصلاحياته</p> : (
                <div className="space-y-4 rounded-xl border bg-card p-4">
                  <div>
                    <h3 className="font-bold">{account.fullName}</h3>
                    <p className="text-xs text-muted-foreground" dir="ltr">{account.email} {account.phone && `· ${account.phone}`}</p>
                  </div>
                  <section>
                    <h4 className="mb-2 text-sm font-bold">أدوار الموظفين</h4>
                    <div className="space-y-1">
                      {roles.map((d) => {
                        const has = account.roles.includes(d.name);
                        return (
                          <label key={d.name} className="flex items-start gap-2 text-sm">
                            <input type="checkbox" className="mt-1" checked={has}
                              onChange={() => run(has ? revokeRole(account.id, d.name) : grantRole(account.id, d.name), has ? "سُحب الدور" : "مُنح الدور")} />
                            <span>{d.label}<span className="block text-xs text-muted-foreground">{d.perms.map(permLabel).join("، ")}</span></span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                  {!account.roles.includes("admin") && (
                    <section>
                      <h4 className="mb-2 text-sm font-bold">صلاحيات إضافية لهذا الحساب</h4>
                      {PERMISSIONS.map((p) => {
                        const on = account.extraPerms.includes(p.code);
                        return (
                          <label key={p.code} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={on} onChange={() => run(setExtraPermission(account.id, p.code, !on), on ? "سُحبت الصلاحية" : "مُنحت الصلاحية")} />
                            {p.label}
                          </label>
                        );
                      })}
                    </section>
                  )}
                  {demoMode && !account.roles.includes("admin") && (
                    <button type="button" onClick={() => run(setAccountStatus(account.id, account.status === "suspended" ? "active" : "suspended"))}
                      className="rounded-lg border px-3 py-2 text-sm">{account.status === "suspended" ? "تفعيل الحساب" : "إيقاف الحساب"}</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "roles" && <RolesTab roles={roles} run={run} />}
      </div>
    </DashboardLayout>
  );
}

function NewDemoAccount({ roles, onCreate }: { roles: RoleDef[]; onCreate: (p: { email: string; password: string; fullName: string; phone: string; roles: string[] }) => Promise<boolean> }) {
  const [f, setF] = useState({ fullName: "", email: "", phone: "", password: "", role: "customer" });
  const opts: [string, string][] = [["customer", "عميل"], ["employee", "موظف (مشترٍ)"], ["merchant", "تاجر"], ["company", "شركة"], ["financial", "الجهة المالية"], ...roles.map((r) => [r.name, r.label] as [string, string])];
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <h4 className="text-sm font-bold">إنشاء حساب (تجريبي)</h4>
      <input className="w-full rounded border p-2 text-sm" placeholder="الاسم" value={f.fullName} onChange={set("fullName")} />
      <input className="w-full rounded border p-2 text-sm" placeholder="البريد" dir="ltr" value={f.email} onChange={set("email")} />
      <input className="w-full rounded border p-2 text-sm" placeholder="الهاتف" dir="ltr" value={f.phone} onChange={set("phone")} />
      <input className="w-full rounded border p-2 text-sm" placeholder="كلمة المرور (6 أحرف+)" dir="ltr" value={f.password} onChange={set("password")} />
      <select className="w-full rounded border p-2 text-sm" value={f.role} onChange={set("role")}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <button type="button" className="w-full rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
        onClick={async () => { if (await onCreate({ ...f, roles: [f.role] })) setF({ fullName: "", email: "", phone: "", password: "", role: "customer" }); }}>إنشاء</button>
    </div>
  );
}

function RolesTab({ roles, run }: { roles: RoleDef[]; run: (p: Promise<Result>, ok?: string) => Promise<boolean> }) {
  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const toggle = (list: string[], c: string) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.name} className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.label} <span className="text-xs text-muted-foreground" dir="ltr">{r.name}</span></span>
              {!r.builtin && <button type="button" className="text-xs text-red-600" onClick={() => confirm("حذف هذا الدور وسحبه من كل الحسابات؟") && run(deleteRole(r.name), "حُذف الدور")}>حذف</button>}
            </div>
            <div className="mt-2 space-y-1">
              {PERMISSIONS.map((p) => (
                <label key={p.code} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={r.perms.includes(p.code)} disabled={r.builtin}
                    onChange={() => run(updateRolePermissions(r.name, toggle(r.perms, p.code)), "تم تحديث الصلاحيات")} />
                  {p.label}
                </label>
              ))}
            </div>
            {r.builtin && <p className="mt-1 text-xs text-muted-foreground">دور مدمج لا يُعدَّل. أنشئ دوراً مخصصاً بصلاحيات مختلفة.</p>}
          </div>
        ))}
      </div>
      <div className="h-fit space-y-2 rounded-xl border bg-card p-3">
        <h4 className="font-bold">دور مخصص جديد</h4>
        <input className="w-full rounded border p-2 text-sm" placeholder="الاسم بالعربي (مثال: موظف مراجعة العقود)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="w-full rounded border p-2 text-sm" dir="ltr" placeholder="معرّف إنجليزي (مثال: contracts)" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
        {PERMISSIONS.map((p) => (
          <label key={p.code} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={perms.includes(p.code)} onChange={() => setPerms(toggle(perms, p.code))} />{p.label}</label>
        ))}
        <button type="button" className="w-full rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          onClick={async () => { if (await run(createRole(slug, label, perms), "أُنشئ الدور")) { setSlug(""); setLabel(""); setPerms([]); } }}>إنشاء الدور</button>
      </div>
    </div>
  );
}
