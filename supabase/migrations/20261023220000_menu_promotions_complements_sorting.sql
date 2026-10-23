ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS promotional_price integer,
  ADD COLUMN IF NOT EXISTS promotion_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS promotion_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS complementary_item_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_promotional_price_valid
    CHECK (promotional_price IS NULL OR (promotional_price > 0 AND promotional_price < price));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_promotion_window_valid
    CHECK (promotion_starts_at IS NULL OR promotion_ends_at IS NULL OR promotion_ends_at > promotion_starts_at);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS menu_items_restaurant_display_order_idx
  ON public.menu_items (restaurant_id, display_order, created_at);
