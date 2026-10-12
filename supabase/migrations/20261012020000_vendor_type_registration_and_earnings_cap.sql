-- Vendor type (restaurant / home kitchen), business registration status and
-- the lifetime earnings cap for unregistered vendors.
-- Owners cannot UPDATE restaurants directly (no owner UPDATE policy), so these
-- columns can only be changed by service-role edge functions and admins.

alter table public.restaurants
  add column vendor_type text not null default 'restaurant'
    check (vendor_type in ('restaurant', 'home_kitchen')),
  add column registration_status text not null default 'unregistered'
    check (registration_status in ('registered', 'unregistered'));

-- Private registration details (restaurant_owner_details is already locked to
-- owner/admin read, service-role write).
alter table public.restaurant_owner_details
  add column cac_number text,
  add column registration_verified_at timestamptz,
  add column registration_verified_by uuid references auth.users(id);

-- Cap is configurable by admins through pricing_config.
insert into public.pricing_config (key, value, description) values
  ('unregistered_earnings_cap', 10000000,
   'Lifetime food sales (naira) an unregistered vendor can withdraw before CAC registration is required');

-- Lifetime food sales = sum of subtotal on delivered orders (delivery fee and
-- tips are rider money and are excluded).
create or replace function public.restaurant_lifetime_sales(rid uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(subtotal), 0)
  from public.orders
  where restaurant_id = rid and status = 'delivered';
$$;
revoke all on function public.restaurant_lifetime_sales(uuid) from public, anon, authenticated;
grant execute on function public.restaurant_lifetime_sales(uuid) to service_role;

-- Which reminder thresholds (50/80/95/100 percent of the cap) have been sent,
-- so nobody is emailed twice for the same milestone.
create table public.vendor_cap_notices (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  threshold int not null check (threshold in (50, 80, 95, 100)),
  sent_at timestamptz not null default now(),
  primary key (restaurant_id, threshold)
);
alter table public.vendor_cap_notices enable row level security;
create policy "Admins read cap notices" on public.vendor_cap_notices
  for select using (is_admin());
-- No other policies: only service-role functions write to this table.
