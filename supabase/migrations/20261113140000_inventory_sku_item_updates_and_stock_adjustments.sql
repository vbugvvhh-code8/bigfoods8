create sequence if not exists public.inventory_item_sku_seq start 1;
create or replace function public.bigfoods_inventory_assign_sku()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if nullif(trim(new.sku),'') is null then
    new.sku := 'BF-INV-' || lpad(nextval('public.inventory_item_sku_seq')::text,6,'0');
  else
    new.sku := upper(trim(new.sku));
  end if;
  return new;
end $$;
drop trigger if exists inventory_items_assign_sku on public.inventory_items;
create trigger inventory_items_assign_sku before insert or update of sku on public.inventory_items
for each row execute function public.bigfoods_inventory_assign_sku();
create unique index if not exists inventory_items_sku_unique on public.inventory_items(sku) where sku is not null;

create or replace function public.bigfoods_inventory_update_item(
 p_actor_staff_id uuid,p_inventory_item_id uuid,p_name text,p_sku text,p_category text,
 p_tracking_type text,p_base_unit text,p_reorder_level numeric,p_is_perishable boolean,p_notes text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.bigfoods_staff%rowtype; v_item public.inventory_items%rowtype;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin') or v_actor.permissions @> '["inventory.manage"]'::jsonb) then raise exception 'Forbidden'; end if;
 if nullif(trim(p_name),'') is null or length(trim(p_name))>160 or nullif(trim(p_base_unit),'') is null or length(trim(p_base_unit))>24 then raise exception 'Item name and base unit are required'; end if;
 if p_tracking_type not in ('weight','volume','count') or p_reorder_level is null or p_reorder_level<0 then raise exception 'Invalid inventory item details'; end if;
 update public.inventory_items set name=trim(p_name),sku=coalesce(nullif(trim(coalesce(p_sku,'')),''),sku),category=coalesce(nullif(trim(p_category),''),'ingredient'),
 tracking_type=p_tracking_type,base_unit=trim(p_base_unit),reorder_level=p_reorder_level,is_perishable=coalesce(p_is_perishable,false),
 notes=nullif(trim(coalesce(p_notes,'')),''),updated_by_staff_id=p_actor_staff_id,updated_at=now()
 where id=p_inventory_item_id and is_active returning * into v_item;
 if not found then raise exception 'Active inventory item not found'; end if;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details) values(p_actor_staff_id,'inventory.item_updated',jsonb_build_object('item_id',v_item.id,'name',v_item.name,'sku',v_item.sku));
 return to_jsonb(v_item);
end $$;

create or replace function public.bigfoods_inventory_adjust_batch(
 p_actor_staff_id uuid,p_batch_id uuid,p_quantity numeric,p_direction text,p_reason text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.bigfoods_staff%rowtype; v_batch public.inventory_batches%rowtype; v_movement public.inventory_movements%rowtype;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.receive"]'::jsonb) then raise exception 'Forbidden'; end if;
 if p_quantity is null or p_quantity<=0 or p_quantity>1000000000 or p_direction not in ('in','out') or nullif(trim(p_reason),'') is null then raise exception 'Enter a valid quantity, direction and reason'; end if;
 select * into v_batch from public.inventory_batches where id=p_batch_id and status in ('active','depleted') for update;
 if not found then raise exception 'Active stock batch not found'; end if;
 if p_direction='out' and p_quantity>v_batch.remaining_quantity then raise exception 'Adjustment exceeds the remaining quantity in this batch'; end if;
 update public.inventory_batches set
   received_quantity=case when p_direction='in' then received_quantity+p_quantity else received_quantity end,
   remaining_quantity=case when p_direction='in' then remaining_quantity+p_quantity else remaining_quantity-p_quantity end,
   status=case when (case when p_direction='in' then remaining_quantity+p_quantity else remaining_quantity-p_quantity end)=0 then 'depleted' else 'active' end
 where id=p_batch_id returning * into v_batch;
 insert into public.inventory_movements(inventory_item_id,batch_id,movement_type,quantity,direction,base_unit,unit_cost,reason,actor_staff_id,metadata)
 values(v_batch.inventory_item_id,v_batch.id,'count_adjustment',p_quantity,p_direction,v_batch.base_unit,v_batch.unit_cost,trim(p_reason),p_actor_staff_id,jsonb_build_object('adjustment',true))
 returning * into v_movement;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
 values(p_actor_staff_id,'inventory.stock_adjusted',jsonb_build_object('batch_id',v_batch.id,'movement_id',v_movement.id,'quantity',p_quantity,'direction',p_direction,'reason',trim(p_reason)));
 return jsonb_build_object('batch_id',v_batch.id,'movement_id',v_movement.id,'remaining_quantity',v_batch.remaining_quantity);
end $$;
\nupdate public.inventory_items set sku=null where sku is null;\n