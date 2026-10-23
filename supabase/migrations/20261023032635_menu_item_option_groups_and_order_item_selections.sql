ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS option_groups jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_option_groups_array CHECK (jsonb_typeof(option_groups) = 'array');
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_options jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_selected_options_array CHECK (jsonb_typeof(selected_options) = 'array');
