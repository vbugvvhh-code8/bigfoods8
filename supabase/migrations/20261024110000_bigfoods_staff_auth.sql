-- BigFoods central staff identity and custom sessions.
-- This migration does not create, migrate, or modify customer/restaurant/rider auth.
create table if not exists public.bigfoods_staff (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  role text not null check (role in ('owner','admin','manager','inventory','pos','support','auditor')),
  permissions jsonb not null default '[]'::jsonb check (jsonb_typeof(permissions) = 'array'),
  password_hash text not null,
  password_salt text not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  failed_login_count integer not null default 0 check (failed_login_count >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  created_by uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists bigfoods_staff_email_lower_uidx on public.bigfoods_staff (lower(email));
create table if not exists public.bigfoods_staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.bigfoods_staff(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  user_agent text,
  ip_hash text
);
create index if not exists bigfoods_staff_sessions_staff_active_idx on public.bigfoods_staff_sessions (staff_id, expires_at) where revoked_at is null;
create index if not exists bigfoods_staff_sessions_expiry_idx on public.bigfoods_staff_sessions (expires_at);
create table if not exists public.bigfoods_staff_login_attempts (
  id bigint generated always as identity primary key,
  email_key text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);
create index if not exists bigfoods_staff_login_attempts_recent_idx on public.bigfoods_staff_login_attempts (email_key, attempted_at desc);
create table if not exists public.bigfoods_staff_audit_events (
  id bigint generated always as identity primary key,
  actor_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  action text not null,
  subject_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bigfoods_staff_audit_events_created_idx on public.bigfoods_staff_audit_events (created_at desc);
alter table public.bigfoods_staff enable row level security;
alter table public.bigfoods_staff_sessions enable row level security;
alter table public.bigfoods_staff_login_attempts enable row level security;
alter table public.bigfoods_staff_audit_events enable row level security;
-- Intentionally no client-facing policies. Trusted server-side operations only.
