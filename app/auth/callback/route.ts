import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/scan";
  }
  return value;
}

function authClient(request: NextRequest, response: NextResponse) {
  const env = getPublicEnv();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;

  if (searchParams.get("native") === "1") {
    const hop = request.nextUrl.clone();
    hop.pathname = "/auth/native";
    hop.searchParams.delete("native");
    return NextResponse.redirect(hop);
  }

  const success = NextResponse.redirect(new URL(next, origin));
  const supabase = authClient(request, success);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return success;
    }
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return success;
    }
  }

  const failed = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}&error=auth`, origin));
  return failed;
}
