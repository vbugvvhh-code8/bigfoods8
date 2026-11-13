create table if not exists public.inventory_kitchen_preparations (
 id uuid primary key default gen_random_uuid(),
 prep_code text not null unique,
 recipe_id uuid not null references public.inventory_recipes(id),
 bigfoods_pos_item_id uuid not null references public.bigfoods_pos_items(id),
 requested_portions numeric(14,4) not null check(requested_portions>0),
 recipe_version integer not null,
 recipe_name text not null,
 status text not null default 'queued' check(status in ('queued','in_progress','completed','cancelled','blocked')),
 ingredient_snapshot jsonb not null default '[]'::jsonb,
 requested_by_staff_id uuid not null references public.bigfoods_staff(id),
 started_by_staff_id uuid references public.bigfoods_staff(id),
 completed_by_staff_id uuid references public.bigfoods_staff(id),
 requested_at timestamptz not null default now(),
 started_at timestamptz,
 completed_at timestamptz,
 notes text
);
create index if not exists inventory_kitchen_preparations_queue_idx on public.inventory_kitchen_preparations(status,requested_at desc);
create table if not exists public.inventory_kitchen_preparation_consumptions (
 id uuid primary key default gen_random_uuid(),
 preparation_id uuid not null references public.inventory_kitchen_preparations(id) on delete cascade,
 inventory_item_id uuid not null references public.inventory_items(id),
 batch_id uuid not null references public.inventory_batches(id),
 quantity numeric(14,4) not null check(quantity>0),
 base_unit text not null,
 created_at timestamptz not null default now(),
 unique(preparation_id,batch_id,inventory_item_id)
);

create or replace function public.bigfoods_kitchen_create_preparation(p_actor_staff_id uuid,p_recipe_id uuid,p_portions numeric,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_actor public.bigfoods_staff%rowtype; v_recipe public.inventory_recipes%rowtype; v_code text; v_prep public.inventory_kitchen_preparations%rowtype;
 v_lines jsonb; v_line record; v_required numeric; v_available numeric;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.process"]'::jsonb) then raise exception 'Forbidden'; end if;
 if p_portions is null or p_portions<=0 then raise exception 'Enter a valid portion quantity'; end if;
 select * into v_recipe from public.inventory_recipes where id=p_recipe_id and is_active for share;
 if not found or v_recipe.bigfoods_pos_item_id is null then raise exception 'Active menu recipe not found'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('inventory_item_id',ri.inventory_item_id,'name',ii.name,'quantity',ri.quantity*(p_portions/v_recipe.output_quantity),'unit',ii.base_unit)), '[]'::jsonb)
 into v_lines from public.inventory_recipe_items ri join public.inventory_items ii on ii.id=ri.inventory_item_id
 where ri.recipe_id=v_recipe.id and ii.is_active;
 if jsonb_array_length(v_lines)=0 then raise exception 'Recipe has no active ingredients'; end if;
 for v_line in select * from jsonb_to_recordset(v_lines) as x(inventory_item_id uuid,name text,quantity numeric,unit text) loop
  select coalesce(sum(remaining_quantity),0) into v_available from public.inventory_batches where inventory_item_id=v_line.inventory_item_id and status='active';
  if v_available<v_line.quantity then raise exception 'Insufficient stock for %: need %, available % %',v_line.name,v_line.quantity,v_available,v_line.unit; end if;
 end loop;
 v_code:=public.bigfoods_inventory_next_batch_code('kitchen');
 insert into public.inventory_kitchen_preparations(prep_code,recipe_id,bigfoods_pos_item_id,requested_portions,recipe_version,recipe_name,ingredient_snapshot,requested_by_staff_id,notes)
 values(v_code,v_recipe.id,v_recipe.bigfoods_pos_item_id,p_portions,v_recipe.version,v_recipe.name,v_lines,p_actor_staff_id,nullif(trim(coalesce(p_notes,'')),''))
 returning * into v_prep;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details) values(p_actor_staff_id,'inventory.kitchen_preparation_queued',jsonb_build_object('preparation_id',v_prep.id,'prep_code',v_code,'portions',p_portions));
 return jsonb_build_object('id',v_prep.id,'prep_code',v_code,'status',v_prep.status);
end; $$;

create or replace function public.bigfoods_kitchen_start_preparation(p_actor_staff_id uuid,p_preparation_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_actor public.bigfoods_staff%rowtype; v_prep public.inventory_kitchen_preparations%rowtype; v_line record; v_batch public.inventory_batches%rowtype; v_take numeric; v_left numeric; v_available numeric;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.process"]'::jsonb) then raise exception 'Forbidden'; end if;
 select * into v_prep from public.inventory_kitchen_preparations where id=p_preparation_id for update;
 if not found or v_prep.status<>'queued' then raise exception 'Preparation is not queued'; end if;
 for v_line in select * from jsonb_to_recordset(v_prep.ingredient_snapshot) as x(inventory_item_id uuid,name text,quantity numeric,unit text) loop
  v_left:=v_line.quantity;
  for v_batch in select * from public.inventory_batches where inventory_item_id=v_line.inventory_item_id and status='active' and remaining_quantity>0 order by expires_at nulls last,received_at,id for update loop
   exit when v_left<=0;
   v_take:=least(v_left,v_batch.remaining_quantity);
   update public.inventory_batches set remaining_quantity=remaining_quantity-v_take,status=case when remaining_quantity-v_take=0 then 'depleted' else status end where id=v_batch.id;
   insert into public.inventory_kitchen_preparation_consumptions(preparation_id,inventory_item_id,batch_id,quantity,base_unit) values(v_prep.id,v_line.inventory_item_id,v_batch.id,v_take,v_batch.base_unit);
   insert into public.inventory_movements(inventory_item_id,batch_id,movement_type,quantity,direction,base_unit,unit_cost,reason,source_type,source_id,actor_staff_id,metadata)
   values(v_line.inventory_item_id,v_batch.id,'kitchen_consumption',v_take,'out',v_batch.base_unit,v_batch.unit_cost,'Kitchen preparation started','kitchen_preparation',v_prep.id::text,p_actor_staff_id,jsonb_build_object('prep_code',v_prep.prep_code));
   v_left:=v_left-v_take;
  end loop;
  if v_left>0 then raise exception 'Stock changed before preparation started. Refresh the plan and try again.'; end if;
 end loop;
 update public.inventory_kitchen_preparations set status='in_progress',started_by_staff_id=p_actor_staff_id,started_at=now() where id=v_prep.id;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details) values(p_actor_staff_id,'inventory.kitchen_preparation_started',jsonb_build_object('preparation_id',v_prep.id,'prep_code',v_prep.prep_code));
 return jsonb_build_object('id',v_prep.id,'prep_code',v_prep.prep_code,'status','in_progress');
end; $$;

create or replace function public.bigfoods_kitchen_finish_preparation(p_actor_staff_id uuid,p_preparation_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.bigfoods_staff%rowtype; v_prep public.inventory_kitchen_preparations%rowtype;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.process"]'::jsonb) then raise exception 'Forbidden'; end if;
 select * into v_prep from public.inventory_kitchen_preparations where id=p_preparation_id for update;
 if not found or v_prep.status<>'in_progress' then raise exception 'Preparation is not in progress'; end if;
 update public.inventory_kitchen_preparations set status='completed',completed_by_staff_id=p_actor_staff_id,completed_at=now(),notes=coalesce(nullif(trim(coalesce(p_notes,'')),''),notes) where id=v_prep.id;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details) values(p_actor_staff_id,'inventory.kitchen_preparation_completed',jsonb_build_object('preparation_id',v_prep.id,'prep_code',v_prep.prep_code));
 return jsonb_build_object('id',v_prep.id,'prep_code',v_prep.prep_code,'status','completed');
end; $$;
revoke all on function public.bigfoods_kitchen_create_preparation(uuid,uuid,numeric,text) from public,anon,authenticated;
revoke all on function public.bigfoods_kitchen_start_preparation(uuid,uuid) from public,anon,authenticated;
revoke all on function public.bigfoods_kitchen_finish_preparation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.bigfoods_kitchen_create_preparation(uuid,uuid,numeric,text) to service_role;
grant execute on function public.bigfoods_kitchen_start_preparation(uuid,uuid) to service_role;
grant execute on function public.bigfoods_kitchen_finish_preparation(uuid,uuid,text) to service_role;
