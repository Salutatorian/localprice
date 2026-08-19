-- LocalPrice foundation: geography, catalogs, receipts, append-only prices, RLS.
-- Authorization uses private.app_roles and market_memberships, never user_metadata.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to postgres, service_role;
-- Needed so RLS and triggers can call private.is_admin() / private.is_market_moderator().
-- Tables in private remain ungranted.
grant usage on schema private to anon, authenticated;

create type public.market_status as enum (
  'requested',
  'sandbox',
  'seeding',
  'public',
  'paused',
  'archived'
);

create type public.membership_role as enum (
  'contributor',
  'moderator',
  'organizer'
);

create type public.observation_state as enum (
  'pending',
  'provisional',
  'verified',
  'disputed',
  'rejected',
  'expired'
);

create type public.extraction_status as enum (
  'queued',
  'processing',
  'needs_review',
  'completed',
  'failed'
);

create type public.flag_status as enum ('open', 'resolved', 'dismissed');

create type public.normalized_unit as enum (
  'oz',
  'lb',
  'g',
  'kg',
  'ml',
  'l',
  'fl_oz',
  'count',
  'unknown'
);

create type public.package_measure_kind as enum (
  'weight',
  'volume',
  'count',
  'unknown'
);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);

insert into public.app_settings (key, value) values
  ('receipt_retention_days', '21'),
  ('outlier_ratio', '2.5'),
  ('activation_min_branches', '3'),
  ('activation_min_trusted_contributors', '2'),
  ('activation_min_receipts', '25'),
  ('activation_min_products', '100'),
  ('activation_max_unresolved_pct', '10');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  last_seen_market_id uuid,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_len check (char_length(display_name) <= 80)
);

create table private.app_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  iso_code text not null unique,
  name text not null
);

create table public.regions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries (id) on delete restrict,
  slug text not null,
  name text not null,
  unique (country_id, slug)
);

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete restrict,
  slug text not null unique,
  name text not null,
  currency_code char(3) not null,
  timezone text not null,
  status public.market_status not null default 'sandbox',
  boundary geography(polygon, 4326),
  center geography(point, 4326),
  freshness_hours integer not null default 168,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.market_memberships (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (market_id, user_id, role)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.store_branches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  market_id uuid not null references public.markets (id) on delete cascade,
  slug text not null,
  name text not null,
  address text,
  location geography(point, 4326),
  google_place_id text unique,
  google_business_status text,
  phone text,
  verification_status text not null default 'unverified'
    check (
      verification_status in (
        'unverified',
        'places_matched',
        'moderator_verified',
        'community_confirmed'
      )
    ),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique (store_id, market_id, slug)
);

create table public.store_aliases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  branch_id uuid references public.store_branches (id) on delete set null,
  alias citext not null unique,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text,
  package_size numeric,
  package_size_text text,
  unit public.normalized_unit not null default 'unknown',
  measure_kind public.package_measure_kind not null default 'unknown',
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'merged', 'split')),
  canonical_id uuid references public.products (id),
  created_at timestamptz not null default now()
);

create table public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  alias citext not null,
  source text not null default 'receipt',
  unique (product_id, alias)
);

create table public.product_barcodes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  barcode text not null unique
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references public.profiles (id) on delete cascade,
  market_id uuid references public.markets (id),
  branch_id uuid references public.store_branches (id),
  browsing_market_id uuid references public.markets (id),
  storage_path text not null,
  sha256 text not null,
  perceptual_hash text,
  duplicate_of uuid references public.receipts (id),
  currency_code char(3),
  purchased_at timestamptz,
  merchant_raw text,
  address_raw text,
  phone_raw text,
  subtotal_cents integer,
  tax_cents integer,
  total_cents integer,
  transaction_number text,
  status text not null default 'uploaded',
  disputed boolean not null default false,
  retain_until timestamptz not null,
  deleted_at timestamptz,
  coarse_device_lat numeric,
  coarse_device_lng numeric,
  created_at timestamptz not null default now()
);

create unique index receipts_sha256_live
  on public.receipts (sha256)
  where deleted_at is null;

create table public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  status public.extraction_status not null default 'queued',
  model_primary text,
  model_retry text,
  attempt integer not null default 0,
  raw_output jsonb,
  validated_output jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  product_id uuid references public.products (id),
  line_index integer not null,
  raw_description text not null,
  normalized_name text,
  brand text,
  quantity numeric,
  package_size numeric,
  unit public.normalized_unit,
  line_total_cents integer,
  unit_price_cents integer,
  discount_cents integer,
  barcode text,
  field_confidence jsonb not null default '{}'::jsonb,
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.price_observations (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets (id),
  branch_id uuid not null references public.store_branches (id),
  product_id uuid not null references public.products (id),
  receipt_id uuid references public.receipts (id),
  receipt_item_id uuid references public.receipt_items (id),
  price_cents integer not null,
  currency_code char(3) not null,
  quantity numeric not null default 1,
  package_size numeric,
  unit public.normalized_unit not null,
  unit_price_cents integer,
  unit_price_basis text,
  is_sale boolean not null default false,
  observed_on date not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  state public.observation_state not null default 'pending',
  evidence_count integer not null default 1,
  outlier_held boolean not null default false,
  stale_labeled boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.price_confirmations (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.price_observations (id) on delete cascade,
  confirming_observation_id uuid references public.price_observations (id),
  confirmer_id uuid references public.profiles (id),
  kind text not null check (kind in ('independent_receipt', 'moderator')),
  created_at timestamptz not null default now()
);

create table public.contributor_trust_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  market_id uuid not null references public.markets (id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  observation_id uuid references public.price_observations (id) on delete cascade,
  receipt_id uuid references public.receipts (id) on delete cascade,
  reason text not null,
  details text,
  status public.flag_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.saved_baskets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  market_id uuid not null references public.markets (id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.basket_items (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid not null references public.saved_baskets (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity numeric not null default 1,
  unique (basket_id, product_id)
);

create table public.api_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  provider text not null,
  route text not null,
  units integer not null default 1,
  cost_micros integer,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.places_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null unique,
  market_id uuid not null references public.markets (id) on delete cascade,
  results jsonb not null,
  created_at timestamptz not null default now()
);

create table public.market_requests (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  proposed_name text not null,
  proposed_slug text,
  country_name text not null,
  region_name text,
  currency_code char(3) not null,
  timezone text,
  notes text,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  ip_hash text,
  action text not null,
  created_at timestamptz not null default now()
);

create index idx_markets_status on public.markets (status);
create index idx_store_branches_market on public.store_branches (market_id);
create index idx_store_aliases_alias on public.store_aliases (alias);
create index idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index idx_product_aliases_alias on public.product_aliases using gin (alias gin_trgm_ops);
create index idx_receipts_submitter on public.receipts (submitter_id);
create index idx_receipts_retain on public.receipts (retain_until)
  where deleted_at is null;
create index idx_extraction_jobs_status on public.extraction_jobs (status);
create index idx_receipt_items_receipt on public.receipt_items (receipt_id);
create index idx_price_obs_product_branch_date
  on public.price_observations (product_id, branch_id, observed_on desc);
create index idx_price_obs_market_state
  on public.price_observations (market_id, state);
create index idx_trust_user_market
  on public.contributor_trust_events (user_id, market_id);
create index idx_flags_status on public.flags (status);
create index idx_rate_limits_lookup
  on public.rate_limits (action, created_at desc);

alter table public.profiles
  add constraint profiles_last_seen_market_fk
  foreign key (last_seen_market_id) references public.markets (id);

-- Auth helpers live in private. Never read raw_user_meta_data for authorization.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select r.is_admin
      from private.app_roles r
      where r.user_id = auth.uid()
    ),
    false
  );
$$;

create or replace function private.is_market_moderator(target_market uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or exists (
      select 1
      from public.market_memberships m
      where m.market_id = target_market
        and m.user_id = auth.uid()
        and m.role in ('moderator', 'organizer')
    );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_market_moderator(uuid) from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_market_moderator(uuid) to anon, authenticated, service_role;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.protect_observation_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.price_cents is distinct from old.price_cents
    or new.currency_code is distinct from old.currency_code
    or new.product_id is distinct from old.product_id
    or new.branch_id is distinct from old.branch_id
    or new.market_id is distinct from old.market_id
    or new.quantity is distinct from old.quantity
    or new.package_size is distinct from old.package_size
    or new.unit is distinct from old.unit
  then
    raise exception 'price observations are append-only';
  end if;
  return new;
end;
$$;

create trigger price_observations_append_only
  before update on public.price_observations
  for each row execute function private.protect_observation_immutability();

create or replace function private.reject_verified_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.state = 'verified' and auth.role() <> 'service_role' and not private.is_admin() then
    raise exception 'contributors cannot write verified observations';
  end if;
  return new;
end;
$$;

create trigger price_observations_no_self_verify
  before insert on public.price_observations
  for each row execute function private.reject_verified_insert();

-- Public, security-invoker views expose only safe price fields.
create view public.price_board
with (security_invoker = true) as
select
  o.id,
  o.market_id,
  o.branch_id,
  o.product_id,
  o.price_cents,
  o.currency_code,
  o.quantity,
  o.package_size,
  o.unit,
  o.unit_price_cents,
  o.unit_price_basis,
  o.is_sale,
  o.observed_on,
  o.confidence,
  o.state,
  o.evidence_count,
  o.stale_labeled,
  o.created_at
from public.price_observations o
where o.state in ('provisional', 'verified', 'disputed', 'expired');

create view public.current_prices
with (security_invoker = true) as
select distinct on (o.product_id, o.branch_id)
  o.id,
  o.market_id,
  o.branch_id,
  o.product_id,
  o.price_cents,
  o.currency_code,
  o.quantity,
  o.package_size,
  o.unit,
  o.unit_price_cents,
  o.unit_price_basis,
  o.is_sale,
  o.observed_on,
  o.confidence,
  o.state,
  o.evidence_count,
  o.stale_labeled,
  o.created_at
from public.price_observations o
where o.state in ('provisional', 'verified')
order by
  o.product_id,
  o.branch_id,
  case when o.state = 'verified' then 0 else 1 end,
  o.observed_on desc,
  o.created_at desc;

create view public.unit_price_comparisons
with (security_invoker = true) as
select
  c.market_id,
  c.product_id,
  c.branch_id,
  c.unit_price_cents,
  c.unit_price_basis,
  c.unit,
  c.package_size,
  c.price_cents,
  c.currency_code,
  c.observed_on,
  c.state,
  c.evidence_count,
  c.stale_labeled
from public.current_prices c
where c.unit_price_cents is not null
  and c.unit_price_basis is not null;

alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.countries enable row level security;
alter table public.regions enable row level security;
alter table public.markets enable row level security;
alter table public.market_memberships enable row level security;
alter table public.stores enable row level security;
alter table public.store_branches enable row level security;
alter table public.store_aliases enable row level security;
alter table public.products enable row level security;
alter table public.product_aliases enable row level security;
alter table public.product_barcodes enable row level security;
alter table public.receipts enable row level security;
alter table public.extraction_jobs enable row level security;
alter table public.receipt_items enable row level security;
alter table public.price_observations enable row level security;
alter table public.price_confirmations enable row level security;
alter table public.contributor_trust_events enable row level security;
alter table public.flags enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.saved_baskets enable row level security;
alter table public.basket_items enable row level security;
alter table public.api_usage enable row level security;
alter table public.audit_logs enable row level security;
alter table public.places_cache enable row level security;
alter table public.market_requests enable row level security;
alter table public.rate_limits enable row level security;

create policy settings_public_read on public.app_settings
  for select to anon, authenticated using (true);

create policy profiles_self_select on public.profiles
  for select to authenticated using (id = auth.uid() or private.is_admin());

create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy countries_read on public.countries
  for select to anon, authenticated using (true);

create policy regions_read on public.regions
  for select to anon, authenticated using (true);

create policy markets_public_read on public.markets
  for select to anon, authenticated
  using (status = 'public' or private.is_admin() or private.is_market_moderator(id));

create policy memberships_self_or_mod on public.market_memberships
  for select to authenticated
  using (user_id = auth.uid() or private.is_market_moderator(market_id));

create policy stores_approved_read on public.stores
  for select to anon, authenticated
  using (status = 'approved' or private.is_admin());

create policy branches_public_read on public.store_branches
  for select to anon, authenticated
  using (
    is_public = true
    or private.is_admin()
    or private.is_market_moderator(market_id)
  );

create policy aliases_read on public.store_aliases
  for select to anon, authenticated using (true);

create policy products_approved_read on public.products
  for select to anon, authenticated
  using (status = 'approved' or private.is_admin());

create policy product_aliases_read on public.product_aliases
  for select to anon, authenticated using (true);

create policy barcodes_read on public.product_barcodes
  for select to anon, authenticated using (true);

create policy receipts_owner_select on public.receipts
  for select to authenticated
  using (
    submitter_id = auth.uid()
    or private.is_admin()
    or (market_id is not null and private.is_market_moderator(market_id))
  );

create policy receipts_owner_insert on public.receipts
  for insert to authenticated
  with check (submitter_id = auth.uid());

create policy receipts_owner_update on public.receipts
  for update to authenticated
  using (submitter_id = auth.uid() or private.is_admin())
  with check (submitter_id = auth.uid() or private.is_admin());

create policy jobs_owner_select on public.extraction_jobs
  for select to authenticated
  using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id
        and (
          r.submitter_id = auth.uid()
          or private.is_admin()
          or (r.market_id is not null and private.is_market_moderator(r.market_id))
        )
    )
  );

create policy items_owner_select on public.receipt_items
  for select to authenticated
  using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id
        and (
          r.submitter_id = auth.uid()
          or private.is_admin()
          or (r.market_id is not null and private.is_market_moderator(r.market_id))
        )
    )
  );

create policy items_owner_update on public.receipt_items
  for update to authenticated
  using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.submitter_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.submitter_id = auth.uid()
    )
  );

create policy prices_public_select on public.price_observations
  for select to anon, authenticated
  using (
    (
      state in ('provisional', 'verified', 'disputed', 'expired')
      and outlier_held = false
    )
    or created_by = auth.uid()
    or private.is_admin()
    or private.is_market_moderator(market_id)
  );

create policy prices_user_insert on public.price_observations
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and state in ('pending', 'provisional')
  );

create policy prices_moderator_update on public.price_observations
  for update to authenticated
  using (private.is_market_moderator(market_id) or private.is_admin())
  with check (private.is_market_moderator(market_id) or private.is_admin());

create policy confirmations_read on public.price_confirmations
  for select to authenticated
  using (private.is_admin() or confirmer_id = auth.uid());

create policy trust_self_or_mod on public.contributor_trust_events
  for select to authenticated
  using (user_id = auth.uid() or private.is_market_moderator(market_id) or private.is_admin());

create policy flags_insert on public.flags
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy flags_read on public.flags
  for select to authenticated
  using (
    reporter_id = auth.uid()
    or private.is_admin()
    or exists (
      select 1 from public.price_observations o
      where o.id = observation_id and private.is_market_moderator(o.market_id)
    )
  );

create policy moderation_read on public.moderation_actions
  for select to authenticated
  using (private.is_admin() or actor_id = auth.uid());

create policy baskets_owner on public.saved_baskets
  for all to authenticated
  using (owner_id = auth.uid() or is_public = true or private.is_admin())
  with check (owner_id = auth.uid());

create policy basket_items_owner on public.basket_items
  for all to authenticated
  using (
    exists (
      select 1 from public.saved_baskets b
      where b.id = basket_id
        and (b.owner_id = auth.uid() or b.is_public = true or private.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.saved_baskets b
      where b.id = basket_id and b.owner_id = auth.uid()
    )
  );

create policy api_usage_admin on public.api_usage
  for select to authenticated
  using (private.is_admin() or user_id = auth.uid());

create policy audit_admin on public.audit_logs
  for select to authenticated
  using (private.is_admin());

create policy places_cache_mod on public.places_cache
  for select to authenticated
  using (private.is_admin() or private.is_market_moderator(market_id));

create policy market_requests_owner on public.market_requests
  for select to authenticated
  using (organizer_id = auth.uid() or private.is_admin());

create policy market_requests_insert on public.market_requests
  for insert to authenticated
  with check (organizer_id = auth.uid());

grant usage on schema public to anon, authenticated, service_role;

grant select on public.app_settings to anon, authenticated;
grant select on public.countries to anon, authenticated;
grant select on public.regions to anon, authenticated;
grant select on public.markets to anon, authenticated;
grant select on public.stores to anon, authenticated;
grant select on public.store_branches to anon, authenticated;
grant select on public.store_aliases to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_aliases to anon, authenticated;
grant select on public.product_barcodes to anon, authenticated;

grant select (
  id, market_id, branch_id, product_id, price_cents, currency_code,
  quantity, package_size, unit, unit_price_cents, unit_price_basis,
  is_sale, observed_on, confidence, state, evidence_count, stale_labeled, created_at
) on public.price_observations to anon;

grant select (
  id, market_id, branch_id, product_id, price_cents, currency_code,
  quantity, package_size, unit, unit_price_cents, unit_price_basis,
  is_sale, observed_on, confidence, state, evidence_count, stale_labeled,
  outlier_held, created_at
) on public.price_observations to authenticated;

grant insert on public.price_observations to authenticated;
grant update (state, evidence_count, stale_labeled, outlier_held) on public.price_observations to authenticated;
grant select on public.price_board to anon, authenticated;
grant select on public.current_prices to anon, authenticated;
grant select on public.unit_price_comparisons to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.market_memberships to authenticated;
grant select, insert, update on public.receipts to authenticated;
grant select on public.extraction_jobs to authenticated;
grant select, update on public.receipt_items to authenticated;
grant select on public.price_confirmations to authenticated;
grant select on public.contributor_trust_events to authenticated;
grant select, insert on public.flags to authenticated;
grant select on public.moderation_actions to authenticated;
grant select, insert, update, delete on public.saved_baskets to authenticated;
grant select, insert, update, delete on public.basket_items to authenticated;
grant select on public.api_usage to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.places_cache to authenticated;
grant select, insert on public.market_requests to authenticated;

grant usage, select on all sequences in schema public to authenticated, service_role;
grant all on all tables in schema public to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

create policy receipts_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy receipts_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or private.is_admin()
    )
  );

create policy receipts_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'receipts'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'receipts'
    and split_part(name, '/', 1) = auth.uid()::text
  );
