-- Rider dispatch marketplace settings and atomic offer decisions.
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS dispatch_disabled boolean NOT NULL DEFAULT false;

INSERT INTO public.platform_settings (key, value)
VALUES
  ('dispatch_restaurant_assignment_enabled', 'false'::jsonb),
  ('dispatch_rider_offers_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rider_order_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered','accepted','rejected','expired')),
  offered_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (order_id, rider_id)
);

CREATE INDEX IF NOT EXISTS rider_order_offers_rider_status_idx
  ON public.rider_order_offers (rider_id, status, offered_at DESC);
CREATE INDEX IF NOT EXISTS rider_order_offers_order_status_idx
  ON public.rider_order_offers (order_id, status);

ALTER TABLE public.rider_order_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "riders can read own order offers" ON public.rider_order_offers;
CREATE POLICY "riders can read own order offers"
  ON public.rider_order_offers FOR SELECT TO authenticated
  USING (rider_id IN (SELECT r.id FROM public.riders r WHERE r.profile_id = auth.uid()));

-- Writes are performed by security-definer RPCs after validating the current user.
REVOKE INSERT, UPDATE, DELETE ON public.rider_order_offers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.rider_respond_to_order_offer(p_order_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rider public.riders%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_offer public.rider_order_offers%ROWTYPE;
  v_offers_enabled boolean;
BEGIN
  SELECT * INTO v_rider FROM public.riders WHERE profile_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Rider account not found'); END IF;
  IF v_rider.approval_status <> 'approved' OR NOT v_rider.verification_fee_paid OR NOT v_rider.waiver_completed
     OR v_rider.dispatch_disabled OR v_rider.status <> 'online' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Your rider account is not eligible to accept offers');
  END IF;

  SELECT COALESCE((value #>> '{}')::boolean, true) INTO v_offers_enabled
  FROM public.platform_settings WHERE key = 'dispatch_rider_offers_enabled';
  IF NOT COALESCE(v_offers_enabled, true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rider order offers are currently paused');
  END IF;

  SELECT * INTO v_offer FROM public.rider_order_offers
  WHERE order_id = p_order_id AND rider_id = v_rider.id FOR UPDATE;
  IF NOT FOUND OR v_offer.status <> 'offered' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This offer is no longer available');
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.rider_id IS NOT NULL OR v_order.status NOT IN ('placed','preparing')
     OR v_order.payment_status <> 'paid' THEN
    UPDATE public.rider_order_offers SET status = 'expired', responded_at = now()
      WHERE id = v_offer.id;
    RETURN jsonb_build_object('ok', false, 'error', 'This order is no longer available');
  END IF;
  IF lower(coalesce(v_order.zone,'')) <> lower(coalesce(v_rider.zone,'')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This order is outside your service area');
  END IF;

  IF p_accept THEN
    UPDATE public.orders SET rider_id = v_rider.id WHERE id = p_order_id AND rider_id IS NULL;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Another rider already accepted this order'); END IF;
    UPDATE public.rider_order_offers SET status = 'accepted', responded_at = now() WHERE id = v_offer.id;
    UPDATE public.rider_order_offers SET status = 'expired', responded_at = now()
      WHERE order_id = p_order_id AND rider_id <> v_rider.id AND status = 'offered';
    RETURN jsonb_build_object('ok', true, 'status', 'accepted');
  ELSE
    UPDATE public.rider_order_offers SET status = 'rejected', responded_at = now() WHERE id = v_offer.id;
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.rider_respond_to_order_offer(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_respond_to_order_offer(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.rider_nearby_order_offers()
RETURNS TABLE (
  offer_id uuid,
  order_id uuid,
  zone text,
  status text,
  offered_at timestamptz,
  delivery_address text,
  delivery_lat numeric,
  delivery_lng numeric,
  delivery_fee numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rider public.riders%ROWTYPE;
  v_offers_enabled boolean;
BEGIN
  SELECT * INTO v_rider FROM public.riders WHERE profile_id = auth.uid();
  IF NOT FOUND OR v_rider.approval_status <> 'approved' OR NOT v_rider.verification_fee_paid
     OR NOT v_rider.waiver_completed OR v_rider.dispatch_disabled OR v_rider.status <> 'online' THEN
    RETURN;
  END IF;
  SELECT COALESCE((value #>> '{}')::boolean, true) INTO v_offers_enabled
  FROM public.platform_settings WHERE key = 'dispatch_rider_offers_enabled';
  IF NOT COALESCE(v_offers_enabled, true) THEN RETURN; END IF;

  RETURN QUERY
  SELECT o.id, o.id, o.zone, ofr.status, ofr.offered_at,
         o.delivery_address, o.delivery_lat, o.delivery_lng, o.delivery_fee
  FROM public.rider_order_offers ofr
  JOIN public.orders o ON o.id = ofr.order_id
  WHERE ofr.rider_id = v_rider.id AND ofr.status = 'offered'
    AND o.rider_id IS NULL AND o.payment_status = 'paid'
    AND o.status IN ('placed','preparing')
    AND lower(coalesce(o.zone,'')) = lower(coalesce(v_rider.zone,''))
  ORDER BY ofr.offered_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.rider_nearby_order_offers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_nearby_order_offers() TO authenticated;
