-- Optional inventory tracking for menu items. NULL means stock is not tracked.
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS stock_quantity integer NULL,
  ADD COLUMN IF NOT EXISTS stock_reserved integer NOT NULL DEFAULT 0;
ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_stock_quantity_nonnegative,
  DROP CONSTRAINT IF EXISTS menu_items_stock_reserved_nonnegative;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_stock_quantity_nonnegative
    CHECK (stock_quantity IS NULL OR stock_quantity >= 0),
  ADD CONSTRAINT menu_items_stock_reserved_nonnegative
    CHECK (stock_reserved >= 0);
