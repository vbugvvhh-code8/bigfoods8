-- Anon never writes to these tables.
revoke insert, update, delete, truncate, references, trigger on public.profiles from anon;
revoke insert, update, delete, truncate, references, trigger on public.riders from anon;

-- Signed-in users may edit only harmless profile fields. role, status, blocked,
-- block_reason and starred are admin-only (set through admin functions).
revoke update on public.profiles from authenticated;
grant update (full_name, phone, state, lga) on public.profiles to authenticated;

-- Riders may only change online status and live location.
revoke update on public.riders from authenticated;
grant update (status, lat, lng, last_location_update) on public.riders to authenticated;

-- Exact email lookup for the sign-in functions (replaces listing users).
create or replace function public.auth_user_id_by_email(p_email text)
returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke all on function public.auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;
