export type Freshness = "fresh" | "aging" | "stale";

export function freshnessFor(observedOn: string, freshnessHours: number): Freshness {
  const observed = new Date(`${observedOn}T12:00:00`);
  const ageHours = (Date.now() - observed.getTime()) / (1000 * 60 * 60);
  if (ageHours <= freshnessHours) {
    return "fresh";
  }
  if (ageHours <= freshnessHours * 2) {
    return "aging";
  }
  return "stale";
}

export function freshnessLabel(freshness: Freshness): string {
  switch (freshness) {
    case "fresh":
      return "Fresh";
    case "aging":
      return "Aging";
    case "stale":
      return "Stale";
    default: {
      const exhaustive: never = freshness;
      return exhaustive;
    }
  }
}
