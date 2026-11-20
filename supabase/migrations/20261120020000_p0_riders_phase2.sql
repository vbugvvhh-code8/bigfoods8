-- Phase 2 of S11 (rider personal data). Apply ONLY after the app version that
-- reads riders through order_rider_public() / nearest_online_rider_km() is live.
-- After this, customers and restaurant owners have no direct read access to
-- the riders table; riders still read their own row and admins read all.

drop policy if exists "Order parties can view assigned rider (phase 1)" on public.riders;
drop function if exists public.my_order_rider_ids();
