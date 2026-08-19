# Security checklist

- [ ] RLS enabled on all public tables
- [ ] security_invoker views
- [ ] no service role in the browser
- [ ] private storage bucket `receipts`
- [ ] signed URLs only from server code
- [ ] contributor cannot insert `verified` observations
- [ ] SQL tests cover cross-user receipt reads
- [ ] cron routes require `CRON_SECRET`
