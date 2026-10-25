-- BigFoods Task 10, Phase 2: controlled stock usage, recipes and production yield.
-- Additive migration; does not seed stock or modify menu_items quantities.

create or replace function public.bigfoods_inventory_log_waste(
  p_actor_staff_id uuid,
  p_batch_id uuid,
  p_quantity numeric,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor public.bigfoods_staff%rowtype;
  v_batch public.inventory_batches%rowtype;
  v_movement public.inventory_movements%rowtype;
begin
  select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
  if not found or v_actor.must_change_password then raise exception 'Forbidden'; end if;
  if not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.waste"]'::jsonb) then raise exception 'Forbidden'; end if;
  if p_quantity is null or p_quantity <= 0 or nullif(trim(p_reason),'') is null then raise exception 'Quantity and reason are required'; end if;
  select * into v_batch from public.inventory_batches where id=p_batch_id for update;
  if not found or v_batch.status <> 'active' then raise exception 'Active stock batch not found'; end if;
  if p_quantity > v_batch.remaining_quantity then raise exception 'Waste quantity exceeds remaining batch stock'; end if;
  update public.inventory_batches set remaining_quantity=remaining_quantity-p_quantity,
    status=case when remaining_quantity-p_quantity=0 then 'depleted' else status end
    where id=v_batch.id returning * into v_batch;
  insert into public.inventory_movements(inventory_item_id,batch_id,movement_type,quantity,direction,base_unit,unit_cost,reason,actor_staff_id,metadata)
  values(v_batch.inventory_item_id,v_batch.id,'waste',p_quantity,'out',v_batch.base_unit,v_batch.unit_cost,trim(p_reason),p_actor_staff_id,jsonb_build_object('batch_code',v_batch.batch_code))
  returning * into v_movement;
  insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
  values(p_actor_staff_id,'inventory.waste_logged',jsonb_build_object('batch_id',v_batch.id,'movement_id',v_movement.id,'quantity',p_quantity,'reason',trim(p_reason)));
  return jsonb_build_object('batch_id',v_batch.id,'movement_id',v_movement.id,'remaining_quantity',v_batch.remaining_quantity,'status',v_batch.status);
end;
$$;

create or replace function public.bigfoods_inventory_save_recipe(
  p_actor_staff_id uuid,
  p_menu_item_id uuid,
  p_name text,
  p_output_quantity numeric,
  p_output_unit text,
  p_ingredients jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor public.bigfoods_staff%rowtype;
  v_recipe public.inventory_recipes%rowtype;
  v_line jsonb;
  v_item public.inventory_items%rowtype;
  v_version integer;
begin
  select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
  if not found or v_actor.must_change_password then raise exception 'Forbidden'; end if;
  if not (v_actor.role in ('owner','admin') or v_actor.permissions @> '["inventory.manage"]'::jsonb) then raise exception 'Forbidden'; end if;
  if nullif(trim(p_name),'') is null or nullif(trim(p_output_unit),'') is null or p_output_quantity is null or p_output_quantity<=0 then raise exception 'Recipe name, output and unit are required'; end if;
  if coalesce(jsonb_typeof(p_ingredients),'') <> 'array' or jsonb_array_length(p_ingredients)=0 then raise exception 'Add at least one ingredient'; end if;
  perform 1 from public.menu_items where id=p_menu_item_id;
  if not found then raise exception 'Menu item not found'; end if;
  select coalesce(max(version),0)+1 into v_version from public.inventory_recipes where name=trim(p_name);
  update public.inventory_recipes set is_active=false,effective_until=now()
    where menu_item_id=p_menu_item_id and is_active=true;
  insert into public.inventory_recipes(menu_item_id,name,version,output_quantity,output_unit,effective_from,is_active,created_by_staff_id)
  values(p_menu_item_id,trim(p_name),v_version,p_output_quantity,trim(p_output_unit),now(),true,p_actor_staff_id)
  returning * into v_recipe;
  for v_line in select value from jsonb_array_elements(p_ingredients) loop
    if nullif(v_line->>'inventory_item_id','') is null or nullif(v_line->>'unit','') is null
      or coalesce((v_line->>'quantity')::numeric,0)<=0 then raise exception 'Invalid ingredient line'; end if;
    select * into v_item from public.inventory_items where id=(v_line->>'inventory_item_id')::uuid and is_active;
    if not found then raise exception 'Ingredient is unavailable'; end if;
    if lower(trim(v_item.base_unit)) <> lower(trim(v_line->>'unit')) then raise exception 'Ingredient unit must match its inventory base unit'; end if;
    insert into public.inventory_recipe_items(recipe_id,inventory_item_id,quantity,unit,notes)
    values(v_recipe.id,v_item.id,(v_line->>'quantity')::numeric,trim(v_line->>'unit'),nullif(trim(coalesce(v_line->>'notes','')),''));
  end loop;
  insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
  values(p_actor_staff_id,'inventory.recipe_version_created',jsonb_build_object('recipe_id',v_recipe.id,'menu_item_id',p_menu_item_id,'version',v_version));
  return jsonb_build_object('recipe_id',v_recipe.id,'version',v_version,'menu_item_id',p_menu_item_id);
end;
$$;

create or replace function public.bigfoods_inventory_finish_production(
  p_actor_staff_id uuid,
  p_batch_id uuid,
  p_output_quantity numeric,
  p_unprocessed_quantity numeric,
  p_actual_loss_quantity numeric,
  p_review_note text default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_actor public.bigfoods_staff%rowtype;
  v_prod public.inventory_production_batches%rowtype;
  v_input public.inventory_batches%rowtype;
  v_output_item public.inventory_items%rowtype;
  v_output_batch public.inventory_batches%rowtype;
  v_variance numeric(14,4);
  v_movement public.inventory_movements%rowtype;
begin
  select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
  if not found or v_actor.must_change_password then raise exception 'Forbidden'; end if;
  if not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.process"]'::jsonb) then raise exception 'Forbidden'; end if;
  select * into v_prod from public.inventory_production_batches where id=p_batch_id for update;
  if not found or v_prod.status <> 'in_progress' then raise exception 'Production batch is not in progress'; end if;
  if p_output_quantity is null or p_output_quantity<=0 or p_unprocessed_quantity is null or p_unprocessed_quantity<0
     or p_actual_loss_quantity is null or p_actual_loss_quantity<0 then raise exception 'Production quantities cannot be negative'; end if;
  if p_unprocessed_quantity+p_actual_loss_quantity > v_prod.raw_input_quantity then raise exception 'Unprocessed quantity plus loss exceeds raw input'; end if;
  v_variance := v_prod.raw_input_quantity-p_output_quantity-p_unprocessed_quantity-p_actual_loss_quantity;
  if v_prod.input_batch_id is not null then
    select * into v_input from public.inventory_batches where id=v_prod.input_batch_id for update;
    if not found or v_input.remaining_quantity < v_prod.raw_input_quantity then raise exception 'Insufficient raw input batch stock'; end if;
    update public.inventory_batches set remaining_quantity=remaining_quantity-v_prod.raw_input_quantity,
      status=case when remaining_quantity-v_prod.raw_input_quantity=0 then 'depleted' else status end
      where id=v_input.id returning * into v_input;
    insert into public.inventory_movements(inventory_item_id,batch_id,movement_type,quantity,direction,base_unit,unit_cost,reason,actor_staff_id,metadata)
    values(v_prod.input_inventory_item_id,v_input.id,'production_input',v_prod.raw_input_quantity,'out',v_prod.raw_input_unit,v_input.unit_cost,'Production input consumed',p_actor_staff_id,jsonb_build_object('production_batch_id',v_prod.id));
  else
    raise exception 'A source stock batch is required to finish production';
  end if;
  select * into v_output_item from public.inventory_items where id=v_prod.output_inventory_item_id and is_active;
  if not found then raise exception 'Output inventory item is unavailable'; end if;
  insert into public.inventory_batches(inventory_item_id,batch_code,received_quantity,remaining_quantity,base_unit,received_at,status,received_by_staff_id,notes)
  values(v_output_item.id,'PROD-'||replace(v_prod.batch_code,' ','-'),p_output_quantity,p_output_quantity,v_prod.output_unit,now(),
    case when p_output_quantity=0 then 'depleted' else 'active' end,p_actor_staff_id,'Production output from '||v_prod.batch_code)
  returning * into v_output_batch;
  if p_output_quantity>0 then
    insert into public.inventory_movements(inventory_item_id,batch_id,movement_type,quantity,direction,base_unit,reason,actor_staff_id,metadata)
    values(v_output_item.id,v_output_batch.id,'production_output',p_output_quantity,'in',v_prod.output_unit,'Production output recorded',p_actor_staff_id,jsonb_build_object('production_batch_id',v_prod.id));
  end if;
  update public.inventory_production_batches set output_quantity=p_output_quantity,unprocessed_quantity=p_unprocessed_quantity,
    actual_loss_quantity=p_actual_loss_quantity,variance_quantity=v_variance,
    status=case when abs(v_variance)>allowed_loss_quantity then 'pending_review' else 'confirmed' end,
    finished_by_staff_id=p_actor_staff_id,finished_at=now(),review_note=nullif(trim(coalesce(p_review_note,'')),'')
    where id=v_prod.id returning * into v_prod;
  if v_prod.status='pending_review' then
    insert into public.inventory_alerts(inventory_item_id,production_batch_id,alert_type,severity,title,details,created_by_staff_id)
    values(v_prod.input_inventory_item_id,v_prod.id,'large_variance','warning','Production yield needs review',
      jsonb_build_object('raw_input',v_prod.raw_input_quantity,'output',p_output_quantity,'unprocessed',p_unprocessed_quantity,
      'allowed_loss',v_prod.allowed_loss_quantity,'actual_loss',p_actual_loss_quantity,'variance',v_variance),p_actor_staff_id);
  end if;
  insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
  values(p_actor_staff_id,'inventory.production_finished',jsonb_build_object('production_batch_id',v_prod.id,'output_batch_id',v_output_batch.id,'variance',v_variance,'status',v_prod.status));
  return jsonb_build_object('production_batch_id',v_prod.id,'output_batch_id',v_output_batch.id,'variance',v_variance,'status',v_prod.status);
end;
$$;

revoke all on function public.bigfoods_inventory_log_waste(uuid,uuid,numeric,text) from public, anon, authenticated;
grant execute on function public.bigfoods_inventory_log_waste(uuid,uuid,numeric,text) to service_role;
revoke all on function public.bigfoods_inventory_save_recipe(uuid,uuid,text,numeric,text,jsonb) from public, anon, authenticated;
grant execute on function public.bigfoods_inventory_save_recipe(uuid,uuid,text,numeric,text,jsonb) to service_role;
revoke all on function public.bigfoods_inventory_finish_production(uuid,uuid,numeric,numeric,numeric,text) from public, anon, authenticated;
grant execute on function public.bigfoods_inventory_finish_production(uuid,uuid,numeric,numeric,numeric,text) to service_role;
