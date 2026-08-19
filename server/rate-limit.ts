import { createAdminSupabase } from "@/lib/supabase/admin";

const WINDOW_MS = 60 * 60 * 1000;
const LIMITS: Record<string, number> = {
  upload: 8,
  flag: 12,
  magic_link: 5,
  extraction: 8,
  access_request: 4,
};

export async function enforceRateLimit(args: {
  action: string;
  userId?: string | null;
  ipHash?: string | null;
}) {
  const limit = LIMITS[args.action] ?? 10;
  const admin = createAdminSupabase();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error } = await admin
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("action", args.action)
    .gte("created_at", since)
    .or(
      [
        args.userId ? `user_id.eq.${args.userId}` : null,
        args.ipHash ? `ip_hash.eq.${args.ipHash}` : null,
      ]
        .filter(Boolean)
        .join(","),
    );

  if (error) {
    throw new Error("Could not check rate limits. Try again in a moment.");
  }

  if ((count ?? 0) >= limit) {
    throw new Error("Too many attempts. Please wait before trying again.");
  }

  await admin.from("rate_limits").insert({
    user_id: args.userId ?? null,
    ip_hash: args.ipHash ?? null,
    action: args.action,
  });
}
