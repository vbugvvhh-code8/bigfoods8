create or replace function public.bigfoods_inventory_save_inhouse_recipe(
  p_actor_staff_id uuid,
  p_bigfoods_pos_item_id uuid,
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
  if nullif(trim(p_name),'') is null or nullif(trim(p_output_unit),'') is null or p_output_quantity is null or p_output_quantity<=0 then
    raise exception 'Recipe name, output and unit are required';
  end if;
  if coalesce(jsonb_typeof(p_ingredients),'') <> 'array' or jsonb_array_length(p_ingredients)=0 then
    raise exception 'Add at least one ingredient';
  end if;
  perform 1 from public.bigfoods_pos_items where id=p_bigfoods_pos_item_id;
  if not found then raise exception 'BigFoods POS catalogue item not found'; end if;
  select coalesce(max(version),0)+1 into v_version
    from public.inventory_recipes where bigfoods_pos_item_id=p_bigfoods_pos_item_id and name=trim(p_name);
  update public.inventory_recipes set is_active=false,effective_until=now()
    where bigfoods_pos_item_id=p_bigfoods_pos_item_id and is_active=true;
  insert into public.inventory_recipes(bigfoods_pos_item_id,name,version,output_quantity,output_unit,effective_from,is_active,created_by_staff_id)
  values(p_bigfoods_pos_item_id,trim(p_name),v_version,p_output_quantity,trim(p_output_unit),now(),true,p_actor_staff_id)
  returning * into v_recipe;
  for v_line in select value from jsonb_array_elements(p_ingredients) loop
    if nullif(v_line->>'inventory_item_id','') is null or nullif(v_line->>'unit','') is null
      or coalesce((v_line->>'quantity')::numeric,0)<=0 then raise exception 'Invalid ingredient line'; end if;
    select * into v_item from public.inventory_items where id=(v_line->>'inventory_item_id')::uuid and is_active;
    if not found then raise exception 'Ingredient is unavailable'; end if;
    if lower(trim(v_item.base_unit)) <> lower(trim(v_line->>'unit')) then
      raise exception 'Ingredient unit must match its inventory base unit';
    end if;
    insert into public.inventory_recipe_items(recipe_id,inventory_item_id,quantity,unit,notes)
    values(v_recipe.id,v_item.id,(v_line->>'quantity')::numeric,trim(v_line->>'unit'),nullif(trim(coalesce(v_line->>'notes','')),''));
  end loop;
  insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
  values(p_actor_staff_id,'inventory.inhouse_recipe_version_created',
    jsonb_build_object('recipe_id',v_recipe.id,'bigfoods_pos_item_id',p_bigfoods_pos_item_id,'version',v_version));
  return jsonb_build_object('recipe_id',v_recipe.id,'version',v_version,'bigfoods_pos_item_id',p_bigfoods_pos_item_id);
end;
$$;
revoke all on function public.bigfoods_inventory_save_inhouse_recipe(uuid,uuid,text,numeric,text,jsonb) from public, anon, authenticated;
grant execute on function public.bigfoods_inventory_save_inhouse_recipe(uuid,uuid,text,numeric,text,jsonb) to service_role;
