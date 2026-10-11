import { IdentityReview } from "@/components/IdentityReview";

// Route access is gated by middleware (/staff = any staff_* role or the owner).
// The data itself is gated by RLS and by review_identity(), which require the `identity.review` permission.
export default function IdentityReviewPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <IdentityReview />
    </main>
  );
}
