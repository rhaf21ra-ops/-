import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Route prefix -> role required. RLS remains the real enforcement; this only gates navigation.
const PROTECTED: Record<string, string> = {
  "/customer": "customer",
  "/employee": "employee",
  "/merchant": "merchant",
  "/company": "company",
  "/admin": "admin",
  "/financial": "financial",
  "/staff": "staff", // any staff_* role; sections inside are shown per permission
};

export async function middleware(request: NextRequest) {
  // Not configured yet (no Supabase variables on the host): let every page open instead of failing with a 500.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options as any));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const prefix = Object.keys(PROTECTED).find((p) => path === p || path.startsWith(p + "/"));
  if (!prefix) return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  const { data } = await supabase.from("user_roles").select("roles(name)").eq("user_id", user.id);
  const roles = (data ?? []).flatMap((r: any) => (Array.isArray(r.roles) ? r.roles : [r.roles]).map((x: any) => x?.name));
  // /staff is open to any staff_* role; the owner (/admin) is the only one who may also enter it.
  // /staff and /admin are open to the owner and to any staff role; exact page access is decided per permission by RouteGuard, and data by RLS.
  const staffOrOwner = roles.some((r: string) => r?.startsWith("staff_") || r === "admin");
  const allowed = prefix === "/staff" || prefix === "/admin" ? staffOrOwner : roles.includes(PROTECTED[prefix]);
  if (!allowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
