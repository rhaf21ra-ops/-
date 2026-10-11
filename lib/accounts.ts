// Owner-side account and permission management. One API, two backends (demo = this browser, real = Supabase RPCs).
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";
import { demoAccounts, demoRoles, permissionsOf } from "@/lib/demo-db";
import { BUILTIN_STAFF_ROLES, isStaffRole, type RoleDef } from "@/lib/permissions";

export type AccountRow = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  status: string;
  identityStatus: string;
  roles: string[];
  extraPerms: string[];
  permissions: string[];
};

export type Result = { ok: true } | { ok: false; error: string };
const fail = (e: unknown): Result => ({ ok: false, error: (e as { message?: string })?.message ?? "حدث خطأ غير متوقع" });
const SLUG = /^[a-z][a-z0-9_]{2,30}$/;

export async function listAccounts(): Promise<{ rows: AccountRow[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      rows: demoAccounts.all().map((a) => ({
        id: a.id, email: a.email, fullName: a.fullName, phone: a.phone, status: a.status,
        identityStatus: a.identityStatus, roles: a.roles, extraPerms: a.extraPerms, permissions: permissionsOf(a),
      })),
    };
  }
  const { data: profiles, error } = await supabase.from("user_profiles").select("id, full_name, phone, email, status, identity_status").order("created_at", { ascending: false }).limit(500);
  if (error) return { rows: [], error: "تعذّر تحميل الحسابات (هل أنت المالك؟)" };
  const { data: roleRows } = await supabase.from("user_roles").select("user_id, roles(name)");
  const { data: permRows } = await supabase.from("user_permissions").select("user_id, permissions(code)");
  const roles = new Map<string, string[]>();
  for (const r of (roleRows ?? []) as any[]) {
    const n = (Array.isArray(r.roles) ? r.roles[0] : r.roles)?.name;
    if (n) roles.set(r.user_id, [...(roles.get(r.user_id) ?? []), n]);
  }
  const extra = new Map<string, string[]>();
  for (const r of (permRows ?? []) as any[]) {
    const c = (Array.isArray(r.permissions) ? r.permissions[0] : r.permissions)?.code;
    if (c) extra.set(r.user_id, [...(extra.get(r.user_id) ?? []), c]);
  }
  return {
    rows: (profiles ?? []).map((p: any) => ({
      id: p.id, email: p.email ?? "", fullName: p.full_name, phone: p.phone ?? "", status: p.status, identityStatus: p.identity_status,
      roles: roles.get(p.id) ?? [], extraPerms: extra.get(p.id) ?? [], permissions: [],
    })),
  };
}

export async function listRoles(): Promise<RoleDef[]> {
  if (!isSupabaseConfigured) return demoRoles.all();
  const { data } = await supabase.from("roles").select("name, display_name, role_permissions(permissions(code))");
  const out: RoleDef[] = [];
  for (const r of (data ?? []) as any[]) {
    if (!isStaffRole(r.name)) continue;
    const perms = (r.role_permissions ?? []).map((rp: any) => (Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions)?.code).filter(Boolean);
    const builtin = BUILTIN_STAFF_ROLES.find((b) => b.name === r.name);
    out.push({ name: r.name, label: r.display_name ?? builtin?.label ?? r.name, perms: perms.length ? perms : builtin?.perms ?? [], builtin: !!builtin });
  }
  return out;
}

export async function grantRole(accountId: string, role: string): Promise<Result> {
  if (!isSupabaseConfigured) {
    const a = demoAccounts.byId(accountId);
    if (!a) return { ok: false, error: "الحساب غير موجود" };
    if (role === "admin" && demoAccounts.hasOwner()) return { ok: false, error: "يوجد مالك واحد فقط" };
    if (!a.roles.includes(role)) demoAccounts.update(accountId, { roles: [...a.roles, role], status: a.status === "pending" && isStaffRole(role) ? "active" : a.status });
    return { ok: true };
  }
  const { error } = await supabase.rpc("grant_staff_role", { target: accountId, role_name: role });
  return error ? fail(error) : { ok: true };
}

export async function revokeRole(accountId: string, role: string): Promise<Result> {
  if (!isSupabaseConfigured) {
    const a = demoAccounts.byId(accountId);
    if (!a) return { ok: false, error: "الحساب غير موجود" };
    if (role === "admin") return { ok: false, error: "لا يمكن سحب دور المالك" };
    demoAccounts.update(accountId, { roles: a.roles.filter((r) => r !== role) });
    return { ok: true };
  }
  const { error } = await supabase.rpc("revoke_staff_role", { target: accountId, role_name: role });
  return error ? fail(error) : { ok: true };
}

export async function setExtraPermission(accountId: string, code: string, on: boolean): Promise<Result> {
  if (!isSupabaseConfigured) {
    const a = demoAccounts.byId(accountId);
    if (!a) return { ok: false, error: "الحساب غير موجود" };
    const set = new Set(a.extraPerms);
    on ? set.add(code) : set.delete(code);
    demoAccounts.update(accountId, { extraPerms: Array.from(set) });
    return { ok: true };
  }
  const { error } = await supabase.rpc(on ? "grant_user_permission" : "revoke_user_permission", { target: accountId, perm_code: code });
  return error ? fail(error) : { ok: true };
}

export async function createRole(slug: string, label: string, perms: string[]): Promise<Result> {
  if (!SLUG.test(slug)) return { ok: false, error: "المعرّف: حروف إنجليزية صغيرة وأرقام و_ (3 إلى 31 حرفاً) ويبدأ بحرف" };
  if (!label.trim()) return { ok: false, error: "اكتب اسم الدور" };
  if (perms.length === 0) return { ok: false, error: "اختر صلاحية واحدة على الأقل" };
  const name = slug.startsWith("staff_") ? slug : "staff_" + slug;
  if (!isSupabaseConfigured) {
    if (demoRoles.all().some((r) => r.name === name)) return { ok: false, error: "هذا الدور موجود" };
    demoRoles.save([...demoRoles.custom(), { name, label: label.trim(), perms, builtin: false }]);
    return { ok: true };
  }
  const { error } = await supabase.rpc("create_custom_role", { slug: name, label: label.trim(), perm_codes: perms });
  return error ? fail(error) : { ok: true };
}

export async function updateRolePermissions(name: string, perms: string[]): Promise<Result> {
  if (perms.length === 0) return { ok: false, error: "اختر صلاحية واحدة على الأقل" };
  if (!isSupabaseConfigured) {
    demoRoles.save(demoRoles.custom().map((r) => (r.name === name ? { ...r, perms } : r)));
    return { ok: true };
  }
  const { error } = await supabase.rpc("set_role_permissions", { role_slug: name, perm_codes: perms });
  return error ? fail(error) : { ok: true };
}

export async function deleteRole(name: string): Promise<Result> {
  if (!isSupabaseConfigured) {
    demoRoles.save(demoRoles.custom().filter((r) => r.name !== name));
    for (const a of demoAccounts.all()) if (a.roles.includes(name)) demoAccounts.update(a.id, { roles: a.roles.filter((r) => r !== name) });
    return { ok: true };
  }
  const { error } = await supabase.rpc("delete_custom_role", { role_slug: name });
  return error ? fail(error) : { ok: true };
}

/** Demo only: the owner creates an account directly (staff, financial entity, or any type). Real accounts must register themselves. */
export function createDemoAccount(p: { email: string; password: string; fullName: string; phone: string; roles: string[] }): Result {
  if (isSupabaseConfigured) return { ok: false, error: "في الوضع الحقيقي يسجّل الموظف حسابه بنفسه ثم تمنحه الدور" };
  if (!p.email.includes("@") || p.password.length < 6 || !p.fullName.trim()) return { ok: false, error: "أكمل البريد والاسم وكلمة مرور 6 أحرف أو أكثر" };
  if (demoAccounts.byEmail(p.email)) return { ok: false, error: "هذا البريد مسجّل مسبقاً" };
  demoAccounts.add({ email: p.email.trim(), password: p.password, fullName: p.fullName.trim(), phone: p.phone.trim(), roles: p.roles, status: "active", identityStatus: "verified" });
  return { ok: true };
}

export async function setAccountStatus(accountId: string, status: "active" | "suspended"): Promise<Result> {
  if (!isSupabaseConfigured) {
    demoAccounts.update(accountId, { status });
    return { ok: true };
  }
  return { ok: false, error: "تغيير حالة الحساب في الوضع الحقيقي يتم من Supabase (Table Editor > user_profiles)" };
}
