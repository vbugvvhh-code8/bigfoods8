-- Preserve the restaurant menu form's full metadata on the separate BigFoods POS catalogue.
alter table public.bigfoods_pos_items
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists ingredients text,
  add column if not exists serving_size text,
  add column if not exists preparation_time_minutes integer,
  add column if not exists stock_quantity integer,
  add column if not exists availability_schedule_enabled boolean not null default false,
  add column if not exists availability_schedule jsonb not null default '[]'::jsonb,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists dietary_tags text[] not null default '{}',
  add column if not exists promotional_price integer,
  add column if not exists promotion_starts_at timestamptz,
  add column if not exists promotion_ends_at timestamptz,
  add column if not exists complementary_item_ids uuid[] not null default '{}',
  add column if not exists option_groups jsonb not null default '[]'::jsonb;

alter table public.bigfoods_pos_items
  add constraint bigfoods_pos_items_stock_nonnegative
    check (stock_quantity is null or stock_quantity >= 0),
  add constraint bigfoods_pos_items_preparation_nonnegative
    check (preparation_time_minutes is null or preparation_time_minutes > 0),
  add constraint bigfoods_pos_items_promo_less_than_price
    check (promotional_price is null or (promotional_price > 0 and promotional_price < selling_price));
