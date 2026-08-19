"use client";

import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Camera as CameraIcon, Images } from "lucide-react";
import { PrinterHousing, ThermalReceipt } from "@/components/thermal-receipt";
import { uploadReceiptAction } from "@/app/actions/receipts";

function cancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("cancel") || message.includes("dismiss");
}

export function ScanForm({ marketId, usingMock }: { marketId: string; usingMock: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitFile(file: File) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("marketId", marketId);
    formData.set("receipt", file);
    try {
      await uploadReceiptAction(formData);
    } catch (caught) {
      setPending(false);
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    }
  }

  async function capture(source: "camera" | "gallery") {
    if (pending) {
      return;
    }
    setError(null);

    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          saveToGallery: false,
          resultType: CameraResultType.Uri,
          source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
        });
        if (!photo.webPath) {
          throw new Error("No photo returned.");
        }
        const blob = await fetch(photo.webPath).then((response) => response.blob());
        const extension = photo.format || "jpg";
        const file = new File([blob], `receipt.${extension}`, {
          type: blob.type || "image/jpeg",
        });
        await submitFile(file);
      } catch (caught) {
        if (!cancelled(caught)) {
          setError(caught instanceof Error ? caught.message : "Could not open the camera.");
        }
      }
      return;
    }

    const input = fileRef.current;
    if (!input) {
      return;
    }
    if (source === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        className="hidden"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void submitFile(file);
          }
        }}
      />

      <PrinterHousing
        eyebrow="Till"
        title={pending ? "Printing…" : "Full receipt"}
        status={pending ? "Reading the paper" : undefined}
      >
        <ThermalReceipt
          storeName={pending ? "Hang on" : "Drop a ticket in"}
          printing={pending}
          items={pending ? [] : [{ description: "Photo stays private", totalCents: null }]}
          status={pending ? "Rebuilding line items" : "Not the photo — the ledger copy"}
        />
      </PrinterHousing>

      <div className="flex justify-center gap-8 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void capture("camera")}
          className="flex flex-col items-center gap-2 text-xs text-muted-foreground disabled:opacity-50"
        >
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-paper text-paper-foreground shadow-[0_12px_30px_-16px_oklch(0_0_0_/_0.6)]">
            <CameraIcon className="size-6" strokeWidth={1.75} />
          </span>
          {pending ? "Uploading…" : "Take photo"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void capture("gallery")}
          className="flex flex-col items-center gap-2 text-xs text-muted-foreground disabled:opacity-50"
        >
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-white/8">
            <Images className="size-6" strokeWidth={1.75} />
          </span>
          Choose from gallery
        </button>
      </div>

      {usingMock ? (
        <p className="rounded-2xl bg-secondary px-4 py-3 text-center text-sm">
          Gemini is off. LocalPrice will use the mock extractor so the review flow can be tested
          without production credentials.
        </p>
      ) : null}
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
