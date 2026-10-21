-- Dispatch offers are generated from eligible paid, unassigned orders.
-- Customer address/coordinates are deliberately withheld until an offer is accepted.
CREATE OR REPLACE FUNCTION public.rider_nearby_order_offers()
RETURNS TABLE (
  offer_id uuid, order_id uuid, zone text, status text, offered_at timestamptz,
  delivery_address text, delivery_lat numeric, delivery_lng numeric, delivery_fee numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rider public.riders%ROWTYPE; v_enabled boolean;
BEGIN
  SELECT * INTO v_rider FROM public.riders WHERE profile_id=auth.uid();
  IF NOT FOUND OR v_rider.approval_status <> 'approved' OR NOT v_rider.verification_fee_paid
    OR NOT v_rider.waiver_completed OR v_rider.dispatch_disabled OR v_rider.status <> 'online' THEN RETURN; END IF;
  SELECT COALESCE((value #>> '{}')::boolean,true) INTO v_enabled FROM public.platform_settings WHERE key='dispatch_rider_offers_enabled';
  IF NOT COALESCE(v_enabled,true) THEN RETURN; END IF;
  RETURN QUERY SELECT f.id,o.id,o.zone,f.status,f.offered_at,
    CASE WHEN f.status='accepted' THEN o.delivery_address ELSE NULL END,
    CASE WHEN f.status='accepted' THEN o.delivery_lat ELSE NULL END,
    CASE WHEN f.status='accepted' THEN o.delivery_lng ELSE NULL END,
    o.delivery_fee
  FROM public.rider_order_offers f JOIN public.orders o ON o.id=f.order_id
  WHERE f.rider_id=v_rider.id AND f.status IN ('offered','accepted')
    AND (f.status='accepted' OR (o.rider_id IS NULL AND o.payment_status='paid'
      AND o.status IN ('placed','preparing') AND lower(coalesce(o.zone,''))=lower(coalesce(v_rider.zone,''))))
  ORDER BY f.offered_at DESC;
END; $$;
REVOKE ALL ON FUNCTION public.rider_nearby_order_offers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_nearby_order_offers() TO authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_create_order_offers(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE; v_enabled boolean; v_count integer;
BEGIN
  IF NOT COALESCE(public.is_admin(),false) THEN RETURN jsonb_build_object('ok',false,'error','Administrator access required'); END IF;
  SELECT COALESCE((value #>> '{}')::boolean,true) INTO v_enabled FROM public.platform_settings WHERE key='dispatch_rider_offers_enabled';
  IF NOT COALESCE(v_enabled,true) THEN RETURN jsonb_build_object('ok',false,'error','Rider order offers are paused'); END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.rider_id IS NOT NULL OR v_order.payment_status <> 'paid' OR v_order.status NOT IN ('placed','preparing') THEN
    RETURN jsonb_build_object('ok',false,'error','Order is not eligible for dispatch');
  END IF;
  INSERT INTO public.rider_order_offers(order_id,rider_id)
  SELECT v_order.id,r.id FROM public.riders r
  WHERE r.status='online' AND r.approval_status='approved' AND r.verification_fee_paid
    AND r.waiver_completed AND NOT r.dispatch_disabled
    AND lower(coalesce(r.zone,''))=lower(coalesce(v_order.zone,''))
  ON CONFLICT(order_id,rider_id) DO UPDATE SET status='offered',offered_at=now(),responded_at=NULL
    WHERE public.rider_order_offers.status IN ('rejected','expired');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok',true,'offers_created',v_count);
END; $$;
REVOKE ALL ON FUNCTION public.dispatch_create_order_offers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_create_order_offers(uuid) TO authenticated;

-- Any online rider can see the order only as a zone/fee offer; address is returned after acceptance.
