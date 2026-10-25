-- BigFoods in-house POS catalogue, isolated from restaurant-owned menu_items.
create table if not exists public.bigfoods_pos_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  description text,
  category text not null default 'Meals',
  subcategory text,
  selling_price numeric(14,2) not null default 0 check (selling_price >= 0),
  image_url text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  updated_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bigfoods_pos_items_name_nonempty check (length(trim(name)) > 0)
);
create unique index if not exists bigfoods_pos_items_sku_uidx
  on public.bigfoods_pos_items (lower(sku)) where sku is not null;
create index if not exists bigfoods_pos_items_available_idx
  on public.bigfoods_pos_items (is_available, category, sort_order, name);

alter table public.inventory_recipes
  add column if not exists bigfoods_pos_item_id uuid references public.bigfoods_pos_items(id) on delete restrict;
create index if not exists inventory_recipes_bigfoods_pos_effective_idx
  on public.inventory_recipes (bigfoods_pos_item_id, effective_from desc);

alter table public.bigfoods_pos_items enable row level security;
-- No browser policies: access is mediated by the authenticated BigFoods staff Edge Function.
