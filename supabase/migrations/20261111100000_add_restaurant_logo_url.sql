-- Store each restaurant's square brand/profile logo separately from its cover banner.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS logo_url text;
