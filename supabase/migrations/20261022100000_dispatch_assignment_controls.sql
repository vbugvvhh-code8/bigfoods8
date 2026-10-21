-- Secure manual rider assignment and dispatch feature controls.
CREATE OR REPLACE FUNCTION public.admin_set_dispatch_setting(p_key text, p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_admin boolean;
BEGIN
  SELECT public.is_admin() INTO v_admin;
  IF NOT COALESCE(v_admin, false) THEN RETURN jsonb_build_object('ok',false,'error','Administrator access required'); END IF;
  IF p_key NOT IN ('dispatch_restaurant_assignment_enabled','dispatch_rider_offers_enabled') THEN
    RETURN jsonb_build_object('ok',false,'error','Invalid dispatch setting');
  END IF;
  INSERT INTO public.platform_settings(key,value) VALUES (p_key,to_jsonb(p_enabled))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN jsonb_build_object('ok',true,'key',p_key,'enabled',p_enabled);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_dispatch_setting(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_dispatch_setting(text,boolean) TO authenticated;

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
  IF NOT FOUND OR v_rider.approval_status <> 'approved' OR NOT v_rider.verification_fee_paid
     OR NOT v_rider.waiver_completed OR v_rider.dispatch_disabled OR v_rider.status <> 'online' THEN
    RETURN jsonb_build_object('ok',false,'error','Rider is not eligible for assignment');
  END IF;
  IF lower(coalesce(v_order.zone,'')) <> lower(coalesce(v_rider.zone,'')) THEN
    RETURN jsonb_build_object('ok',false,'error','Rider is outside this order service area');
  END IF;
  UPDATE public.orders SET rider_id=p_rider_id WHERE id=p_order_id AND rider_id IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Order was assigned by another dispatcher'); END IF;
  RETURN jsonb_build_object('ok',true,'order_id',p_order_id,'rider_id',p_rider_id);
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_assign_rider(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispatch_assign_rider(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_rider_dispatch_disabled(p_rider_id uuid,p_disabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT COALESCE(public.is_admin(),false) THEN RETURN jsonb_build_object('ok',false,'error','Administrator access required'); END IF;
  UPDATE public.riders SET dispatch_disabled=p_disabled WHERE id=p_rider_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Rider not found'); END IF;
  RETURN jsonb_build_object('ok',true,'disabled',p_disabled);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_rider_dispatch_disabled(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_rider_dispatch_disabled(uuid,boolean) TO authenticated;
