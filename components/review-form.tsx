"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmReceiptAction } from "@/app/actions/receipts";
import { isUncertain } from "@/domain/extraction";

const UNITS = ["oz", "lb", "g", "kg", "ml", "l", "fl_oz", "count", "unknown"] as const;
type Unit = (typeof UNITS)[number];

function asUnit(value: string): Unit {
  return UNITS.includes(value as Unit) ? (value as Unit) : "unknown";
}

type Item = {
  id: string;
  raw_description: string;
  normalized_name: string | null;
  brand: string | null;
  quantity: number | null;
  package_size: number | null;
  unit: string | null;
  line_total_cents: number | null;
  field_confidence: Record<string, number>;
  needs_review: boolean;
};

export function ReviewWaiter({ initialStatus }: { initialStatus: string }) {
  const router = useRouter();
  const status = initialStatus;

  useEffect(() => {
    if (status === "needs_review" || status === "completed" || status === "failed") {
      return;
    }
    const timer = setInterval(() => {
      router.refresh();
    }, 2000);
    return () => clearInterval(timer);
  }, [status, router]);

  if (status === "queued" || status === "processing" || status === "uploaded") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl">Reading the receipt</h2>
        <p className="mt-2 text-muted-foreground">This stays on our servers. Nothing is public yet.</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl">Extraction failed</h2>
        <p className="mt-2 text-muted-foreground">
          LocalPrice did not invent a success. Try a straighter photo or a different receipt.
        </p>
      </div>
    );
  }

  return null;
}

export function ReviewForm({
  receiptId,
  merchantName,
  items,
  storeLookupPending = false,
}: {
  receiptId: string;
  merchantName: string;
  items: Item[];
  storeLookupPending?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const payload = {
          receiptId,
          merchantName: String(form.get("merchantName") ?? merchantName),
          items: items.map((item) => ({
            id: item.id,
            normalizedName: String(form.get(`name-${item.id}`) ?? item.normalized_name ?? item.raw_description),
            brand: String(form.get(`brand-${item.id}`) ?? item.brand ?? ""),
            quantity: Number(form.get(`qty-${item.id}`) ?? item.quantity ?? 1),
            packageSize: Number(form.get(`size-${item.id}`) ?? item.package_size ?? 0) || undefined,
            unit: asUnit(String(form.get(`unit-${item.id}`) ?? item.unit ?? "unknown")),
            lineTotalCents: Number(form.get(`total-${item.id}`) ?? item.line_total_cents ?? 0),
          })),
        };
        try {
          await confirmReceiptAction(payload);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not confirm.");
          setPending(false);
        }
      }}
    >
      <div className="rounded-2xl border border-border bg-card p-4">
        <Label htmlFor="merchantName">Store</Label>
        <Input
          id="merchantName"
          name="merchantName"
          defaultValue={merchantName}
          className={isUncertain(0.7) ? "uncertain-field mt-1" : "mt-1"}
        />
        <p className="mt-1 text-xs text-muted-foreground">Yellow fields are uncertain. Correct only those.</p>
      </div>
      {items.map((item) => (
        <fieldset key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <legend className="px-1 text-sm text-muted-foreground">{item.raw_description}</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label="Product"
              name={`name-${item.id}`}
              defaultValue={item.normalized_name ?? ""}
              uncertain={isUncertain(item.field_confidence.normalizedName ?? 1)}
            />
            <Field
              label="Brand"
              name={`brand-${item.id}`}
              defaultValue={item.brand ?? ""}
              uncertain={isUncertain(item.field_confidence.brand ?? 1)}
            />
            <Field
              label="Quantity"
              name={`qty-${item.id}`}
              defaultValue={String(item.quantity ?? 1)}
              uncertain={isUncertain(item.field_confidence.quantity ?? 1)}
            />
            <Field
              label="Size"
              name={`size-${item.id}`}
              defaultValue={String(item.package_size ?? "")}
              uncertain={isUncertain(item.field_confidence.packageSize ?? 1)}
            />
            <Field
              label="Unit"
              name={`unit-${item.id}`}
              defaultValue={item.unit ?? "unknown"}
              uncertain={isUncertain(item.field_confidence.unit ?? 1)}
            />
            <Field
              label="Line total (cents)"
              name={`total-${item.id}`}
              defaultValue={String(item.line_total_cents ?? 0)}
              uncertain={isUncertain(item.field_confidence.lineTotalCents ?? 1)}
            />
          </div>
        </fieldset>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {storeLookupPending ? (
        <p className="rounded-xl bg-secondary px-3 py-2 text-sm">
          This store is not in the LocalPrice registry yet. Confirming will search for it and
          attach the Saipan location if there is a unique match.
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Publishing…" : "Confirm and contribute"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  uncertain,
}: {
  label: string;
  name: string;
  defaultValue: string;
  uncertain: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className={uncertain ? "uncertain-field mt-1" : "mt-1"}
      />
    </div>
  );
}
