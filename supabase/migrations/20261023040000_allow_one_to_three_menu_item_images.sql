-- Menu items can use one to three photos. Null/empty arrays remain valid for legacy rows.
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_image_urls_count;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_image_urls_count
  CHECK (
    image_urls IS NULL
    OR array_length(image_urls, 1) IS NULL
    OR array_length(image_urls, 1) BETWEEN 1 AND 3
  );
