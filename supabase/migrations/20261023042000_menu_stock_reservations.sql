-- Inventory reservation lifecycle for main dishes and variants.
CREATE TABLE IF NOT EXISTS public.menu_stock_reservations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_reference text NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  reservation_type text NOT NULL CHECK (reservation_type IN ('item', 'option')),
  option_group_id text,
  option_id text,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'consumed', 'released')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_stock_reservations_option_shape CHECK (
    (reservation_type = 'item' AND option_group_id IS NULL AND option_id IS NULL)
    OR (reservation_type = 'option' AND option_group_id IS NOT NULL AND option_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS menu_stock_reservations_active_item_idx
  ON public.menu_stock_reservations (menu_item_id, expires_at)
  WHERE status = 'reserved';
CREATE INDEX IF NOT EXISTS menu_stock_reservations_reference_idx
  ON public.menu_stock_reservations (payment_reference, status);
ALTER TABLE public.menu_stock_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.menu_stock_reservations FROM anon, authenticated, public;
GRANT ALL ON public.menu_stock_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.release_menu_stock_reservation(p_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  groups_json jsonb;
  group_index bigint;
  option_index bigint;
BEGIN
  FOR r IN
    SELECT * FROM public.menu_stock_reservations
    WHERE payment_reference = p_reference AND status = 'reserved'
    ORDER BY menu_item_id, id
    FOR UPDATE
  LOOP
    IF r.reservation_type = 'item' THEN
      UPDATE public.menu_items
      SET stock_reserved = GREATEST(0, stock_reserved - r.quantity)
      WHERE id = r.menu_item_id;
    ELSE
      SELECT option_groups INTO groups_json
      FROM public.menu_items WHERE id = r.menu_item_id FOR UPDATE;
      IF groups_json IS NOT NULL THEN
        SELECT ordinality INTO group_index
        FROM jsonb_array_elements(groups_json) WITH ORDINALITY g(value, ordinality)
        WHERE g.value->>'id' = r.option_group_id LIMIT 1;
        IF group_index IS NOT NULL THEN
          SELECT ordinality INTO option_index
          FROM jsonb_array_elements(groups_json->(group_index - 1)->'options') WITH ORDINALITY o(value, ordinality)
          WHERE o.value->>'id' = r.option_id LIMIT 1;
          IF option_index IS NOT NULL THEN
            UPDATE public.menu_items
            SET option_groups = jsonb_set(
              option_groups,
              ARRAY[(group_index - 1)::text, 'options', (option_index - 1)::text, 'stock_quantity'],
              to_jsonb(GREATEST(0, ((option_groups->(group_index - 1)->'options'->(option_index - 1)->>'stock_quantity')::integer) )),
              false
            )
            WHERE id = r.menu_item_id
              AND option_groups->(group_index - 1)->'options'->(option_index - 1)->>'stock_quantity' IS NOT NULL;
          END IF;
        END IF;
      END IF;
    END IF;
    UPDATE public.menu_stock_reservations SET status = 'released' WHERE id = r.id AND status = 'reserved';
  END LOOP;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Expired holds stop counting toward availability and release main-item counters.
CREATE OR REPLACE FUNCTION public.release_expired_menu_stock_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref text;
  released_count integer := 0;
BEGIN
  FOR ref IN
    SELECT DISTINCT payment_reference FROM public.menu_stock_reservations
    WHERE status = 'reserved' AND expires_at <= now()
    ORDER BY payment_reference
  LOOP
    PERFORM public.release_menu_stock_reservation(ref);
    released_count := released_count + 1;
  END LOOP;
  RETURN released_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_menu_item_stock(p_reference text, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  line jsonb;
  selection jsonb;
  mi record;
  group_json jsonb;
  option_json jsonb;
  requested_qty integer;
  group_id text;
  option_id text;
  option_stock integer;
  reserved_option integer;
BEGIN
  IF p_reference IS NULL OR length(trim(p_reference)) = 0 OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_STOCK_RESERVATION_REQUEST', ERRCODE = '22023';
  END IF;
  PERFORM public.release_expired_menu_stock_reservations();
  IF EXISTS (SELECT 1 FROM public.menu_stock_reservations WHERE payment_reference = p_reference) THEN
    IF EXISTS (SELECT 1 FROM public.menu_stock_reservations WHERE payment_reference = p_reference AND status <> 'reserved') THEN
      RAISE EXCEPTION USING MESSAGE = 'STOCK_RESERVATION_ALREADY_PROCESSED', ERRCODE = 'P0001';
    END IF;
    RETURN jsonb_build_object('success', true, 'already_reserved', true);
  END IF;

  -- Lock all menu rows in stable order to prevent concurrent overselling and deadlocks.
  PERFORM 1
  FROM public.menu_items m
  WHERE m.id IN (
    SELECT DISTINCT (x->>'menu_item_id')::uuid FROM jsonb_array_elements(p_items) x
  )
  ORDER BY m.id
  FOR UPDATE;

  FOR line IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    requested_qty := (line->>'quantity')::integer;
    IF requested_qty IS NULL OR requested_qty < 1 OR requested_qty > 99 THEN
      RAISE EXCEPTION USING MESSAGE = 'INVALID_STOCK_QUANTITY', ERRCODE = '22023';
    END IF;
    SELECT id, stock_quantity, stock_reserved, option_groups
      INTO mi FROM public.menu_items WHERE id = (line->>'menu_item_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING MESSAGE = 'MENU_ITEM_NOT_FOUND', ERRCODE = 'P0001';
    END IF;
    IF mi.stock_quantity IS NOT NULL THEN
      IF mi.stock_quantity - mi.stock_reserved < requested_qty THEN
        RAISE EXCEPTION USING MESSAGE = 'OUT_OF_STOCK: A dish in your cart no longer has enough stock.', ERRCODE = 'P0001';
      END IF;
      UPDATE public.menu_items SET stock_reserved = stock_reserved + requested_qty WHERE id = mi.id;
      INSERT INTO public.menu_stock_reservations(payment_reference, menu_item_id, reservation_type, quantity)
      VALUES (p_reference, mi.id, 'item', requested_qty);
    END IF;

    FOR selection IN SELECT value FROM jsonb_array_elements(COALESCE(line->'selected_options', '[]'::jsonb))
    LOOP
      group_id := selection->>'groupId';
      option_id := selection->>'optionId';
      SELECT g.value INTO group_json
      FROM jsonb_array_elements(COALESCE(mi.option_groups, '[]'::jsonb)) g(value)
      WHERE g.value->>'id' = group_id LIMIT 1;
      IF group_json IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'INVALID_SELECTED_OPTION', ERRCODE = 'P0001';
      END IF;
      SELECT o.value INTO option_json
      FROM jsonb_array_elements(COALESCE(group_json->'options', '[]'::jsonb)) o(value)
      WHERE o.value->>'id' = option_id LIMIT 1;
      IF option_json IS NULL OR option_json->>'is_available' = 'false' THEN
        RAISE EXCEPTION USING MESSAGE = 'INVALID_SELECTED_OPTION', ERRCODE = 'P0001';
      END IF;
      IF NULLIF(option_json->>'stock_quantity', '') IS NOT NULL THEN
        option_stock := (option_json->>'stock_quantity')::integer;
        SELECT COALESCE(SUM(quantity), 0)::integer INTO reserved_option
        FROM public.menu_stock_reservations
        WHERE menu_item_id = mi.id AND reservation_type = 'option'
          AND option_group_id = group_id AND option_id = option_id
          AND status = 'reserved' AND expires_at > now();
        IF option_stock - reserved_option < requested_qty THEN
          RAISE EXCEPTION USING MESSAGE = 'OUT_OF_STOCK: A selected variant or extra is out of stock.', ERRCODE = 'P0001';
        END IF;
        INSERT INTO public.menu_stock_reservations(payment_reference, menu_item_id, reservation_type, option_group_id, option_id, quantity)
        VALUES (p_reference, mi.id, 'option', group_id, option_id, requested_qty);
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_menu_stock_reservation(p_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  groups_json jsonb;
  group_index bigint;
  option_index bigint;
  option_stock integer;
BEGIN
  PERFORM public.release_expired_menu_stock_reservations();
  IF EXISTS (SELECT 1 FROM public.menu_stock_reservations WHERE payment_reference = p_reference AND status = 'released') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stock reservation expired or was released. Payment needs manual review.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.menu_stock_reservations WHERE payment_reference = p_reference AND status = 'reserved') THEN
    RETURN jsonb_build_object('success', true, 'already_consumed', true);
  END IF;

  FOR r IN
    SELECT * FROM public.menu_stock_reservations
    WHERE payment_reference = p_reference AND status = 'reserved'
    ORDER BY menu_item_id, id
    FOR UPDATE
  LOOP
    IF r.reservation_type = 'item' THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity - r.quantity,
          stock_reserved = GREATEST(0, stock_reserved - r.quantity)
      WHERE id = r.menu_item_id AND stock_quantity IS NOT NULL AND stock_quantity >= r.quantity AND stock_reserved >= r.quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'STOCK_CONSUMPTION_FAILED', ERRCODE = 'P0001';
      END IF;
    ELSE
      SELECT option_groups INTO groups_json FROM public.menu_items WHERE id = r.menu_item_id FOR UPDATE;
      SELECT g.ordinality INTO group_index
      FROM jsonb_array_elements(COALESCE(groups_json, '[]'::jsonb)) WITH ORDINALITY g(value, ordinality)
      WHERE g.value->>'id' = r.option_group_id LIMIT 1;
      IF group_index IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'STOCK_OPTION_CHANGED', ERRCODE = 'P0001';
      END IF;
      SELECT o.ordinality, (o.value->>'stock_quantity')::integer INTO option_index, option_stock
      FROM jsonb_array_elements(groups_json->(group_index - 1)->'options') WITH ORDINALITY o(value, ordinality)
      WHERE o.value->>'id' = r.option_id LIMIT 1;
      IF option_index IS NULL OR option_stock IS NULL OR option_stock < r.quantity THEN
        RAISE EXCEPTION USING MESSAGE = 'STOCK_OPTION_CHANGED', ERRCODE = 'P0001';
      END IF;
      UPDATE public.menu_items
      SET option_groups = jsonb_set(
        option_groups,
        ARRAY[(group_index - 1)::text, 'options', (option_index - 1)::text, 'stock_quantity'],
        to_jsonb(option_stock - r.quantity),
        false
      )
      WHERE id = r.menu_item_id;
    END IF;
    UPDATE public.menu_stock_reservations SET status = 'consumed' WHERE id = r.id AND status = 'reserved';
  END LOOP;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_menu_item_stock(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_menu_stock_reservation(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_menu_stock_reservation(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_expired_menu_stock_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_menu_item_stock(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_menu_stock_reservation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_menu_stock_reservation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_menu_stock_reservations() TO service_role;
