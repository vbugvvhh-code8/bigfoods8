alter table public.inventory_kitchen_preparations
  add column if not exists menu_stock_added_quantity numeric(14,3) not null default 0;

create or replace function public.bigfoods_kitchen_finish_preparation(
  p_actor_staff_id uuid,
  p_preparation_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor public.bigfoods_staff%rowtype;
  v_prep public.inventory_kitchen_preparations%rowtype;
  v_item public.bigfoods_pos_items%rowtype;
  v_new_stock integer;
begin
  select * into v_actor
  from public.bigfoods_staff
  where id = p_actor_staff_id and is_active
  for share;

  if not found or v_actor.must_change_password
    or not (
      v_actor.role in ('owner','admin','inventory')
      or v_actor.permissions @> '["inventory.process"]'::jsonb
    )
  then
    raise exception 'Forbidden';
  end if;

  select * into v_prep
  from public.inventory_kitchen_preparations
  where id = p_preparation_id
  for update;

  if not found then
    raise exception 'Kitchen preparation not found';
  end if;

  if v_prep.status <> 'in_progress' then
    raise exception 'Only in-progress preparations can be completed';
  end if;

  if v_prep.requested_portions <= 0
    or v_prep.requested_portions <> trunc(v_prep.requested_portions)
  then
    raise exception 'Kitchen output must be a whole number of portions';
  end if;

  select * into v_item
  from public.bigfoods_pos_items
  where id = v_prep.bigfoods_pos_item_id
  for update;

  if not found then
    raise exception 'Linked POS menu item no longer exists';
  end if;

  v_new_stock := coalesce(v_item.stock_quantity, 0) + v_prep.requested_portions::integer;

  update public.bigfoods_pos_items
  set stock_quantity = v_new_stock,
      track_stock = true,
      updated_at = now()
  where id = v_item.id;

  update public.inventory_kitchen_preparations
  set status = 'completed',
      completed_by_staff_id = p_actor_staff_id,
      completed_at = now(),
      menu_stock_added_quantity = v_prep.requested_portions,
      notes = coalesce(nullif(trim(coalesce(p_notes,'')),''), notes)
  where id = v_prep.id;

  insert into public.bigfoods_staff_audit_events(actor_staff_id, action, details)
  values (
    p_actor_staff_id,
    'inventory.kitchen_preparation_completed',
    jsonb_build_object(
      'preparation_id', v_prep.id,
      'prep_code', v_prep.prep_code,
      'pos_item_id', v_item.id,
      'pos_item_name', v_item.name,
      'portions_added', v_prep.requested_portions,
      'previous_stock', coalesce(v_item.stock_quantity, 0),
      'new_stock', v_new_stock
    )
  );

  return jsonb_build_object(
    'id', v_prep.id,
    'prep_code', v_prep.prep_code,
    'status', 'completed',
    'pos_item_id', v_item.id,
    'pos_item_name', v_item.name,
    'portions_added', v_prep.requested_portions,
    'previous_stock', coalesce(v_item.stock_quantity, 0),
    'new_stock', v_new_stock
  );
end;
$function$;

comment on column public.inventory_kitchen_preparations.menu_stock_added_quantity is
  'Whole portions added to the linked BigFoods POS menu item when this preparation was completed.';