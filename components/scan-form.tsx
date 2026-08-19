"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { uploadReceiptAction } from "@/app/actions/receipts";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Uploading privately…" : "Process receipt"}
    </Button>
  );
}

export function ScanForm({ marketId, usingMock }: { marketId: string; usingMock: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        setError(null);
        try {
          await uploadReceiptAction(formData);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Upload failed.");
        }
      }}
    >
      <input type="hidden" name="marketId" value={marketId} />
      <label className="block rounded-3xl border border-dashed border-primary/40 bg-card p-6 text-center">
        <span className="font-[family-name:var(--font-display)] text-2xl">Photograph or upload</span>
        <p className="mt-2 text-sm text-muted-foreground">
          Camera first. If the camera is blocked, pick a file. Images stay private.
        </p>
        <input
          className="mt-4 block w-full text-sm"
          type="file"
          name="receipt"
          accept="image/*"
          capture="environment"
          required
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setPreview(null);
              return;
            }
            setPreview(URL.createObjectURL(file));
          }}
        />
      </label>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Receipt preview" className="max-h-80 w-full rounded-2xl object-contain bg-muted" />
      ) : null}
      {usingMock ? (
        <p className="rounded-xl bg-secondary px-3 py-2 text-sm">
          Gemini is off. LocalPrice will use the mock extractor so the review flow can be tested
          without production credentials.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Submit />
    </form>
  );
}
