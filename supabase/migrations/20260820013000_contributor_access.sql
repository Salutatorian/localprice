-- Invite-only contributors, access requests, and staff helpers for moderation queues.

create type public.access_status as enum ('pending', 'approved', 'denied');

create table public.invited_emails (
  email citext primary key,
  invited_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  email citext not null,
  village text,
  reason text not null,
  status public.access_status not null default 'pending',
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint access_requests_reason_len check (char_length(reason) between 8 and 500),
  constraint access_requests_village_len check (village is null or char_length(village) <= 80)
);

alter table public.receipts
  add column if not exists first_submission boolean not null default false;

create index if not exists idx_access_requests_status on public.access_requests (status, created_at desc);
create index if not exists idx_receipts_first_queue
  on public.receipts (status, created_at desc)
  where first_submission = true and deleted_at is null;

create or replace function public.is_staff()
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
      where m.user_id = auth.uid()
        and m.role in ('moderator', 'organizer')
    );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated, service_role;

create or replace function public.user_is_admin(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r.is_admin from private.app_roles r where r.user_id = target),
    false
  );
$$;

create or replace function public.grant_app_admin(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.app_roles (user_id, is_admin)
  values (target, true)
  on conflict (user_id) do update set is_admin = true;
end;
$$;

revoke all on function public.user_is_admin(uuid) from public;
revoke all on function public.grant_app_admin(uuid) from public;
grant execute on function public.user_is_admin(uuid) to service_role;
grant execute on function public.grant_app_admin(uuid) to service_role;

drop policy if exists flags_read on public.flags;
create policy flags_read on public.flags
  for select to authenticated
  using (
    reporter_id = auth.uid()
    or public.is_staff()
  );

create policy invited_emails_staff on public.invited_emails
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy access_requests_self_select on public.access_requests
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy access_requests_self_insert on public.access_requests
  for insert to authenticated
  with check (user_id = auth.uid());

alter table public.invited_emails enable row level security;
alter table public.access_requests enable row level security;

grant select, insert, delete on public.invited_emails to authenticated;
grant select, insert on public.access_requests to authenticated;
grant all on public.invited_emails to service_role;
grant all on public.access_requests to service_role;
grant select, insert, update on private.app_roles to service_role;
