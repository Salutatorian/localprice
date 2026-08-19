import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { withTimeout } from "@/lib/with-timeout";

const protectedPrefixes = [
  "/scan",
  "/receipts",
  "/contributions",
  "/saved",
  "/corrections",
  "/moderator",
  "/admin",
];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasAuthCode = request.nextUrl.searchParams.has("code");
  if (hasAuthCode && path !== "/auth/callback" && path !== "/auth/native") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const env = getPublicEnv();
  let supabaseResponse = NextResponse.next({ request });
  const needsAuth = protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  const production = process.env.NODE_ENV === "production";

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    if (needsAuth && production) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  let user: { id: string } | null = null;
  let authUnknown = false;
  try {
    const result = await withTimeout(supabase.auth.getUser());
    user = result.data.user;
  } catch {
    authUnknown = true;
  }

  if (needsAuth && !user && (!authUnknown || production)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
