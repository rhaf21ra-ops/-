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
  const { setCurrentUser } = useApp();

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
  }, [user, loading, setCurrentUser]);

  return null;
}
