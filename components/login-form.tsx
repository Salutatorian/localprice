"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [localHost, setLocalHost] = useState(false);

  useEffect(() => {
    setLocalHost(
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1",
    );
  }, []);

  async function google() {
    const supabase = createBrowserSupabase();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      setMessage(
        error.message.includes("provider")
          ? "Google sign-in is not configured on this local server. Use the email code instead."
          : error.message,
      );
    }
  }

  async function magicLink(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const supabase = createBrowserSupabase();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSent(true);
    setMessage(
      localHost
        ? "Code sent. On this computer, open the local inbox — it does not go to Gmail."
        : "Code sent. Check that email for a 6-digit code or sign-in link.",
    );
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6">
      <h1 className="text-3xl">Sign in to contribute</h1>
      <p className="mt-2 text-muted-foreground">
        Browsing stays public. Signing in is only required to scan receipts, flag prices, or save a
        basket.
      </p>
      <Button className="mt-6 w-full" onClick={google}>
        Continue with Google
      </Button>
      <div className="my-6 h-px bg-border" />
      <form className="space-y-3" onSubmit={magicLink}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" className="w-full" disabled={pending}>
          {pending && !sent ? "Sending…" : "Email me a code"}
        </Button>
      </form>
      {sent ? (
        <form className="mt-4 space-y-3" onSubmit={verifyCode}>
          <p className="text-sm text-muted-foreground">
            {localHost ? (
              <>
                Local inbox:{" "}
                <a
                  className="text-primary underline"
                  href="http://127.0.0.1:54324"
                  target="_blank"
                  rel="noreferrer"
                >
                  http://127.0.0.1:54324
                </a>
                . Paste the 6-digit code, or open the sign-in link in this same browser tab.
              </>
            ) : (
              "Paste the 6-digit code from your email. If the message includes a link, open it in this same browser."
            )}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="code">One-time code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in with code"}
          </Button>
        </form>
      ) : null}
      {message ? <p className="mt-4 text-sm">{message}</p> : null}
    </div>
  );
}
