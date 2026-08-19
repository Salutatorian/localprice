import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

function parseEnv(path) {
  const values = {};
  if (!existsSync(path)) {
    return values;
  }
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    if (index < 0) {
      continue;
    }
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const local = parseEnv(".env.local");
const cloud = parseEnv(".env.vercel.public");
const cronSecret = local.CRON_SECRET || randomBytes(24).toString("hex");

const env = {
  NEXT_PUBLIC_SUPABASE_URL: cloud.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: cloud.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_DEFAULT_MARKET: cloud.NEXT_PUBLIC_DEFAULT_MARKET || "saipan",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://localprice.vercel.app",
  GEMINI_API_KEY: local.GEMINI_API_KEY || "",
  GEMINI_MODEL: local.GEMINI_MODEL || "gemini-2.5-flash",
  GEMINI_MODEL_RETRY: local.GEMINI_MODEL_RETRY || "gemini-2.5-pro",
  FEATURE_RECEIPT_UPLOAD: local.FEATURE_RECEIPT_UPLOAD || "true",
  FEATURE_GEMINI_EXTRACTION: local.FEATURE_GEMINI_EXTRACTION || "true",
  FEATURE_GOOGLE_PLACES: local.FEATURE_GOOGLE_PLACES || "false",
  FEATURE_BASKET_COMPARISON: local.FEATURE_BASKET_COMPARISON || "true",
  FEATURE_MODERATION: local.FEATURE_MODERATION || "true",
  RECEIPT_RETENTION_DAYS: local.RECEIPT_RETENTION_DAYS || "21",
  CRON_SECRET: cronSecret,
};

if (local.SUPABASE_SERVICE_ROLE_KEY && !local.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1")) {
  env.SUPABASE_SERVICE_ROLE_KEY = local.SUPABASE_SERVICE_ROLE_KEY;
}

const args = process.argv.slice(2);
const appUrlIndex = args.indexOf("--app-url");
if (appUrlIndex >= 0 && args[appUrlIndex + 1]) {
  env.NEXT_PUBLIC_APP_URL = args[appUrlIndex + 1];
}

for (const [key, value] of Object.entries(env)) {
  if (!value) {
    console.log(`skip ${key} (empty)`);
    continue;
  }
  execSync(
    `npx vercel env add ${key} production,preview --force --yes --scope salutatorians-projects`,
    {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    },
  );
  console.log(`set ${key}`);
}
