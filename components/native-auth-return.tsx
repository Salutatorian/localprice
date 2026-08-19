"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isNativeAuthUrl } from "@/lib/native-auth";

async function finishNativeSignIn(url: string, go: (path: string) => void) {
  if (!isNativeAuthUrl(url)) {
    return;
  }
  try {
    await Browser.close();
  } catch {
    // Browser may already be closed.
  }
  const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const code = params.get("code");
  const next = params.get("next") ?? "/scan";
  if (!code) {
    return;
  }
  const supabase = createBrowserSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    go(`/login?next=${encodeURIComponent(next)}&error=auth`);
    return;
  }
  go(next.startsWith("/") && !next.startsWith("//") ? next : "/scan");
}

export function NativeAuthReturn() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const go = (path: string) => {
      router.replace(path);
      router.refresh();
    };

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) {
        void finishNativeSignIn(launch.url, go);
      }
    });

    const listener = App.addListener("appUrlOpen", (event) => {
      void finishNativeSignIn(event.url, go);
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [router]);

  return null;
}
