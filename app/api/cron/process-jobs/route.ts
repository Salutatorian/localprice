import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { processExtractionJob } from "@/server/jobs";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const secret = request.headers.get("authorization");
  if (!env.CRON_SECRET || secret !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: jobs } = await admin
    .from("extraction_jobs")
    .select("id")
    .eq("status", "queued")
    .limit(5);

  for (const job of jobs ?? []) {
    await processExtractionJob(job.id);
  }

  return NextResponse.json({ processed: jobs?.length ?? 0 });
}
