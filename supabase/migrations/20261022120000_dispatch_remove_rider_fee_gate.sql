-- Dispatch eligibility does not require riders to pay a fee.
-- Customer order payment is still confirmed at checkout before dispatch.
CREATE OR REPLACE FUNCTION public.dispatch_assign_rider(p_order_id uuid, p_rider_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_rider public.riders%ROWTYPE;
  v_admin boolean;
  v_restaurant_assignment boolean;
BEGIN
  SELECT public.is_admin() INTO v_admin;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Order not found'); END IF;
  IF v_order.rider_id IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','Order already has a rider'); END IF;
  IF v_order.payment_status <> 'paid' OR v_order.status NOT IN ('placed','preparing') THEN
    RETURN jsonb_build_object('ok',false,'error','Only paid, dispatch-ready orders can be assigned');
  END IF;
  IF NOT COALESCE(v_admin,false) THEN
    SELECT COALESCE((value #>> '{}')::boolean,false) INTO v_restaurant_assignment
    FROM public.platform_settings WHERE key='dispatch_restaurant_assignment_enabled';
    IF NOT COALESCE(v_restaurant_assignment,false) OR NOT EXISTS (
      SELECT 1 FROM public.restaurants r WHERE r.id=v_order.restaurant_id AND r.owner_id=auth.uid()
    ) THEN RETURN jsonb_build_object('ok',false,'error','Restaurant assignment is disabled or this is not your order'); END IF;
  END IF;
  SELECT * INTO v_rider FROM public.riders WHERE id=p_rider_id;
  IF NOT FOUND OR v_rider.approval_status <> 'approved'
     OR NOT v_rider.waiver_completed OR v_rider.dispatch_disabled OR v_rider.status <> 'online' THEN
    RETURN jsonb_build_object('ok',false,'error','Rider must be online, approved, and dispatch-enabled'); END IF;
  IF lower(coalesce(v_order.zone,'')) <> lower(coalesce(v_rider.zone,'')) THEN
    RETURN jsonb_build_object('ok',false,'error','Rider is outside this order service area'); END IF;
  UPDATE public.orders SET rider_id=p_rider_id WHERE id=p_order_id AND rider_id IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Order was assigned by another dispatcher'); END IF;
  RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'rider_id',p_rider_id);
END; $$;
REVOKE ALL ON FUNCTION public.dispatch_assign_rider(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_assign_rider(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.rider_respond_to_order_offer(p_order_id uuid, p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_rider public.riders%ROWTYPE; v_order public.orders%ROWTYPE;
  v_offer public.rider_order_offers%ROWTYPE; v_enabled boolean;
BEGIN
  SELECT * INTO v_rider FROM public.riders WHERE profile_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Rider account not found'); END IF;
  IF v_rider.approval_status <> 'approved' OR NOT v_rider.waiver_completed
     OR v_rider.dispatch_disabled OR v_rider.status <> 'online' THEN
    RETURN jsonb_build_object('ok',false,'error','Rider must be online, approved, and dispatch-enabled'); END IF;
  SELECT COALESCE((value #>> '{}')::boolean,true) INTO v_enabled FROM public.platform_settings WHERE key='dispatch_rider_offers_enabled';
  IF NOT COALESCE(v_enabled,true) THEN RETURN jsonb_build_object('ok',false,'error','Rider order offers are currently paused'); END IF;
  SELECT * INTO v_offer FROM public.rider_order_offers WHERE order_id=p_order_id AND rider_id=v_rider.id FOR UPDATE;
  IF NOT FOUND OR v_offer.status <> 'offered' THEN RETURN jsonb_build_object('ok',false,'error','This offer is no longer available'); END IF;
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.rider_id IS NOT NULL OR v_order.status NOT IN ('placed','preparing') OR v_order.payment_status <> 'paid' THEN
    UPDATE public.rider_order_offers SET status='expired',responded_at=now() WHERE id=v_offer.id;
    RETURN jsonb_build_object('ok',false,'error','This order is no longer available'); END IF;
  IF lower(coalesce(v_order.zone,'')) <> lower(coalesce(v_rider.zone,'')) THEN
    RETURN jsonb_build_object('ok',false,'error','This order is outside your service area'); END IF;
  IF p_accept THEN
    UPDATE public.orders SET rider_id=v_rider.id WHERE id=p_order_id AND rider_id IS NULL;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Another rider already accepted this order'); END IF;
    UPDATE public.rider_order_offers SET status='accepted',responded_at=now() WHERE id=v_offer.id;
    UPDATE public.rider_order_offers SET status='expired',responded_at=now() WHERE order_id=p_order_id AND rider_id<>v_rider.id AND status='offered';
    RETURN jsonb_build_object('ok',true,'status','accepted');
  ELSE
    UPDATE public.rider_order_offers SET status='rejected',responded_at=now() WHERE id=v_offer.id;
    RETURN jsonb_build_object('ok',true,'status','rejected');
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.rider_respond_to_order_offer(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rider_respond_to_order_offer(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.rider_nearby_order_offers()
RETURNS TABLE (offer_id uuid, order_id uuid, zone text, status text, offered_at timestamptz,
  delivery_address text, delivery_lat numeric, delivery_lng numeric, delivery_fee numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rider public.riders%ROWTYPE; v_enabled boolean;
BEGIN
  SELECT * INTO v_rider FROM public.riders WHERE profile_id=auth.uid();
  IF NOT FOUND OR v_rider.approval_status <> 'approved' OR NOT v_rider.waiver_completed
    OR v_rider.dispatch_disabled OR v_rider.status <> 'online' THEN RETURN; END IF;
  SELECT COALESCE((value #>> '{}')::boolean,true) INTO v_enabled FROM public.platform_settings WHERE key='dispatch_rider_offers_enabled';
  IF NOT COALESCE(v_enabled,true) THEN RETURN; END IF;
  RETURN QUERY SELECT f.id,o.id,o.zone,f.status,f.offered_at,
    CASE WHEN f.status='accepted' THEN o.delivery_address ELSE NULL END,
    CASE WHEN f.status='accepted' THEN o.delivery_lat ELSE NULL END,
    CASE WHEN f.status='accepted' THEN o.delivery_lng ELSE NULL END,o.delivery_fee
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
    RETURN jsonb_build_object('ok',false,'error','Order is not eligible for dispatch'); END IF;
  INSERT INTO public.rider_order_offers(order_id,rider_id)
  SELECT v_order.id,r.id FROM public.riders r
  WHERE r.status='online' AND r.approval_status='approved' AND r.waiver_completed AND NOT r.dispatch_disabled
    AND lower(coalesce(r.zone,''))=lower(coalesce(v_order.zone,''))
  ON CONFLICT(order_id,rider_id) DO UPDATE SET status='offered',offered_at=now(),responded_at=NULL
    WHERE public.rider_order_offers.status IN ('rejected','expired');
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN jsonb_build_object('ok',true,'offers_created',v_count);
END; $$;
REVOKE ALL ON FUNCTION public.dispatch_create_order_offers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_create_order_offers(uuid) TO authenticated;
