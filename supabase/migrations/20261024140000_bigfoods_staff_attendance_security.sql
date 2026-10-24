-- Task 11 Phase 2: attendance verification support.
-- QR challenges are short-lived, single-use tokens; only hashes are stored.
create table if not exists public.bigfoods_staff_qr_challenges (
  id uuid primary key default gen_random_uuid(),
  work_location_id uuid not null references public.bigfoods_staff_work_locations(id) on delete cascade,
  token_hash text not null unique,
  issued_by uuid not null references public.bigfoods_staff(id) on delete restrict,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (expires_at > issued_at)
);
create index if not exists bigfoods_staff_qr_challenges_location_expiry_idx
  on public.bigfoods_staff_qr_challenges (work_location_id, expires_at desc);
alter table public.bigfoods_staff_qr_challenges enable row level security;
-- No client-facing policies: access only through the trusted staff operations Edge Function.
