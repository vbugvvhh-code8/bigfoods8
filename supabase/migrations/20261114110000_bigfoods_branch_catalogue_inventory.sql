-- Branch-scoped POS availability and stock foundations.
-- Legacy inventory batches remain unassigned (NULL) and are not silently copied
-- into every branch. New stock receipts/production must select a branch.
alter table public.inventory_batches
  add column if not exists work_location_id uuid references public.bigfoods_staff_work_locations(id) on delete restrict;
create index if not exists inventory_batches_branch_item_fefo_idx
  on public.inventory_batches(work_location_id, inventory_item_id, expires_at, received_at, id)
  where status = 'active' and remaining_quantity > 0;

alter table public.inventory_production_batches
  add column if not exists work_location_id uuid references public.bigfoods_staff_work_locations(id) on delete restrict;
create index if not exists inventory_production_batches_branch_status_idx
  on public.inventory_production_batches(work_location_id, status, started_at desc);

alter table public.inventory_kitchen_preparations
  add column if not exists work_location_id uuid references public.bigfoods_staff_work_locations(id) on delete restrict;
create index if not exists inventory_kitchen_preparations_branch_queue_idx
  on public.inventory_kitchen_preparations(work_location_id, status, requested_at desc);

-- A branch must explicitly opt a POS item into its catalogue. Prices can be
-- overridden per branch; otherwise the canonical POS selling price is used.
create table if not exists public.bigfoods_pos_branch_items (
  id uuid primary key default gen_random_uuid(),
  work_location_id uuid not null references public.bigfoods_staff_work_locations(id) on delete cascade,
  pos_item_id uuid not null references public.bigfoods_pos_items(id) on delete restrict,
  is_available boolean not null default true,
  selling_price numeric(14,2) check (selling_price is null or selling_price >= 0),
  sort_order integer not null default 0,
  created_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  updated_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(work_location_id, pos_item_id)
);
create index if not exists bigfoods_pos_branch_items_catalogue_idx
  on public.bigfoods_pos_branch_items(work_location_id, is_available, sort_order, pos_item_id);

-- Prepared menu portions are branch-specific. This is deliberately separate
-- from ingredient batches and from the legacy global POS stock columns.
create table if not exists public.bigfoods_pos_branch_menu_stock (
  work_location_id uuid not null references public.bigfoods_staff_work_locations(id) on delete cascade,
  pos_item_id uuid not null references public.bigfoods_pos_items(id) on delete restrict,
  track_stock boolean not null default true,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_alert integer not null default 10 check (low_stock_alert >= 0),
  updated_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(work_location_id, pos_item_id)
);

alter table public.bigfoods_pos_branch_items enable row level security;
alter table public.bigfoods_pos_branch_menu_stock enable row level security;

comment on column public.inventory_batches.work_location_id is
  'Branch holding this ingredient batch. NULL denotes legacy/unallocated stock and must not be assumed available to a branch.';
comment on column public.inventory_production_batches.work_location_id is
  'Branch where this production batch was processed.';
comment on column public.inventory_kitchen_preparations.work_location_id is
  'Branch whose ingredient batches are consumed and whose POS menu stock receives the finished portions.';
comment on table public.bigfoods_pos_branch_items is
  'Branch-specific catalogue inclusion and optional selling price override for BigFoods POS items.';
comment on table public.bigfoods_pos_branch_menu_stock is
  'Branch-specific prepared portions; intentionally separate from global legacy POS stock and raw ingredient batches.';
