import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      body="That market, store, or product is not in the ledger."
      actionHref="/m/saipan"
      actionLabel="Back to Saipan"
    />
  );
}
