"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canAccess, needsLogin } from "@/lib/permissions";

/** Page-level access control. The database (RLS) is the real protection; this keeps people out of screens they cannot use. */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const protectedPath = needsLogin(pathname);
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (protectedPath && !loading && !user) {
      router.replace(`${isAdminArea ? "/admin-login" : "/login"}?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [protectedPath, loading, user, router, pathname, isAdminArea]);

  if (!protectedPath) return <>{children}</>;
  if (loading || !user) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!canAccess(pathname, user)) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">ليس لديك صلاحية لهذه الصفحة</h1>
        <p className="mt-2 text-sm text-muted-foreground">إن كنت تحتاج هذا الوصول، اطلب من المالك أن يمنحك الصلاحية.</p>
        <Link href="/" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">الصفحة الرئيسية</Link>
      </div>
    );
  }
  return <>{children}</>;
}
