"use client";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] bg-card px-6 py-8 ring-1 ring-white/8">
      <h1 className="text-2xl">Something broke</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <Button type="button" className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
