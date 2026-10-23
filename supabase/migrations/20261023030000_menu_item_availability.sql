-- Add an explicit menu-item availability flag.
-- Existing items remain orderable by default; restaurants can mark items unavailable.
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.menu_items.is_available IS
  'Whether customers may order this menu item. Checkout must enforce this server-side.';
