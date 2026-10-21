-- Automatically fan out paid, unassigned orders to eligible online riders in the same service zone.
CREATE OR REPLACE FUNCTION public.dispatch_offer_order_to_riders(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order public.orders%ROWTYPE; v_enabled boolean;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id;
  IF NOT FOUND OR v_order.rider_id IS NOT NULL OR v_order.payment_status <> 'paid'
     OR v_order.status NOT IN ('placed','preparing') THEN RETURN; END IF;
  SELECT COALESCE((value #>> '{}')::boolean,true) INTO v_enabled
    FROM public.platform_settings WHERE key='dispatch_rider_offers_enabled';
  IF NOT COALESCE(v_enabled,true) THEN RETURN; END IF;
  INSERT INTO public.rider_order_offers(order_id,rider_id,status)
  SELECT v_order.id,r.id,'offered'
    FROM public.riders r
    WHERE r.status='online' AND r.approval_status='approved'
      AND r.verification_fee_paid AND r.waiver_completed
      AND NOT r.dispatch_disabled
      AND lower(coalesce(r.zone,''))=lower(coalesce(v_order.zone,''))
  ON CONFLICT (order_id,rider_id) DO UPDATE SET status='offered',offered_at=now(),responded_at=NULL
    WHERE public.rider_order_offers.status IN ('expired');
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_offer_order_to_riders(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.dispatch_order_offer_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.dispatch_offer_order_to_riders(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS dispatch_order_offer_after_change ON public.orders;
CREATE TRIGGER dispatch_order_offer_after_change
AFTER INSERT OR UPDATE OF status,payment_status,rider_id,zone ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.dispatch_order_offer_trigger();

CREATE OR REPLACE FUNCTION public.dispatch_rider_online_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order record;
BEGIN
  IF NEW.status='online' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.zone IS DISTINCT FROM NEW.zone) THEN
    FOR v_order IN SELECT id FROM public.orders
      WHERE rider_id IS NULL AND payment_status='paid' AND status IN ('placed','preparing')
        AND lower(coalesce(zone,''))=lower(coalesce(NEW.zone,''))
    LOOP
      PERFORM public.dispatch_offer_order_to_riders(v_order.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS dispatch_rider_offer_after_change ON public.riders;
CREATE TRIGGER dispatch_rider_offer_after_change
AFTER INSERT OR UPDATE OF status,zone,approval_status,verification_fee_paid,waiver_completed,dispatch_disabled ON public.riders
FOR EACH ROW EXECUTE FUNCTION public.dispatch_rider_online_trigger();

-- Re-evaluate open orders when admins enable the marketplace.
CREATE OR REPLACE FUNCTION public.dispatch_settings_offer_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_order record;
BEGIN
  IF NEW.key='dispatch_rider_offers_enabled' AND (NEW.value #>> '{}')='true' THEN
    FOR v_order IN SELECT id FROM public.orders
      WHERE rider_id IS NULL AND payment_status='paid' AND status IN ('placed','preparing')
    LOOP
      PERFORM public.dispatch_offer_order_to_riders(v_order.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS dispatch_settings_offer_after_change ON public.platform_settings;
CREATE TRIGGER dispatch_settings_offer_after_change
AFTER INSERT OR UPDATE OF value ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.dispatch_settings_offer_trigger();
