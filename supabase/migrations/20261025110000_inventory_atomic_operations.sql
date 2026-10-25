-- Atomic inventory operations. Edge Functions validate the server-side staff session
-- before calling these service-role-only RPCs; the RPCs independently validate actor
-- status and inventory permissions to prevent confused-deputy writes.
create or replace function public.bigfoods_inventory_receive(
  p_actor_staff_id uuid,
  p_inventory_item_id uuid,
  p_batch_code text,
  p_quantity numeric,
  p_unit text,
  p_supplier_name text default null,
  p_supplier_reference text default null,
  p_unit_cost numeric default null,
  p_currency text default 'NGN',
  p_received_at timestamptz default now(),
  p_expires_at date default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor public.bigfoods_staff%rowtype;
  v_item public.inventory_items%rowtype;
  v_batch public.inventory_batches%rowtype;
  v_movement public.inventory_movements%rowtype;
begin
  select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
  if not found or v_actor.must_change_password then raise exception 'Forbidden'; end if;
  if not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.receive"]'::jsonb) then raise exception 'Forbidden'; end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > 1000000000 or nullif(trim(p_batch_code),'') is null or nullif(trim(p_unit),'') is null then raise exception 'Invalid receipt details'; end if;
  if p_unit_cost is not null and p_unit_cost < 0 then raise exception 'Unit cost cannot be negative'; end if;
  if p_expires_at is not null and p_expires_at < coalesce(p_received_at,now())::date then raise exception 'Expiry date cannot precede receipt date'; end if;
  select * into v_item from public.inventory_items where id=p_inventory_item_id and is_active for update;
  if not found then raise exception 'Active inventory item not found'; end if;
  if lower(trim(v_item.base_unit)) <> lower(trim(p_unit)) then raise exception 'Receipt unit must match the item base unit'; end if;
  insert into public.inventory_batches(inventory_item_id,batch_code,supplier_name,supplier_reference,received_quantity,remaining_quantity,base_unit,unit_cost,currency,received_at,expires_at,status,received_by_staff_id,notes)
  values(p_inventory_item_id,trim(p_batch_code),nullif(trim(coalesce(p_supplier_name,'')),''),nullif(trim(coalesce(p_supplier_reference,'')),''),p_quantity,p_quantity,trim(p_unit),p_unit_cost,upper(coalesce(nullif(trim(p_currency),''),'NGN')),coalesce(p_received_at,now()),p_expires_at,'active',p_actor_staff_id,nullif(trim(coalesce(p_notes,'')),'')) returning * into v_batch;
  insert into public.inventory_movements(inventory_item_id,batch_id,movement_type,quantity,direction,base_unit,unit_cost,reason,actor_staff_id,occurred_at,metadata)
  values(p_inventory_item_id,v_batch.id,'receipt',p_quantity,'in',trim(p_unit),p_unit_cost,'Stock received',p_actor_staff_id,coalesce(p_received_at,now()),jsonb_build_object('supplier_name',v_batch.supplier_name,'supplier_reference',v_batch.supplier_reference,'batch_code',v_batch.batch_code))
  returning * into v_movement;
  insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
  values(p_actor_staff_id,'inventory.stock_received',jsonb_build_object('item_id',p_inventory_item_id,'batch_id',v_batch.id,'movement_id',v_movement.id,'quantity',p_quantity,'unit',p_unit));
  return jsonb_build_object('batch_id',v_batch.id,'movement_id',v_movement.id,'item_id',p_inventory_item_id,'quantity',p_quantity,'unit',p_unit);
end;
$$;

create or replace function public.bigfoods_inventory_create_item(
  p_actor_staff_id uuid,
  p_name text,
  p_sku text,
  p_category text,
  p_tracking_type text,
  p_base_unit text,
  p_reorder_level numeric default 0,
  p_is_perishable boolean default false,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor public.bigfoods_staff%rowtype;
  v_item public.inventory_items%rowtype;
begin
  select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
  if not found or v_actor.must_change_password then raise exception 'Forbidden'; end if;
  if not (v_actor.role in ('owner','admin') or v_actor.permissions @> '["inventory.manage"]'::jsonb) then raise exception 'Forbidden'; end if;
  if nullif(trim(p_name),'') is null or length(trim(p_name))>160 or nullif(trim(p_base_unit),'') is null or length(trim(p_base_unit))>24 then raise exception 'Item name and base unit are required'; end if;
  if p_tracking_type not in ('weight','volume','count') then raise exception 'Invalid tracking type'; end if;
  if p_reorder_level is null or p_reorder_level<0 then raise exception 'Reorder level cannot be negative'; end if;
  insert into public.inventory_items(name,sku,category,tracking_type,base_unit,reorder_level,is_perishable,notes,created_by_staff_id,updated_by_staff_id)
  values(trim(p_name),nullif(trim(coalesce(p_sku,'')),''),coalesce(nullif(trim(p_category),''),'ingredient'),p_tracking_type,trim(p_base_unit),p_reorder_level,coalesce(p_is_perishable,false),nullif(trim(coalesce(p_notes,'')),''),p_actor_staff_id,p_actor_staff_id)
  returning * into v_item;
  insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
  values(p_actor_staff_id,'inventory.item_created',jsonb_build_object('item_id',v_item.id,'name',v_item.name));
  return to_jsonb(v_item);
end;
$$;

revoke all on function public.bigfoods_inventory_receive(uuid,uuid,text,numeric,text,text,text,numeric,text,timestamptz,date,text) from public, anon, authenticated;
grant execute on function public.bigfoods_inventory_receive(uuid,uuid,text,numeric,text,text,text,numeric,text,timestamptz,date,text) to service_role;
revoke all on function public.bigfoods_inventory_create_item(uuid,text,text,text,text,text,numeric,boolean,text) from public, anon, authenticated;
grant execute on function public.bigfoods_inventory_create_item(uuid,text,text,text,text,text,numeric,boolean,text) to service_role;
