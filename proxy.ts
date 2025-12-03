import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readTenantIdFromCookies, setTenantCookie, clearTenantCookie } from "@/lib/utils/tenantCookie";
import type { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PROTECTED_PREFIXES = ["/app", "/admin"];

export async function proxy(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // Use getUser() instead of getSession() for secure server-side auth verification
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // DEBUG: Log auth state
  if (req.nextUrl.pathname.startsWith("/admin")) {
    console.log("[proxy] /admin request:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userError: userError?.message,
    });
  }

  const { pathname, search } = req.nextUrl;
  const requiresAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = pathname.startsWith("/auth");

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  if (!user && requiresAuth) {
    const redirectUrl = new URL("/auth/login", req.url);
    redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  let tenantId = await readTenantIdFromCookies(req.cookies);

  if (user && !tenantId) {
    const { data: primaryMembership } = await supabase
      .from("user_tenant_memberships")
      .select("tenant_id, is_primary")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();

    tenantId = primaryMembership?.tenant_id ?? null;
    if (tenantId) {
      await setTenantCookie(res.cookies, tenantId);
    }
  }

  if (!tenantId) {
    clearTenantCookie(res.cookies);
  } else {
    requestHeaders.set("x-tenant-id", tenantId);
  }

  if (user && pathname.startsWith("/admin")) {
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const globalRole = profile?.role;
    const isGlobalAdmin = globalRole === "admin" || globalRole === "superadmin";

    let tenantAdmin = false;
    if (tenantId) {
      const { data: roleCheck, error: roleError } = await supabase.rpc("has_tenant_role", {
        tenant_uuid: tenantId,
        required_roles: ["owner", "admin"],
      });
      tenantAdmin = !!roleCheck;
      
      // DEBUG
      console.log("[proxy] tenant role check:", { tenantId, roleCheck, roleError: roleError?.message });
    }

    // DEBUG
    console.log("[proxy] admin check:", {
      userId: user.id,
      profile,
      profileError: profileError?.message,
      globalRole,
      isGlobalAdmin,
      tenantAdmin,
      tenantId,
    });

    if (!isGlobalAdmin && !tenantAdmin) {
      console.log("[proxy] ACCESS DENIED - redirecting to /app");
      const redirectUrl = new URL("/app", req.url);
      if (!tenantId) redirectUrl.searchParams.set("tenant", "required");
      return NextResponse.redirect(redirectUrl);
    }
    
    console.log("[proxy] ACCESS GRANTED");
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
