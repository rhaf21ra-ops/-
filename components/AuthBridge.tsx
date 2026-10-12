"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/store";
import type { VerificationStatus } from "@/lib/constants";

const IDENTITY_LABEL: Record<string, VerificationStatus | undefined> = {
  pending: "بانتظار المراجعة",
  verified: "تم التحقق",
  rejected: "تعذر التحقق",
  needs_changes: "طلب إعادة الرفع",
};

/** Keeps the older in-memory store's `currentUser` equal to the real signed-in Supabase user. Renders nothing. */
export function AuthBridge() {
  const { user, loading } = useAuth();
  const { setCurrentUser, ensureEntityForUser } = useApp();

  useEffect(() => {
    if (loading) return;
    if (!user) return setCurrentUser(null);
    setCurrentUser({
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      phone: user.phone,
      avatar: user.avatarUrl,
      createdAt: new Date().toISOString(),
      status: user.status as any,
      verificationStatus: IDENTITY_LABEL[user.identityStatus],
    });
    if (["customer", "employee", "merchant", "company"].includes(user.role)) {
      ensureEntityForUser({ id: user.id, name: user.businessName || user.fullName, email: user.email, phone: user.phone, role: user.role });
    }
  }, [user, loading, setCurrentUser, ensureEntityForUser]);

  return null;
}
