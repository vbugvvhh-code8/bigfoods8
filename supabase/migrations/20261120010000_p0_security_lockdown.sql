-- P0 security lockdown (audit 2026-11-20).
-- S1/S2: clients may no longer write orders/order_items directly, except the
--        restaurant "start preparing" status change, which is checked below.
-- S3:    views run with the caller's permissions and are read-only.
-- S4:    kitchen preparation tables get RLS and lose anon/authenticated grants.
-- S5/S8: staff-actor RPCs and trigger functions are not callable over the API.
-- S11:   riders are no longer readable by the public. Customers and restaurant
--        owners can still see the rider on their own orders (phase 1). Phase 2
--        (20261120020000) removes that direct access once the app uses
--        order_rider_public().


-- ---------------------------------------------------------------------------
-- S1/S2 orders and order_items
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate on public.orders from anon, authenticated;
revoke insert, update, delete, truncate on public.order_items from anon, authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "Customers can create their own orders" on public.orders;
drop policy if exists "Riders can update own orders" on public.orders;
drop policy if exists "Customers can insert items on their own orders" on public.order_items;

create or replace function public.guard_order_client_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Edge functions (service_role), cron and admins are not restricted here.
  if coalesce(auth.role(), '') <> 'authenticated' or public.is_admin() then
    return new;
  end if;
  if new.status is distinct from old.status
     and not (old.status = 'placed' and new.status = 'preparing' and old.payment_status = 'paid') then
    raise exception 'This order status change is not allowed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_order_client_update on public.orders;
create trigger guard_order_client_update
  before update on public.orders
  for each row execute function public.guard_order_client_update();

-- ---------------------------------------------------------------------------
-- S3 views
-- ---------------------------------------------------------------------------
alter view public.visible_restaurants set (security_invoker = true);
alter view public.visible_riders set (security_invoker = true);
alter view public.visible_menu_items set (security_invoker = true);
alter view public.visible_orders set (security_invoker = true);
alter view public.orders_trend_14d set (security_invoker = true);
alter view public.cancellation_rate_weekly set (security_invoker = true);
alter view public.zone_activity set (security_invoker = true);
alter view public.dashboard_kpis_today set (security_invoker = true);
alter view public.revenue_breakdown_this_month set (security_invoker = true);
alter view public.pending_restaurant_applications set (security_invoker = true);
alter view public.pending_rider_applications set (security_invoker = true);

do $$
declare v record;
begin
  for v in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'v'
  loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon, authenticated', v.relname);
  end loop;
end $$;

-- Admin-only views: nothing for logged-out visitors.
revoke select on public.visible_orders, public.visible_riders, public.orders_trend_14d,
  public.cancellation_rate_weekly, public.zone_activity, public.dashboard_kpis_today,
  public.revenue_breakdown_this_month, public.pending_restaurant_applications,
  public.pending_rider_applications from anon;

-- ---------------------------------------------------------------------------
-- S4 kitchen preparation tables (used only by service-role edge functions)
-- ---------------------------------------------------------------------------
alter table public.inventory_kitchen_preparations enable row level security;
alter table public.inventory_kitchen_preparation_consumptions enable row level security;
revoke all on public.inventory_kitchen_preparations from anon, authenticated;
revoke all on public.inventory_kitchen_preparation_consumptions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- S5/S8 functions: staff-actor RPCs and trigger functions are service-only.
-- (Trigger functions still fire; EXECUTE is only checked when called directly.)
-- bigfoods_pos_rider_* stay callable by signed-in riders.
-- ---------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and (
        (p.proname ~ '^bigfoods_(inventory|kitchen|staff|pos)_' and p.proname !~ '^bigfoods_pos_rider_'
           and p.proname <> 'bigfoods_pos_point_in_branch')
        or p.prorettype = 'trigger'::regtype
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- S11 riders: no public read
-- ---------------------------------------------------------------------------
drop policy if exists "Public can view non-seed or currently-visible riders" on public.riders;

-- Phase 1 only: the live app still reads the assigned rider directly.
-- A security-definer helper avoids riders <-> orders policy recursion.
create or replace function public.my_order_rider_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct o.rider_id from public.orders o
  where o.rider_id is not null
    and (o.customer_id = auth.uid()
         or o.restaurant_id in (select r.id from public.restaurants r where r.owner_id = auth.uid()));
$$;
revoke execute on function public.my_order_rider_ids() from public, anon;
grant execute on function public.my_order_rider_ids() to authenticated, service_role;

create policy "Order parties can view assigned rider (phase 1)"
  on public.riders for select to authenticated
  using (id in (select public.my_order_rider_ids()));

-- Safe rider details for the customer, the restaurant owner, or an admin.
create or replace function public.order_rider_public(p_order_ids uuid[])
returns table (
  order_id uuid, rider_id uuid, name text, phone text, vehicle_type text,
  plate_number text, lat double precision, lng double precision, last_location_update timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, r.id, r.name::text, r.phone::text, r.vehicle_type::text, r.plate_number::text,
         r.lat::double precision, r.lng::double precision, r.last_location_update::timestamptz
  from public.orders o
  join public.riders r on r.id = o.rider_id
  where o.id = any (p_order_ids)
    and cardinality(p_order_ids) <= 200
    and (
      o.customer_id = auth.uid()
      or exists (select 1 from public.restaurants x where x.id = o.restaurant_id and x.owner_id = auth.uid())
      or public.is_admin()
    );
$$;
revoke execute on function public.order_rider_public(uuid[]) from public, anon;
grant execute on function public.order_rider_public(uuid[]) to authenticated, service_role;

-- Distance to the nearest dispatchable rider in a zone, without exposing riders.
create or replace function public.nearest_online_rider_km(p_lat double precision, p_lng double precision, p_zone text)
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select min(
    6371 * 2 * asin(sqrt(
      power(sin(radians(r.lat - p_lat) / 2), 2)
      + cos(radians(p_lat)) * cos(radians(r.lat)) * power(sin(radians(r.lng - p_lng) / 2), 2)
    ))
  )
  from public.riders r
  where r.zone = trim(p_zone)
    and r.status = 'online' and r.approval_status = 'approved'
    and r.waiver_completed and not r.dispatch_disabled
    and r.lat is not null and r.lng is not null;
$$;
revoke execute on function public.nearest_online_rider_km(double precision, double precision, text) from public, anon;
grant execute on function public.nearest_online_rider_km(double precision, double precision, text) to authenticated, service_role;

