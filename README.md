# LocalPrice

LocalPrice is a public, community grocery price ledger. It starts in Saipan, CNMI and expands city by city. Photograph a receipt, wait for extraction, correct yellow uncertain fields, confirm, and stop. Nobody configures Gemini, Google, or Supabase keys in the app.

TaxHacker inspired receipt-to-structure only. The interface, database, verification, and community model are original.

## Local setup without production credentials

1. Install Node 22+ and Docker Desktop.
2. Copy environment defaults:

```bash
copy .env.example .env.local
```

3. Start Supabase and write the local keys into `.env.local`:

```bash
npx supabase start
npx supabase status
```

Use the printed `API URL`, `anon key`, and `service_role key`. Leave `GEMINI_API_KEY` and `GOOGLE_PLACES_API_KEY` empty. Receipt upload still works through the mock extractor.

4. Reset the database (migrations + Saipan seed):

```bash
npx supabase db reset
```

5. Run the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to `/m/saipan`. Install the PWA from the browser if you want a home-screen icon. A later Capacitor wrapper can reuse this web app; native store builds are not required to launch.

### Auth locally

Enable Google in the Supabase dashboard when you have a client ID. For local work, magic links appear in Inbucket at [http://127.0.0.1:54324](http://127.0.0.1:54324).

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npx playwright test
npx supabase test db
```

## Data flow

1. Authenticated user uploads a receipt photo.
2. The server compresses it, strips extra metadata, hashes it, and stores it in the private `receipts` bucket under `{userId}/{receiptId}/{random}.jpg`.
3. An extraction job runs on the server. Mock JSON is used until `FEATURE_GEMINI_EXTRACTION=true` and `GEMINI_API_KEY` are set.
4. Zod validates the JSON. Arithmetic and dates are checked even when Gemini followed the schema. One retry uses `GEMINI_MODEL_RETRY`.
5. Stores are matched in LocalPrice first (aliases). Google Places is called only for unknown merchants, inside the market, with a tight field mask, and cached.
6. The contributor reviews yellow fields and confirms.
7. Matching items become append-only `price_observations` in `provisional` state. Contributors cannot write `verified`.
8. Browsing market selection is stored as `browsing_market_id` and is never used to assign the receipt.

## Moderation

Moderators and admins are stored in `market_memberships` and `private.app_roles`. Do not authorize from `user_metadata`. Moderators handle unmatched stores, outliers, disputes, and product merges. Every privileged action writes `moderation_actions` and `audit_logs`.

## Receipt retention

Default window is 21 days (`RECEIPT_RETENTION_DAYS`, allowed 14–30). The daily cron `/api/cron/retention` deletes private images that are past `retain_until` and not disputed. Structured observations stay.

## Environment variables

See `.env.example`. Public keys are `NEXT_PUBLIC_*` only. `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `GOOGLE_PLACES_API_KEY` stay on the server.

Feature flags:

- `FEATURE_RECEIPT_UPLOAD`
- `FEATURE_GEMINI_EXTRACTION`
- `FEATURE_GOOGLE_PLACES`
- `FEATURE_BASKET_COMPARISON`
- `FEATURE_MODERATION`

Unfinished work is flagged or shown as empty. There are no fake success screens.

## Migrations and deploy

```bash
npx supabase db reset          # local
npx supabase db push           # linked remote, development
npx supabase gen types typescript --local > lib/supabase/generated.ts
```

Production only:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
# then deploy the Next.js app on Vercel
```

Vercel: set the same env vars, add Google redirect `https://<domain>/auth/callback`, and keep cron routes protected with `CRON_SECRET`.

## Security checklist

- RLS is on for every public table.
- Views use `security_invoker = true`.
- Anon cannot read receipts, `created_by`, OCR dumps, or storage objects.
- Storage policies scope objects to `{auth.uid()}/...`. Moderators use signed URLs from server code.
- Service role is server-only.
- Rate limits cover upload, flags, and extraction.

## Limitations

- Gemini and Places are off until keys exist.
- Product matching is barcode-then-name/size/unit, with ambiguous rows left unmatched.
- Seed data is a Saipan demo catalog, not a live 300-product corpus.
- Capacitor config is a stub; ship the PWA first.

## Roadmap

1. Seed 300–500 Saipan staples from Joeten, Payless, Superfresh, Ken's, and convenience stores.
2. Closed beta of 20–40 local contributors who only photograph receipts they already get.
3. Publish weekly rice, milk, school-lunch, and barbecue basket comparisons.
4. Activate new markets only after the sandbox threshold in `docs/roadmap.md`.
