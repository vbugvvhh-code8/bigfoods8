-- Big Foods Task 10: inventory and anti-theft reconciliation foundation.
-- Phase 1: schema only. Runtime writes must go through authenticated server-side
-- operations using the existing BigFoods staff session and service-role client.
-- No stock is seeded and no existing menu stock/order data is modified.

create extension if not exists pgcrypto;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  category text not null default 'ingredient'
    check (category in ('ingredient','beverage','packaged','prepared','other')),
  tracking_method text not null default 'quantity'
    check (tracking_method in ('quantity','weight','volume')),
  base_unit text not null,
  reorder_level numeric(14,3) not null default 0 check (reorder_level >= 0),
  is_perishable boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0),
  check (length(trim(base_unit)) > 0)
);

create index if not exists inventory_items_active_name_idx
  on public.inventory_items (is_active, name);

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  batch_code text not null,
  supplier_name text,
  supplier_reference text,
  received_at timestamptz not null default now(),
  received_quantity numeric(14,3) not null check (received_quantity > 0),
  unit text not null,
  unit_cost numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  currency_code char(3) not null default 'NGN',
  expiry_date date,
  status text not null default 'active'
    check (status in ('active','depleted','expired','quarantined','finished')),
  received_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (inventory_item_id, batch_code),
  check (length(trim(batch_code)) > 0),
  check (length(trim(unit)) > 0),
  check (not (expiry_date is not null and expiry_date < received_at::date) or status in ('expired','quarantined'))
);

create index if not exists inventory_batches_item_status_idx
  on public.inventory_batches (inventory_item_id, status, received_at);
create index if not exists inventory_batches_expiry_idx
  on public.inventory_batches (expiry_date) where expiry_date is not null;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  batch_id uuid references public.inventory_batches(id) on delete restrict,
  movement_type text not null
    check (movement_type in (
      'opening_balance','receipt','production_input','production_output',
      'sale_usage','waste','count_adjustment','transfer_in','transfer_out',
      'return_in','return_out','expiry_writeoff'
    )),
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  unit text not null,
  reason_code text,
  reason text,
  source_type text,
  source_id text,
  actor_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  check (length(trim(unit)) > 0),
  check (reason is null or length(trim(reason)) > 0),
  check (
    movement_type not in ('waste','expiry_writeoff','count_adjustment')
    or (reason_code is not null and length(trim(reason_code)) > 0)
  )
);

create index if not exists inventory_movements_item_time_idx
  on public.inventory_movements (inventory_item_id, occurred_at desc);
create index if not exists inventory_movements_batch_idx
  on public.inventory_movements (batch_id, occurred_at desc) where batch_id is not null;
create index if not exists inventory_movements_source_idx
  on public.inventory_movements (source_type, source_id) where source_id is not null;
create index if not exists inventory_movements_actor_time_idx
  on public.inventory_movements (actor_staff_id, occurred_at desc);

create table if not exists public.inventory_recipes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid references public.menu_items(id) on delete restrict,
  name text not null,
  version integer not null default 1 check (version > 0),
  yield_quantity numeric(14,3) not null default 1 check (yield_quantity > 0),
  yield_unit text not null default 'serving',
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  created_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (menu_item_id, version),
  check (length(trim(name)) > 0),
  check (effective_until is null or effective_until > effective_from)
);

create index if not exists inventory_recipes_menu_active_idx
  on public.inventory_recipes (menu_item_id, is_active, effective_from desc);

create table if not exists public.inventory_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.inventory_recipes(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null,
  preparation_loss_percent numeric(5,2) not null default 0
    check (preparation_loss_percent >= 0 and preparation_loss_percent <= 100),
  created_at timestamptz not null default now(),
  unique (recipe_id, inventory_item_id),
  check (length(trim(unit)) > 0)
);

create index if not exists inventory_recipe_items_item_idx
  on public.inventory_recipe_items (inventory_item_id);

create table if not exists public.inventory_production_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  output_inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  status text not null default 'in_progress'
    check (status in ('in_progress','awaiting_review','completed','escalated','cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  raw_input_quantity numeric(14,3) not null check (raw_input_quantity > 0),
  raw_input_unit text not null,
  output_quantity numeric(14,3) check (output_quantity is null or output_quantity >= 0),
  output_unit text not null,
  unprocessed_remainder numeric(14,3) not null default 0 check (unprocessed_remainder >= 0),
  allowed_loss_quantity numeric(14,3) not null default 0 check (allowed_loss_quantity >= 0),
  actual_loss_quantity numeric(14,3) check (actual_loss_quantity is null or actual_loss_quantity >= 0),
  variance_quantity numeric(14,3),
  variance_tolerance numeric(14,3) not null default 0 check (variance_tolerance >= 0),
  started_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  finished_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_at timestamptz,
  variance_explanation text,
  created_at timestamptz not null default now(),
  check (length(trim(batch_code)) > 0),
  check (length(trim(raw_input_unit)) > 0 and length(trim(output_unit)) > 0),
  check (finished_at is null or finished_at >= started_at)
);

create index if not exists inventory_production_status_time_idx
  on public.inventory_production_batches (status, started_at desc);

create table if not exists public.inventory_production_inputs (
  id uuid primary key default gen_random_uuid(),
  production_batch_id uuid not null references public.inventory_production_batches(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  source_batch_id uuid references public.inventory_batches(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null,
  created_at timestamptz not null default now(),
  check (length(trim(unit)) > 0)
);

create index if not exists inventory_production_inputs_batch_idx
  on public.inventory_production_inputs (production_batch_id);

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  count_code text not null unique,
  status text not null default 'in_progress'
    check (status in ('in_progress','submitted','awaiting_review','approved','rejected','cancelled')),
  scope text not null default 'full'
    check (scope in ('full','category','selected_items')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  counted_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  check (length(trim(count_code)) > 0)
);

create index if not exists inventory_counts_status_time_idx
  on public.inventory_counts (status, started_at desc);

create table if not exists public.inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inventory_counts(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  expected_quantity numeric(14,3) not null,
  counted_quantity numeric(14,3) check (counted_quantity is null or counted_quantity >= 0),
  unit text not null,
  variance_quantity numeric(14,3),
  explanation text,
  created_at timestamptz not null default now(),
  unique (count_id, inventory_item_id),
  check (length(trim(unit)) > 0)
);

create table if not exists public.inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid references public.inventory_items(id) on delete restrict,
  batch_id uuid references public.inventory_batches(id) on delete restrict,
  production_batch_id uuid references public.inventory_production_batches(id) on delete restrict,
  alert_type text not null
    check (alert_type in (
      'low_stock','yield_variance','count_variance','unfinished_batch',
      'expiry_approaching','expired_stock','new_stock_before_old_finished','other'
    )),
  severity text not null default 'warning' check (severity in ('info','warning','high','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved','escalated')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  assigned_to_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  resolved_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  resolution_note text,
  check (length(trim(title)) > 0)
);

create index if not exists inventory_alerts_open_time_idx
  on public.inventory_alerts (status, severity, created_at desc);
create index if not exists inventory_alerts_item_idx
  on public.inventory_alerts (inventory_item_id, created_at desc) where inventory_item_id is not null;

-- Keep update timestamps database-managed for editable catalogue records.
create or replace function public.inventory_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function public.inventory_set_updated_at();

-- Protect inventory tables from direct browser/API access by default.
-- The existing staff session is custom (not Supabase Auth), so all reads/writes
-- are intentionally routed through server-side handlers that validate that
-- session and use the service-role client. Add no permissive client policies.
alter table public.inventory_items enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_recipes enable row level security;
alter table public.inventory_recipe_items enable row level security;
alter table public.inventory_production_batches enable row level security;
alter table public.inventory_production_inputs enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.inventory_count_items enable row level security;
alter table public.inventory_alerts enable row level security;

comment on table public.inventory_movements is
  'Append-only inventory event ledger. Do not edit or delete posted movements; correct errors with compensating movements.';
comment on table public.inventory_batches is
  'Receipt batches preserve supplier, unit cost, receipt time and expiry for traceability and FIFO.';
comment on table public.inventory_production_batches is
  'Production yield and variance records; cross-unit conversions must be validated by application/domain logic before completion.';
