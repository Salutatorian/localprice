"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportPriceAction } from "@/app/actions/flags";
import { REPORT_REASON_LABELS, REPORT_REASONS } from "@/domain/access";

export function ReportPriceButton({ observationId }: { observationId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            try {
              await reportPriceAction(new FormData(event.currentTarget));
              toast.success("Reported. A moderator will review it.");
              setOpen(false);
            } catch (caught) {
              toast.error(caught instanceof Error ? caught.message : "Could not send the report.");
            } finally {
              setPending(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Report this price</DialogTitle>
            <DialogDescription>
              Use this for junk, fake receipts, or a price that is clearly wrong. The listing comes
              off the board until a moderator looks at it.
            </DialogDescription>
          </DialogHeader>
          <input type="hidden" name="observationId" value={observationId} />
          <div className="grid gap-2 py-2">
            <Label htmlFor={`reason-${observationId}`}>What is wrong?</Label>
            <select
              id={`reason-${observationId}`}
              name="reason"
              required
              className="h-10 rounded-xl border border-white/15 bg-background px-3 text-sm"
            >
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {REPORT_REASON_LABELS[reason]}
                </option>
              ))}
            </select>
            <Label htmlFor={`details-${observationId}`}>Details (optional)</Label>
            <Textarea id={`details-${observationId}`} name="details" maxLength={500} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
