"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallGuide() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const apkHref = "/downloads/localprice-debug.apk";
  const [apkReady, setApkReady] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setPlatform("ios");
    } else if (/Android/i.test(ua)) {
      setPlatform("android");
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    void fetch(apkHref, { method: "HEAD" }).then((response) => {
      setApkReady(response.ok);
    });
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function installPwa() {
    if (!installEvent) {
      return;
    }
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Closed beta</p>
        <h1 className="text-4xl">Put LocalPrice on your phone</h1>
        <p className="max-w-2xl text-muted-foreground">
          There is no App Store or Play Store listing yet. Testers open the website, add it to the
          home screen, or sideload the Android file from this page.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copyLink} variant="outline">
            {copied ? "Link copied" : "Copy site link"}
          </Button>
          {origin ? (
            <p className="self-center text-sm text-muted-foreground">{origin}</p>
          ) : null}
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl">1. Add to Home Screen</h2>
        <p className="mt-2 text-muted-foreground">
          This is the usual way for the 20–40 person beta. It is the same app in a standalone window,
          with no store fee.
        </p>
        {installEvent ? (
          <Button className="mt-4" onClick={installPwa}>
            Install on this phone
          </Button>
        ) : null}
        {platform === "ios" ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Open this site in Safari, not Chrome or in-app browsers.</li>
            <li>Tap the Share button.</li>
            <li>Tap Add to Home Screen, then Add.</li>
          </ol>
        ) : null}
        {platform === "android" ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Open this site in Chrome.</li>
            <li>Tap the menu (three dots).</li>
            <li>Tap Add to Home screen or Install app.</li>
          </ol>
        ) : null}
        {platform === "other" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-medium">iPhone</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Safari → Share → Add to Home Screen.</li>
              </ol>
            </div>
            <div>
              <h3 className="font-medium">Android</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Chrome → menu → Add to Home screen.</li>
              </ol>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl">2. Android file download</h2>
        <p className="mt-2 text-muted-foreground">
          Optional. This installs a thin wrapper that opens the live site. It is not a Play Store
          app. iPhone cannot install this file.
        </p>
        {apkReady ? (
          <Button className="mt-4" asChild>
            <a href={apkHref} download>
              Download Android app
            </a>
          </Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            The Android file is not on this server yet. Use Add to Home Screen above.
          </p>
        )}
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>On the phone, allow installs from this browser if Android asks.</li>
          <li>Open the downloaded file and tap Install.</li>
          <li>Ignore Play Protect warnings for this unsigned debug build.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl">3. Invite testers</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Send them the site link, not an App Store search.</li>
          <li>Ask Android users to use Chrome; ask iPhone users to use Safari.</li>
          <li>They sign in with email. The code goes to their inbox, not a local test mailbox.</li>
          <li>Receipt photos stay private. Only confirmed prices become public.</li>
        </ol>
      </section>
    </article>
  );
}
