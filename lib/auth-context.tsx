"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "customer" | "employee" | "merchant" | "company" | "admin" | "financial" | "staff";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: string;
  identityStatus: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string, role: UserRole) => Promise<{ error: string | null; userId: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getDashboardPath(role: UserRole): string {
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

export { getDashboardPath };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (sbUser: SupabaseUser): Promise<AuthUser | null> => {
    // The profile and the role are created by a database trigger at sign-up; the browser never writes them.
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", sbUser.id)
      .maybeSingle();

    if (!profile) return null;

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", sbUser.id);

    const names = (roleData ?? [])
      .flatMap((r: any) => (Array.isArray(r.roles) ? r.roles : [r.roles]).map((x: any) => x?.name as string | undefined))
      .filter(Boolean) as string[];
    const order: UserRole[] = ["admin", "financial", "company", "merchant", "employee", "customer"];
    const role: UserRole = names.includes("admin") ? "admin"
      : names.some((n) => n.startsWith("staff_")) ? "staff"
      : order.find((r) => names.includes(r)) ?? "customer";

    return {
      id: sbUser.id,
      email: sbUser.email || profile.email || "",
      fullName: profile.full_name,
      phone: profile.phone || "",
      role,
      status: profile.status,
      identityStatus: profile.identity_status ?? "none",
      avatarUrl: profile.avatar_url,
    };
  }, []);

  useEffect(() => {
    let mounted = true;

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
        } else {
          if (mounted) setUser(null);
        }
        if (mounted) setLoading(false);
      })();
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadUserProfile]);

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      const profile = await loadUserProfile(session.user);
      setUser(profile);
    }
  }, [session, loadUserProfile]);

  // No WhatsApp code. Identity verification is the next step on the register page; the account stays
  // "pending" until a staff reviewer approves it. The database trigger creates the profile and role from
  // the metadata below (and only accepts customer / employee / merchant / company).
  const signUp = useCallback(async (
    email: string, password: string, fullName: string, phone: string, role: UserRole
  ): Promise<{ error: string | null; userId: string | null }> => {
    if (!isSupabaseConfigured) return { error: "الموقع غير مربوط بقاعدة البيانات بعد (مفاتيح Supabase)", userId: null };
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName, phone, role } },
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
    if (!isSupabaseConfigured) return { error: "الموقع غير مربوط بقاعدة البيانات بعد (مفاتيح Supabase)" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
