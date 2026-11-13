create table if not exists public.bigfoods_pos_menu_waste (
  id uuid primary key default gen_random_uuid(),
  pos_item_id uuid not null references public.bigfoods_pos_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  reason text not null check (length(trim(reason)) >= 3),
  actor_staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists bigfoods_pos_menu_waste_created_at_idx
  on public.bigfoods_pos_menu_waste(created_at desc);
alter table public.bigfoods_pos_menu_waste enable row level security;

create or replace function public.bigfoods_inventory_log_menu_waste(
  p_actor_staff_id uuid,
  p_pos_item_id uuid,
  p_quantity integer,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor public.bigfoods_staff%rowtype;
  v_item public.bigfoods_pos_items%rowtype;
  v_waste public.bigfoods_pos_menu_waste%rowtype;
begin
  select * into v_actor
  from public.bigfoods_staff
  where id = p_actor_staff_id and is_active
  for share;
  if not found or v_actor.must_change_password then
    raise exception 'Forbidden';
  end if;
  if not (
    v_actor.role in ('owner','admin','inventory')
    or v_actor.permissions @> '["inventory.waste"]'::jsonb
  ) then
    raise exception 'Forbidden';
  end if;
  if p_quantity is null or p_quantity <= 0 or nullif(trim(p_reason), '') is null or length(trim(p_reason)) < 3 then
    raise exception 'A positive whole-number quantity and reason are required';
  end if;

  select * into v_item
  from public.bigfoods_pos_items
  where id = p_pos_item_id
  for update;
  if not found then raise exception 'POS menu item not found'; end if;
  if not v_item.track_stock then raise exception 'Stock tracking is disabled for this menu item'; end if;
  if v_item.stock_quantity is null or v_item.stock_quantity < p_quantity then
    raise exception 'Waste quantity exceeds available menu stock';
  end if;

  update public.bigfoods_pos_items
  set stock_quantity = stock_quantity - p_quantity,
      updated_at = now(),
      updated_by_staff_id = p_actor_staff_id
  where id = v_item.id
  returning * into v_item;

  insert into public.bigfoods_pos_menu_waste(
    pos_item_id, quantity, stock_before, stock_after, reason, actor_staff_id
  ) values (
    v_item.id, p_quantity, v_item.stock_quantity + p_quantity,
    v_item.stock_quantity, trim(p_reason), p_actor_staff_id
  ) returning * into v_waste;

  insert into public.bigfoods_staff_audit_events(actor_staff_id, action, details)
  values (
    p_actor_staff_id,
    'inventory.menu_waste_logged',
    jsonb_build_object(
      'waste_id', v_waste.id,
      'pos_item_id', v_item.id,
      'pos_item_name', v_item.name,
      'quantity', p_quantity,
      'stock_before', v_waste.stock_before,
      'stock_after', v_waste.stock_after,
      'reason', trim(p_reason)
    )
  );

  return jsonb_build_object(
    'waste_id', v_waste.id,
    'pos_item_id', v_item.id,
    'item_name', v_item.name,
    'quantity', p_quantity,
    'stock_before', v_waste.stock_before,
    'stock_after', v_waste.stock_after
  );
end;
$function$;

revoke all on function public.bigfoods_inventory_log_menu_waste(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.bigfoods_inventory_log_menu_waste(uuid, uuid, integer, text) to service_role;
