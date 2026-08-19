import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const secret = request.headers.get("authorization");
  if (!env.CRON_SECRET || secret !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: expired } = await admin
    .from("receipts")
    .select("id, storage_path, disputed")
    .lte("retain_until", new Date().toISOString())
    .is("deleted_at", null)
    .eq("disputed", false)
    .limit(100);

  let deleted = 0;
  for (const receipt of expired ?? []) {
    await admin.storage.from("receipts").remove([receipt.storage_path]);
    await admin
      .from("receipts")
      .update({ deleted_at: new Date().toISOString(), storage_path: "deleted" })
      .eq("id", receipt.id);
    deleted += 1;
  }

  return NextResponse.json({ deleted });
}
