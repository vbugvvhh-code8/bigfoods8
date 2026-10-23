-- Prepaid meal subscriptions with customer-selected weekly delivery days.
create table if not exists public.meal_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  package_weeks integer not null check (package_weeks between 1 and 12),
  delivery_days integer[] not null check (cardinality(delivery_days) between 1 and 7),
  delivery_time text not null default 'lunch' check (delivery_time in ('breakfast','lunch','dinner')),
  selected_items jsonb not null check (jsonb_typeof(selected_items) = 'array' and jsonb_array_length(selected_items) > 0),
  total_deliveries integer not null check (total_deliveries > 0),
  total_amount numeric(12,2) not null check (total_amount > 0),
  currency text not null default 'NGN',
  status text not null default 'pending_payment' check (status in ('pending_payment','active','paused','completed','cancelled','payment_failed')),
  payment_reference text unique,
  paid_at timestamptz,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scheduled_dates date[] not null default '{}'::date[]
);

create table if not exists public.meal_subscription_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.meal_subscriptions(id) on delete cascade,
  scheduled_for date not null,
  delivery_time text not null check (delivery_time in ('breakfast','lunch','dinner')),
  status text not null default 'scheduled' check (status in ('scheduled','order_created','delivered','skipped','cancelled')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(subscription_id, scheduled_for, delivery_time)
);

create index if not exists meal_subscriptions_customer_status_idx on public.meal_subscriptions(customer_id,status,created_at desc);
create index if not exists meal_subscriptions_restaurant_status_idx on public.meal_subscriptions(restaurant_id,status);
create index if not exists meal_subscription_deliveries_schedule_idx on public.meal_subscription_deliveries(scheduled_for,status);

alter table public.meal_subscriptions enable row level security;
alter table public.meal_subscription_deliveries enable row level security;

drop policy if exists meal_subscriptions_customer_select on public.meal_subscriptions;
create policy meal_subscriptions_customer_select on public.meal_subscriptions for select to authenticated using (customer_id = auth.uid());
drop policy if exists meal_subscriptions_customer_insert on public.meal_subscriptions;
create policy meal_subscriptions_customer_insert on public.meal_subscriptions for insert to authenticated with check (customer_id = auth.uid() and status = 'pending_payment');
drop policy if exists meal_subscriptions_restaurant_select on public.meal_subscriptions;
create policy meal_subscriptions_restaurant_select on public.meal_subscriptions for select to authenticated using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));
drop policy if exists meal_subscriptions_admin_select on public.meal_subscriptions;
create policy meal_subscriptions_admin_select on public.meal_subscriptions for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','super_admin')));

drop policy if exists subscription_deliveries_customer_select on public.meal_subscription_deliveries;
create policy subscription_deliveries_customer_select on public.meal_subscription_deliveries for select to authenticated using (exists (select 1 from public.meal_subscriptions s where s.id = subscription_id and s.customer_id = auth.uid()));
drop policy if exists subscription_deliveries_restaurant_select on public.meal_subscription_deliveries;
create policy subscription_deliveries_restaurant_select on public.meal_subscription_deliveries for select to authenticated using (exists (select 1 from public.meal_subscriptions s join public.restaurants r on r.id=s.restaurant_id where s.id=subscription_id and r.owner_id=auth.uid()));

grant select, insert on public.meal_subscriptions to authenticated;
revoke update on public.meal_subscriptions from authenticated;
grant select on public.meal_subscription_deliveries to authenticated;

-- Persist the selected address and pricing components used for the prepaid quote.
alter table public.meal_subscriptions add column if not exists saved_address_id uuid references public.saved_addresses(id) on delete set null;
alter table public.meal_subscriptions add column if not exists delivery_address text;
alter table public.meal_subscriptions add column if not exists delivery_lat numeric;
alter table public.meal_subscriptions add column if not exists delivery_lng numeric;
alter table public.meal_subscriptions add column if not exists delivery_note text;
alter table public.meal_subscriptions add column if not exists meal_subtotal_per_delivery numeric(12,2) not null default 0;
alter table public.meal_subscriptions add column if not exists platform_fee_per_delivery numeric(12,2) not null default 0;
alter table public.meal_subscriptions add column if not exists delivery_fee_per_delivery numeric(12,2) not null default 0;
alter table public.meal_subscriptions add column if not exists delivery_distance_km numeric(10,3);

drop policy if exists subscription_deliveries_admin_select on public.meal_subscription_deliveries;
create policy subscription_deliveries_admin_select on public.meal_subscription_deliveries for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','super_admin'))
);
