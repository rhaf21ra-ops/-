"use client";

import { IdentityReview } from "@/components/IdentityReview";
import { DemoIdentityReview } from "@/components/DemoIdentityReview";
import { isSupabaseConfigured } from "@/lib/supabase-client";

// Access: RouteGuard (client) + middleware (real mode). The data itself is protected by RLS / review_identity() in real mode.
export default function IdentityReviewPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      {isSupabaseConfigured ? <IdentityReview /> : <DemoIdentityReview />}
    </main>
  );
}
