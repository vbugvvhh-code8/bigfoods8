-- Allow promoted-card impressions so the dashboard can calculate a meaningful CTR.
ALTER TABLE public.restaurant_events
  DROP CONSTRAINT IF EXISTS restaurant_events_event_type_check;

ALTER TABLE public.restaurant_events
  ADD CONSTRAINT restaurant_events_event_type_check
  CHECK (event_type = ANY (ARRAY['card_click'::text, 'page_view'::text, 'card_impression'::text]));
