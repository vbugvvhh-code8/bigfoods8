DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.menu_items'::regclass
      AND conname = 'menu_items_name_nonblank'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_name_nonblank
      CHECK (length(btrim(name)) > 0);
  END IF;
END $$;

-- A restaurant cannot accidentally create the same dish more than once using
-- different capitalization or leading/trailing spaces. Names may still repeat
-- across different restaurants.
CREATE UNIQUE INDEX IF NOT EXISTS menu_items_restaurant_normalized_name_uidx
  ON public.menu_items (restaurant_id, lower(btrim(name)));

COMMENT ON INDEX public.menu_items_restaurant_normalized_name_uidx IS
  'Prevents duplicate menu item names within a restaurant, ignoring capitalization and surrounding whitespace.';
