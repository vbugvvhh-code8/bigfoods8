create or replace function public.sync_meal_subscription_delivery_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.subscription_delivery_id is not null and new.status is distinct from old.status then
    update public.meal_subscription_deliveries
       set status = case
         when new.status = 'delivered' then 'delivered'
         when new.status = 'cancelled' then 'cancelled'
         else status
       end
     where id = new.subscription_delivery_id
       and status = 'order_created'
       and new.status in ('delivered', 'cancelled');
  end if;
  return new;
end;
$function$;
revoke all on function public.sync_meal_subscription_delivery_status() from public, anon, authenticated;
grant execute on function public.sync_meal_subscription_delivery_status() to service_role;
do $trigger$
begin
  if not exists (select 1 from pg_trigger where tgname = 'sync_meal_subscription_delivery_status' and tgrelid = 'public.orders'::regclass and not tgisinternal) then
    create trigger sync_meal_subscription_delivery_status
    after update of status on public.orders
    for each row execute function public.sync_meal_subscription_delivery_status();
  end if;
end;
$trigger$;