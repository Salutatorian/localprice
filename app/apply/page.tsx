"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function ApplyPage() {
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-4xl">Apply for a market</h1>
      <p className="text-muted-foreground">
        A person cannot switch on an entire country. New cities start as a private sandbox, then
        seed stores and receipts, then go public after review.
      </p>
      <form
        className="space-y-3 rounded-[1.5rem] bg-card p-5 ring-1 ring-white/8"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const supabase = createBrowserSupabase();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            router.push("/login?next=/apply");
            return;
          }
          const { error } = await supabase.from("market_requests").insert({
            organizer_id: user.id,
            proposed_name: String(form.get("name")),
            country_name: String(form.get("country")),
            currency_code: String(form.get("currency")),
            notes: String(form.get("notes")),
          });
          setMessage(error ? error.message : "Request submitted. It stays sandboxed until review.");
        }}
      >
        <div>
          <Label htmlFor="name">City or island</Label>
          <Input id="name" name="name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue="USD" maxLength={3} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="notes">Who can moderate, and why this market is ready</Label>
          <Textarea id="notes" name="notes" className="mt-1" />
        </div>
        <Button type="submit">Submit market request</Button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
