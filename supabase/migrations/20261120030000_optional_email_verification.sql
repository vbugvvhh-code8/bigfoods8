-- Track BigFoods application-level email verification independently of Supabase Auth.
-- Supabase Auth accounts are confirmed during account bootstrap so users can establish
-- a session; this column remains false until the user completes the OTP challenge.
alter table public.profiles
  add column if not exists email_verified boolean not null default false;

-- Backfill existing accounts from the authoritative Auth confirmation timestamp.
update public.profiles p
set email_verified = (u.email_confirmed_at is not null)
from auth.users u
where u.id = p.id;
