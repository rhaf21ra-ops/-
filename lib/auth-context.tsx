"use client";

// Accounts. Two modes, chosen automatically:
//  - REAL: Supabase Auth + database (when NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are set).
//  - DEMO: accounts kept in this browser only (lib/demo-db.ts), so the whole platform can be tried without a database.
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { demoAccounts, demoSession, permissionsOf, type DemoAccount } from "@/lib/demo-db";
import { BUILTIN_STAFF_ROLES, PERMISSIONS, isStaffRole } from "@/lib/permissions";

export type UserRole = "customer" | "employee" | "merchant" | "company" | "admin" | "financial" | "staff";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  /** Main role used to pick the dashboard. */
  role: UserRole;
  /** Every role name the account holds (including staff_* and custom roles). */
  roles: string[];
  /** Every permission code the account holds. */
  permissions: string[];
  status: string;
  identityStatus: string;
  identityNote?: string;
  businessName?: string;
  avatarUrl?: string;
  demo: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  demoMode: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: UserRole, extra?: { businessName?: string; city?: string }) => Promise<{ error: string | null; userId: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function getDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    customer: "/customer",
    employee: "/employee",
    merchant: "/merchant",
    company: "/company",
    admin: "/admin",
    financial: "/financial",
    staff: "/staff/identity",
  };
  return paths[role] || "/";
}

function mainRole(names: string[]): UserRole {
  if (names.includes("admin")) return "admin";
  if (names.some(isStaffRole)) return "staff";
  for (const r of ["financial", "company", "merchant", "employee", "customer"] as const) if (names.includes(r)) return r;
  return "customer";
}

function fromDemo(a: DemoAccount): AuthUser {
  return {
    id: a.id, email: a.email, fullName: a.fullName, phone: a.phone,
    role: mainRole(a.roles), roles: a.roles, permissions: permissionsOf(a),
    status: a.status, identityStatus: a.identityStatus, identityNote: a.identityNote, businessName: a.businessName, demo: true,
  };
}

const REGISTERABLE: UserRole[] = ["customer", "employee", "merchant", "company"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDemo = useCallback(() => {
    const id = demoSession.get();
    const acc = id ? demoAccounts.byId(id) : undefined;
    setUser(acc ? fromDemo(acc) : null);
    setLoading(false);
  }, []);

  const loadUserProfile = useCallback(async (sbUser: SupabaseUser): Promise<AuthUser | null> => {
    // The profile and the role are created by a database trigger at sign-up; the browser never writes them.
    const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", sbUser.id).maybeSingle();
    if (!profile) return null;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("roles(name, role_permissions(permissions(code)))")
      .eq("user_id", sbUser.id);

    const names: string[] = [];
    const perms = new Set<string>();
    for (const row of (roleData ?? []) as any[]) {
      const roles = Array.isArray(row.roles) ? row.roles : [row.roles];
      for (const r of roles) {
        if (!r?.name) continue;
        names.push(r.name);
        for (const rp of r.role_permissions ?? []) {
          const p = Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions;
          if (p?.code) perms.add(p.code);
        }
        // If the database hides the permission rows from this user, fall back to the built-in role definitions.
        BUILTIN_STAFF_ROLES.filter((b) => b.name === r.name).forEach((b) => b.perms.forEach((c) => perms.add(c)));
      }
    }
    const { data: extra } = await supabase.from("user_permissions").select("permissions(code)").eq("user_id", sbUser.id);
    for (const row of (extra ?? []) as any[]) {
      const p = Array.isArray(row.permissions) ? row.permissions[0] : row.permissions;
      if (p?.code) perms.add(p.code);
    }
    if (names.includes("admin")) PERMISSIONS.forEach((p) => perms.add(p.code));

    return {
      id: sbUser.id,
      email: sbUser.email || profile.email || "",
      fullName: profile.full_name,
      phone: profile.phone || "",
      role: mainRole(names),
      roles: names,
      permissions: Array.from(perms),
      status: profile.status,
      identityStatus: profile.identity_status ?? "none",
      avatarUrl: profile.avatar_url,
      demo: false,
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      loadDemo();
      const on = () => loadDemo();
      window.addEventListener("qistuha-demo-change", on);
      window.addEventListener("storage", on);
      window.addEventListener("focus", on);
      return () => {
        window.removeEventListener("qistuha-demo-change", on);
        window.removeEventListener("storage", on);
        window.removeEventListener("focus", on);
      };
    }

    supabase.auth.getSession().then(async ({ data: { session: sbSession } }) => {
      if (!mounted) return;
      setSession(sbSession);
      if (sbSession?.user) {
        const profile = await loadUserProfile(sbSession.user);
        if (mounted) setUser(profile);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      (async () => {
        setSession(sbSession);
        if (sbSession?.user) {
          const profile = await loadUserProfile(sbSession.user);
          if (mounted) setUser(profile);
        } else if (mounted) {
          setUser(null);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadUserProfile, loadDemo]);

  const refreshUser = useCallback(async () => {
    if (!isSupabaseConfigured) return loadDemo();
    if (session?.user) setUser(await loadUserProfile(session.user));
  }, [session, loadUserProfile, loadDemo]);

  const signUp = useCallback(async (
    email: string, password: string, fullName: string, phone: string, role: UserRole, extra?: { businessName?: string; city?: string },
  ): Promise<{ error: string | null; userId: string | null }> => {
    if (!REGISTERABLE.includes(role)) return { error: "نوع الحساب غير مسموح", userId: null };
    if (password.length < 6) return { error: "كلمة المرور 6 أحرف على الأقل", userId: null };

    if (!isSupabaseConfigured) {
      if (demoAccounts.byEmail(email)) return { error: "هذا البريد مسجّل مسبقاً", userId: null };
      if (demoAccounts.all().some((a) => a.phone && a.phone === phone.trim())) return { error: "رقم الهاتف مستخدم من حساب آخر", userId: null };
      const acc = demoAccounts.add({ email: email.trim(), password, fullName, phone: phone.trim(), roles: [role], status: "pending", identityStatus: "none", businessName: extra?.businessName });
      demoSession.set(acc.id);
      return { error: null, userId: acc.id };
    }

    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName, phone, role, business_name: extra?.businessName ?? null, city: extra?.city ?? null } },
    });
    if (error) {
      const m = error.message.toLowerCase();
      return { error: m.includes("already") ? "هذا البريد مسجّل مسبقاً" : m.includes("database error") ? "رقم الهاتف أو البريد مستخدم من حساب آخر" : error.message, userId: null };
    }
    if (!data.user) return { error: "فشل إنشاء الحساب", userId: null };
    if (!data.session) {
      return { error: "أُنشئ الحساب لكن تأكيد البريد مفعّل في إعدادات Supabase. عطّله (Authentication > Providers > Email > Confirm email) ثم سجّل الدخول", userId: data.user.id };
    }
    return { error: null, userId: data.user.id };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      const acc = demoAccounts.byEmail(email);
      if (!acc || acc.password !== password) return { error: "البريد أو كلمة المرور غير صحيحة" };
      if (acc.status === "suspended") return { error: "هذا الحساب موقوف" };
      demoSession.set(acc.id);
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message === "Invalid login credentials" ? "البريد أو كلمة المرور غير صحيحة" : error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) demoSession.set(null);
    else await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, demoMode: !isSupabaseConfigured, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
