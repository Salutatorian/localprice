"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h1 className="text-2xl">Something broke</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <button type="button" className="mt-4 text-primary underline" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
