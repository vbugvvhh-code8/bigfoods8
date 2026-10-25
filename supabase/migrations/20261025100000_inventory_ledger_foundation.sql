-- BigFoods Task 10, Phase 1: inventory ledger foundation.
-- Additive only: keeps menu_items stock/reservations separate from ingredient inventory.
-- All writes should be performed by trusted server/Edge Functions using the staff session
-- validator and explicit permission checks. No browser-facing policies are granted here.

create extension if not exists pgcrypto;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  category text not null default 'ingredient',
  tracking_type text not null default 'weight'
    check (tracking_type in ('weight','volume','count')),
  base_unit text not null,
  reorder_level numeric(14,4) not null default 0 check (reorder_level >= 0),
  is_perishable boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  updated_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_name_nonempty check (length(trim(name)) > 0),
  constraint inventory_items_unit_nonempty check (length(trim(base_unit)) > 0)
);
create unique index if not exists inventory_items_sku_uidx
  on public.inventory_items (lower(sku)) where sku is not null;
create index if not exists inventory_items_active_name_idx
  on public.inventory_items (is_active, name);

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  batch_code text not null,
  supplier_name text,
  supplier_reference text,
  received_quantity numeric(14,4) not null check (received_quantity > 0),
  remaining_quantity numeric(14,4) not null check (remaining_quantity >= 0 and remaining_quantity <= received_quantity),
  base_unit text not null,
  unit_cost numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  currency char(3) not null default 'NGN',
  received_at timestamptz not null default now(),
  expires_at date,
  status text not null default 'active'
    check (status in ('active','depleted','finished','expired','quarantined')),
  received_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  finished_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  finished_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint inventory_batch_code_nonempty check (length(trim(batch_code)) > 0),
  constraint inventory_batch_expiry_after_receipt check (expires_at is null or expires_at >= received_at::date)
);
create index if not exists inventory_batches_item_status_idx
  on public.inventory_batches (inventory_item_id, status, received_at);
create index if not exists inventory_batches_expiry_idx
  on public.inventory_batches (expires_at) where status = 'active';

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  batch_id uuid references public.inventory_batches(id) on delete restrict,
  movement_type text not null check (movement_type in (
    'receipt','production_input','production_output','sale_usage','waste',
    'transfer_in','transfer_out','count_adjustment','return','opening_balance'
  )),
  quantity numeric(14,4) not null check (quantity > 0),
  direction text not null check (direction in ('in','out')),
  base_unit text not null,
  unit_cost numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  reason text not null,
  source_type text,
  source_id text,
  actor_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  approved_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint inventory_movement_reason_nonempty check (length(trim(reason)) > 0),
  constraint inventory_movement_source_pair check ((source_type is null) = (source_id is null))
);
create index if not exists inventory_movements_item_time_idx
  on public.inventory_movements (inventory_item_id, occurred_at desc);
create index if not exists inventory_movements_batch_time_idx
  on public.inventory_movements (batch_id, occurred_at desc) where batch_id is not null;
create index if not exists inventory_movements_source_idx
  on public.inventory_movements (source_type, source_id) where source_type is not null;
create index if not exists inventory_movements_actor_time_idx
  on public.inventory_movements (actor_staff_id, occurred_at desc);

-- Recipes are versioned so historical sales can be reconciled against the recipe
-- that was actually in force at the time, rather than today's recipe.
create table if not exists public.inventory_recipes (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid references public.menu_items(id) on delete restrict,
  name text not null,
  version integer not null default 1 check (version > 0),
  output_quantity numeric(14,4) not null default 1 check (output_quantity > 0),
  output_unit text not null default 'portion',
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  is_active boolean not null default true,
  created_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint inventory_recipe_effective_range check (effective_until is null or effective_until > effective_from),
  constraint inventory_recipe_name_nonempty check (length(trim(name)) > 0),
  unique (name, version)
);
create index if not exists inventory_recipes_menu_effective_idx
  on public.inventory_recipes (menu_item_id, effective_from desc);

create table if not exists public.inventory_recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.inventory_recipes(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (recipe_id, inventory_item_id)
);
create index if not exists inventory_recipe_items_item_idx
  on public.inventory_recipe_items (inventory_item_id);

create table if not exists public.inventory_production_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  input_inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  input_batch_id uuid references public.inventory_batches(id) on delete restrict,
  raw_input_quantity numeric(14,4) not null check (raw_input_quantity > 0),
  raw_input_unit text not null,
  output_inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  output_quantity numeric(14,4) check (output_quantity is null or output_quantity >= 0),
  output_unit text not null,
  unprocessed_quantity numeric(14,4) not null default 0 check (unprocessed_quantity >= 0),
  allowed_loss_quantity numeric(14,4) not null default 0 check (allowed_loss_quantity >= 0),
  actual_loss_quantity numeric(14,4) check (actual_loss_quantity is null or actual_loss_quantity >= 0),
  variance_quantity numeric(14,4),
  status text not null default 'in_progress'
    check (status in ('in_progress','pending_review','confirmed','escalated','cancelled')),
  started_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  finished_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  constraint production_batch_code_nonempty check (length(trim(batch_code)) > 0)
);
create index if not exists inventory_production_status_time_idx
  on public.inventory_production_batches (status, started_at desc);

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  count_code text not null unique,
  scope text not null default 'item' check (scope in ('item','location','full')),
  status text not null default 'in_progress'
    check (status in ('in_progress','submitted','pending_review','approved','rejected')),
  counted_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.inventory_counts(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  expected_quantity numeric(14,4) not null check (expected_quantity >= 0),
  counted_quantity numeric(14,4) check (counted_quantity is null or counted_quantity >= 0),
  variance_quantity numeric(14,4),
  base_unit text not null,
  variance_reason text,
  created_at timestamptz not null default now(),
  unique (count_id, inventory_item_id)
);
create index if not exists inventory_count_items_item_idx
  on public.inventory_count_items (inventory_item_id);

create table if not exists public.inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid references public.inventory_items(id) on delete restrict,
  batch_id uuid references public.inventory_batches(id) on delete restrict,
  production_batch_id uuid references public.inventory_production_batches(id) on delete restrict,
  alert_type text not null check (alert_type in (
    'low_stock','yield_fast','yield_slow','large_variance','unfinished_batch',
    'expiry_approaching','expired_stock','count_variance','reconciliation_gap'
  )),
  severity text not null default 'warning' check (severity in ('info','warning','critical')),
  status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  assigned_to_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  resolved_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint inventory_alert_title_nonempty check (length(trim(title)) > 0)
);
create index if not exists inventory_alerts_open_time_idx
  on public.inventory_alerts (status, severity, created_at desc);
create index if not exists inventory_alerts_item_idx
  on public.inventory_alerts (inventory_item_id, created_at desc) where inventory_item_id is not null;

-- Inventory history is immutable: correct a mistake with a compensating movement,
-- never by editing or deleting the original record.
create or replace function public.prevent_inventory_movement_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Inventory movements are immutable; create a compensating movement instead.';
end;
$$;

drop trigger if exists inventory_movements_immutable on public.inventory_movements;
create trigger inventory_movements_immutable
before update or delete on public.inventory_movements
for each row execute function public.prevent_inventory_movement_mutation();

-- Staff custom sessions are validated by the existing server-side staff session
-- service. No direct anon/authenticated grants are introduced by this migration.
alter table public.inventory_items enable row level security;
alter table public.inventory_batches enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_recipes enable row level security;
alter table public.inventory_recipe_items enable row level security;
alter table public.inventory_production_batches enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.inventory_count_items enable row level security;
alter table public.inventory_alerts enable row level security;

comment on table public.inventory_items is 'Inventory catalogue; separate from menu-item availability/reservations.';
comment on table public.inventory_batches is 'Receipt-level batch and expiry tracking; quantity changes must be paired with movements.';
comment on table public.inventory_movements is 'Append-only inventory audit ledger. Writes must be performed by trusted authorized server functions.';
comment on table public.inventory_recipes is 'Versioned recipe definitions for expected-usage reconciliation.';
comment on table public.inventory_production_batches is 'Raw input/output production yield and variance reconciliation.';
comment on table public.inventory_counts is 'Physical inventory count sessions and review workflow.';
comment on table public.inventory_alerts is 'Inventory exceptions and actionable alerts.';
