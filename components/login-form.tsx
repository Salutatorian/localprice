"use client";

import { useEffect, useState } from "react";
import { GoogleLogo } from "@/components/google-logo";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { createBrowserSupabase } from "@/lib/supabase/client";

function GoogleButton({
  label,
  pending,
  onClick,
}: {
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[#747775] bg-white text-[15px] font-medium text-[#1f1f1f] shadow-sm transition hover:bg-[#f8f9fa] hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#4285F4]/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleLogo />
      <span>{pending ? "Opening Google…" : label}</span>
    </button>
  );
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    const finished = Browser.addListener("browserFinished", () => {
      setPending(false);
    });
    return () => {
      void finished.then((handle) => handle.remove());
    };
  }, []);

  async function google() {
    setPending(true);
    setMessage(null);
    const supabase = createBrowserSupabase();
    const origin = window.location.origin;
    const native = Capacitor.isNativePlatform();
    const redirectTo = native
      ? `${origin}/auth/callback?native=1&next=${encodeURIComponent(nextPath)}`
      : `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: native,
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
        },
      },
    });
    if (error) {
      setPending(false);
      setMessage(
        error.message.includes("provider")
          ? "Google is not turned on yet in this project's auth settings."
          : error.message,
      );
      return;
    }
    if (native) {
      if (!data.url) {
        setPending(false);
        setMessage("Could not start Google sign-in.");
        return;
      }
      await Browser.open({ url: data.url, presentationStyle: "popover" });
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-[2rem] bg-till p-7 ring-1 ring-white/8">
      <p className="text-sm font-medium text-primary">Join the ledger</p>
      <h1 className="mt-1 text-3xl">Sign in with Google</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Browse prices without an account. Sign in to photograph a receipt and add anonymous prices.
      </p>

      <div className="mt-6 space-y-3">
        <GoogleButton label="Continue with Google" pending={pending} onClick={google} />
      </div>
      {message ? <p className="mt-4 text-sm">{message}</p> : null}
    </div>
  );
}
