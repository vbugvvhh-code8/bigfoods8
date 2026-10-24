CREATE OR REPLACE FUNCTION public.process_due_meal_subscription_deliveries()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_delivery record;
  v_order_id uuid;
  v_rider_id uuid;
  v_created integer := 0;
  v_skipped integer := 0;
  v_skipped_today integer := 0;
  v_now_local timestamp := now() at time zone 'Africa/Lagos';
  v_item jsonb;
  v_options jsonb;
  v_include_seed boolean := true;
begin
  select coalesce((ps.value::text in ('true','"true"')), true)
    into v_include_seed
    from public.platform_settings ps
   where ps.key = 'show_seed_data';
  v_include_seed := coalesce(v_include_seed, true);

  update public.meal_subscription_deliveries d
     set status = 'skipped'
    from public.meal_subscriptions s
   where s.id = d.subscription_id
     and d.status = 'scheduled'
     and d.scheduled_for < v_now_local::date
     and s.status in ('active', 'paused', 'cancelled');
  get diagnostics v_skipped = row_count;

  update public.meal_subscription_deliveries d
     set status = 'skipped'
    from public.meal_subscriptions s
   where s.id = d.subscription_id
     and d.status = 'scheduled'
     and d.scheduled_for = v_now_local::date
     and s.status in ('paused', 'cancelled')
     and v_now_local::time >= case d.delivery_time
       when 'breakfast' then time '07:00'
       when 'lunch' then time '11:00'
       else time '17:00'
     end;
  get diagnostics v_skipped_today = row_count;
  v_skipped := v_skipped + v_skipped_today;

  for v_delivery in
    select d.id as delivery_id, d.subscription_id, d.scheduled_for, d.delivery_time,
           s.customer_id, s.restaurant_id, s.selected_items, s.meal_subtotal_per_delivery,
           s.platform_fee_per_delivery, s.delivery_fee_per_delivery, s.delivery_address,
           s.delivery_lat, s.delivery_lng, r.zone, r.latitude as restaurant_latitude,
           r.longitude as restaurant_longitude
      from public.meal_subscription_deliveries d
      join public.meal_subscriptions s on s.id = d.subscription_id
      join public.restaurants r on r.id = s.restaurant_id
     where d.status = 'scheduled'
       and d.scheduled_for = v_now_local::date
       and s.status = 'active'
       and s.paid_at is not null
       and r.is_accepting_orders = true
       and r.approval_status = 'approved'
       and r.latitude is not null and r.longitude is not null
       and exists (
         select 1 from public.locations loc
          where loc.state = r.state and loc.is_active = true
            and r.zone = case
              when (select count(*) from public.locations same_lga where same_lga.lga = loc.lga) > 1
              then loc.lga || ' (' || loc.state || ')'
              else loc.lga
            end
       )
       and case d.delivery_time
         when 'breakfast' then v_now_local::time >= time '07:00'
         when 'lunch' then v_now_local::time >= time '11:00'
         else v_now_local::time >= time '17:00'
       end
     order by d.scheduled_for, d.delivery_time, d.created_at
     for update of d skip locked
  loop
    v_rider_id := null;
    select rider.id into v_rider_id
      from public.riders rider
     where rider.status = 'online'
       and rider.approval_status = 'approved'
       and coalesce(rider.dispatch_disabled, false) = false
       and rider.zone = v_delivery.zone
       and rider.lat is not null and rider.lng is not null
       and (v_include_seed or rider.is_seed_data = false)
     order by
       6371 * 2 * asin(sqrt(
         power(sin(radians(rider.lat::double precision - v_delivery.restaurant_latitude::double precision) / 2), 2)
         + cos(radians(v_delivery.restaurant_latitude::double precision))
         * cos(radians(rider.lat::double precision))
         * power(sin(radians(rider.lng::double precision - v_delivery.restaurant_longitude::double precision) / 2), 2)
       )) asc,
       rider.id
     limit 1;

    insert into public.orders (
      restaurant_id, customer_id, rider_id, zone, status, subtotal, platform_fee, delivery_fee,
      payment_status, delivery_address, delivery_lat, delivery_lng, delivery_code,
      subscription_delivery_id
    ) values (
      v_delivery.restaurant_id, v_delivery.customer_id, v_rider_id, v_delivery.zone, 'placed',
      v_delivery.meal_subtotal_per_delivery, v_delivery.platform_fee_per_delivery,
      v_delivery.delivery_fee_per_delivery, 'paid', v_delivery.delivery_address,
      v_delivery.delivery_lat, v_delivery.delivery_lng,
      lpad((floor(random() * 9000) + 1000)::integer::text, 4, '0'),
      v_delivery.delivery_id
    )
    on conflict (subscription_delivery_id) where subscription_delivery_id is not null
    do nothing
    returning id into v_order_id;

    if v_order_id is not null then
      for v_item in select value from jsonb_array_elements(v_delivery.selected_items)
      loop
        select coalesce(jsonb_agg(jsonb_build_object(
          'groupId', opt->'groupId',
          'groupName', opt->'groupName',
          'optionId', opt->'optionId',
          'optionName', opt->'optionName',
          'price', opt->'price',
          'quantity', opt->'quantity'
        )), '[]'::jsonb)
          into v_options
          from jsonb_array_elements(coalesce(v_item->'selected_options', '[]'::jsonb)) opt;

        insert into public.order_items (
          order_id, menu_item_id, quantity, unit_price, selected_options
        ) values (
          v_order_id,
          nullif(v_item->>'menu_item_id', '')::uuid,
          greatest(1, coalesce((v_item->>'quantity')::integer, 1)),
          coalesce((v_item->>'unit_price')::numeric, 0),
          v_options
        );
      end loop;

      update public.meal_subscription_deliveries
         set status = 'order_created', order_id = v_order_id
       where id = v_delivery.delivery_id and status = 'scheduled';
      v_created := v_created + 1;
    else
      select id into v_order_id from public.orders where subscription_delivery_id = v_delivery.delivery_id;
      if v_order_id is not null then
        update public.meal_subscription_deliveries
           set status = 'order_created', order_id = v_order_id
         where id = v_delivery.delivery_id and status = 'scheduled';
      end if;
    end if;
    v_order_id := null;
  end loop;

  return jsonb_build_object('orders_created', v_created, 'deliveries_skipped', v_skipped);
end;
$function$
;
revoke all on function public.process_due_meal_subscription_deliveries() from public, anon, authenticated;
grant execute on function public.process_due_meal_subscription_deliveries() to service_role;