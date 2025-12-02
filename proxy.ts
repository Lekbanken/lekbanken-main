import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_REDIRECT = "/auth/login";

export async function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Debug log to verify proxy execution (remove in production)
  console.info("[proxy] guarding admin route", req.nextUrl.pathname);

  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If server can't see a session (client-only storage), allow through; client-side guard will handle redirect.
  if (!user) {
    console.info("[proxy] no server-visible user, letting client guard handle");
    return res;
  }

  const role = (user.app_metadata?.role ?? user.user_metadata?.role) as string | undefined;
  const isAdmin = role === "admin";

  if (!isAdmin) {
    console.warn("[proxy] non-admin user blocked from admin", user.id);
    const redirectUrl = new URL(ADMIN_REDIRECT, req.url);
    redirectUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  console.info("[proxy] admin access granted", user.id);
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
