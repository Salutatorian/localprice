import { Button } from "@/components/ui/button";
import { approveFirstReceiptAction, rejectFirstReceiptAction, resolveFlagAction } from "@/app/actions/moderation";
import { REPORT_REASON_LABELS, type ReportReason } from "@/domain/access";

export function FirstReceiptButtons({ receiptId }: { receiptId: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={approveFirstReceiptAction}>
        <input type="hidden" name="receiptId" value={receiptId} />
        <Button type="submit" size="sm">
          Publish prices
        </Button>
      </form>
      <form action={rejectFirstReceiptAction}>
        <input type="hidden" name="receiptId" value={receiptId} />
        <Button type="submit" size="sm" variant="destructive">
          Reject and delete
        </Button>
      </form>
    </div>
  );
}

export function FlagButtons({ flagId, reason }: { flagId: string; reason: string }) {
  const label = reason in REPORT_REASON_LABELS ? REPORT_REASON_LABELS[reason as ReportReason] : reason;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <p className="sr-only">{label}</p>
      <form action={resolveFlagAction}>
        <input type="hidden" name="flagId" value={flagId} />
        <input type="hidden" name="outcome" value="keep" />
        <Button type="submit" size="sm" variant="outline">
          Keep price
        </Button>
      </form>
      <form action={resolveFlagAction}>
        <input type="hidden" name="flagId" value={flagId} />
        <input type="hidden" name="outcome" value="remove" />
        <Button type="submit" size="sm" variant="destructive">
          Remove price
        </Button>
      </form>
    </div>
  );
}
