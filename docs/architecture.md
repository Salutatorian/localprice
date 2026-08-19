# Architecture

LocalPrice is a Next.js App Router PWA with Supabase Postgres, Auth, and private Storage.

```
app/            routes, server actions, cron
components/     UI, including shadcn primitives
domain/         pure TypeScript: extraction, matching, assignment, trust
lib/            env, money, units, data access, supabase clients
server/         Gemini, Places, image compression, jobs
supabase/       migrations, seed, RLS tests
tests/          Vitest and Playwright
docs/           privacy, retention, costs, launch
```

Submission location is decided in `domain/assignment.ts` from receipt evidence. `last_seen_market_id` and the market switcher are browsing-only.

The extraction pipeline lives in `server/jobs.ts`. It never runs in the browser.
