-- Create real, prepaid orders from scheduled meal-subscription deliveries.
-- Each delivery can be converted at most once via orders.subscription_delivery_id.
alter table public.orders
  add column if not exists subscription_delivery_id uuid
    references public.meal_subscription_deliveries(id) on delete set null;

create unique index if not exists orders_subscription_delivery_id_uidx
  on public.orders(subscription_delivery_id)
  where subscription_delivery_id is not null;

create or replace function public.process_due_meal_subscription_deliveries()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_delivery record;
  v_order_id uuid;
  v_created integer := 0;
  v_skipped integer := 0;
  v_now_local timestamp := now() at time zone 'Africa/Lagos';
  v_meal_cutoff time;
  v_item jsonb;
  v_options jsonb;
begin
  -- Do not create late orders for dates that have already passed.
  update public.meal_subscription_deliveries d
     set status = 'skipped'
    from public.meal_subscriptions s
   where s.id = d.subscription_id
     and d.status = 'scheduled'
     and d.scheduled_for < v_now_local::date
     and s.status in ('active', 'paused', 'cancelled');
  get diagnostics v_skipped = row_count;

  -- If a package is paused/cancelled after today's meal cutoff, do not deliver
  -- that missed meal later when the customer resumes.
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
  v_skipped := v_skipped + (select count(*)::integer from public.meal_subscription_deliveries d
    where d.scheduled_for = v_now_local::date and d.status = 'skipped');

  for v_delivery in
    select d.id as delivery_id, d.subscription_id, d.scheduled_for, d.delivery_time,
           s.customer_id, s.restaurant_id, s.selected_items, s.meal_subtotal_per_delivery,
           s.platform_fee_per_delivery, s.delivery_fee_per_delivery, s.delivery_address,
           s.delivery_lat, s.delivery_lng, r.zone
      from public.meal_subscription_deliveries d
      join public.meal_subscriptions s on s.id = d.subscription_id
      join public.restaurants r on r.id = s.restaurant_id
     where d.status = 'scheduled'
       and d.scheduled_for = v_now_local::date
       and s.status = 'active'
       and s.paid_at is not null
       and case d.delivery_time
         when 'breakfast' then v_now_local::time >= time '07:00'
         when 'lunch' then v_now_local::time >= time '11:00'
         else v_now_local::time >= time '17:00'
       end
     order by d.scheduled_for, d.delivery_time, d.created_at
     for update of d skip locked
  loop
    -- Insert the order already paid by the subscription package. Existing
    -- dispatch automation can then assign a rider using payment_status='paid'.
    insert into public.orders (
      restaurant_id, customer_id, zone, status, subtotal, platform_fee, delivery_fee,
      payment_status, delivery_address, delivery_lat, delivery_lng, delivery_code,
      subscription_delivery_id
    ) values (
      v_delivery.restaurant_id, v_delivery.customer_id, v_delivery.zone, 'placed',
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
      -- A prior run created the order but did not update the delivery row.
      select id into v_order_id from public.orders
       where subscription_delivery_id = v_delivery.delivery_id;
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
$function$;

revoke all on function public.process_due_meal_subscription_deliveries() from public, anon, authenticated;
grant execute on function public.process_due_meal_subscription_deliveries() to service_role;

-- The job is safe to reapply and runs once per minute. Meal cutoffs are Lagos
-- local time; only today's due deliveries can become live orders.
do $schedule$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
    from cron.job
   where jobname = 'process-due-meal-subscription-deliveries'
   limit 1;
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
  perform cron.schedule(
    'process-due-meal-subscription-deliveries',
    '* * * * *',
    'select public.process_due_meal_subscription_deliveries();'
  );
end;
$schedule$;
