ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS availability_schedule_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_schedule jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.menu_items'::regclass AND conname = 'menu_items_availability_schedule_array') THEN
    ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_availability_schedule_array CHECK (jsonb_typeof(availability_schedule) = 'array');
  END IF;
END $$;

COMMENT ON COLUMN public.menu_items.availability_schedule_enabled IS 'When true, customer ordering is permitted only inside a configured weekly availability window (Africa/Lagos).';
COMMENT ON COLUMN public.menu_items.availability_schedule IS 'Weekly availability windows: array of {day: 0-6 (Sunday-Saturday), start: HH:MM, end: HH:MM}. Multiple windows per day are supported.';
