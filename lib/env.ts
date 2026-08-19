import { z } from "zod";

const boolFromEnv = z
  .enum(["true", "false", ""])
  .optional()
  .transform((value) => value === "true");

const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("local-anon-key-placeholder"),
  NEXT_PUBLIC_DEFAULT_MARKET: z.string().min(1).default("saipan"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_MODEL_RETRY: z.string().default("gemini-2.5-pro"),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  FEATURE_RECEIPT_UPLOAD: boolFromEnv,
  FEATURE_GEMINI_EXTRACTION: boolFromEnv,
  FEATURE_GOOGLE_PLACES: boolFromEnv,
  FEATURE_BASKET_COMPARISON: boolFromEnv,
  FEATURE_MODERATION: boolFromEnv,
  FEATURE_INVITE_ONLY: boolFromEnv,
  ACCESS_ALLOWLIST: z.string().optional(),
  ACCESS_ADMIN_EMAILS: z.string().optional(),
  RECEIPT_RETENTION_DAYS: z.coerce.number().min(14).max(30).default(21),
  CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) {
    return cached;
  }

  const parsed = serverSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEFAULT_MARKET: process.env.NEXT_PUBLIC_DEFAULT_MARKET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    GEMINI_MODEL_RETRY: process.env.GEMINI_MODEL_RETRY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    FEATURE_RECEIPT_UPLOAD: process.env.FEATURE_RECEIPT_UPLOAD,
    FEATURE_GEMINI_EXTRACTION: process.env.FEATURE_GEMINI_EXTRACTION,
    FEATURE_GOOGLE_PLACES: process.env.FEATURE_GOOGLE_PLACES,
    FEATURE_BASKET_COMPARISON: process.env.FEATURE_BASKET_COMPARISON,
    FEATURE_MODERATION: process.env.FEATURE_MODERATION,
    FEATURE_INVITE_ONLY: process.env.FEATURE_INVITE_ONLY,
    ACCESS_ALLOWLIST: process.env.ACCESS_ALLOWLIST,
    ACCESS_ADMIN_EMAILS: process.env.ACCESS_ADMIN_EMAILS,
    RECEIPT_RETENTION_DAYS: process.env.RECEIPT_RETENTION_DAYS,
    CRON_SECRET: process.env.CRON_SECRET,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid environment: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  cached = parsed.data;
  return cached;
}

export function getPublicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    defaultMarket: process.env.NEXT_PUBLIC_DEFAULT_MARKET ?? "saipan",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}
