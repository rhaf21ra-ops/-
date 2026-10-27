"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The old prototype screen was replaced by /staff/identity (works in demo and real mode).
export default function LegacyIdentityRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/staff/identity"); }, [router]);
  return null;
}
