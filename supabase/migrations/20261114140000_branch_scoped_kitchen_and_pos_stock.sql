-- Branch-safe kitchen preparation and POS stock deduction.
-- Every kitchen RPC resolves the branch from the actor's open attendance record.
create or replace function public.bigfoods_kitchen_create_preparation(
 p_actor_staff_id uuid,p_recipe_id uuid,p_portions numeric,p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_actor public.bigfoods_staff%rowtype; v_branch uuid; v_recipe public.inventory_recipes%rowtype;
 v_code text; v_prep public.inventory_kitchen_preparations%rowtype; v_lines jsonb; v_line record; v_available numeric;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.process"]'::jsonb) then raise exception 'Forbidden'; end if;
 select work_location_id into v_branch from public.bigfoods_staff_attendance where staff_id=p_actor_staff_id and checked_out_at is null for share;
 if v_branch is null then raise exception 'Check in at your assigned branch before creating a kitchen preparation'; end if;
 if p_portions is null or p_portions<=0 or p_portions<>trunc(p_portions) then raise exception 'Enter a valid whole number of portions'; end if;
 select * into v_recipe from public.inventory_recipes where id=p_recipe_id and is_active for share;
 if not found or v_recipe.bigfoods_pos_item_id is null then raise exception 'Active menu recipe not found'; end if;
 if not exists(select 1 from public.bigfoods_pos_branch_items where work_location_id=v_branch and pos_item_id=v_recipe.bigfoods_pos_item_id and is_available) then
   raise exception 'This menu item is not enabled in your assigned branch catalogue';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('inventory_item_id',ri.inventory_item_id,'name',ii.name,'quantity',ri.quantity*(p_portions/v_recipe.output_quantity),'unit',ii.base_unit)), '[]'::jsonb)
 into v_lines from public.inventory_recipe_items ri join public.inventory_items ii on ii.id=ri.inventory_item_id
 where ri.recipe_id=v_recipe.id and ii.is_active;
 if jsonb_array_length(v_lines)=0 then raise exception 'Recipe has no active ingredients'; end if;
 for v_line in select * from jsonb_to_recordset(v_lines) as x(inventory_item_id uuid,name text,quantity numeric,unit text) loop
   select coalesce(sum(remaining_quantity),0) into v_available from public.inventory_batches
   where inventory_item_id=v_line.inventory_item_id and work_location_id=v_branch and status='active';
   if v_available<v_line.quantity then raise exception 'Insufficient branch stock for %: need %, available % %',v_line.name,v_line.quantity,v_available,v_line.unit; end if;
 end loop;
 v_code:=public.bigfoods_inventory_next_batch_code('kitchen');
 insert into public.inventory_kitchen_preparations(prep_code,recipe_id,bigfoods_pos_item_id,requested_portions,recipe_version,recipe_name,ingredient_snapshot,requested_by_staff_id,notes,work_location_id)
 values(v_code,v_recipe.id,v_recipe.bigfoods_pos_item_id,p_portions,v_recipe.version,v_recipe.name,v_lines,p_actor_staff_id,nullif(trim(coalesce(p_notes,'')),''),v_branch)
 returning * into v_prep;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
 values(p_actor_staff_id,'inventory.kitchen_preparation_queued',jsonb_build_object('preparation_id',v_prep.id,'prep_code',v_code,'portions',p_portions,'work_location_id',v_branch));
 return jsonb_build_object('id',v_prep.id,'prep_code',v_code,'status',v_prep.status,'work_location_id',v_branch);
end; $$;

create or replace function public.bigfoods_kitchen_start_preparation(p_actor_staff_id uuid,p_preparation_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_actor public.bigfoods_staff%rowtype; v_branch uuid; v_prep public.inventory_kitchen_preparations%rowtype;
 v_line record; v_batch public.inventory_batches%rowtype; v_take numeric; v_left numeric;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.process"]'::jsonb) then raise exception 'Forbidden'; end if;
 select work_location_id into v_branch from public.bigfoods_staff_attendance where staff_id=p_actor_staff_id and checked_out_at is null for share;
 if v_branch is null then raise exception 'Check in at your assigned branch before starting preparation'; end if;
 select * into v_prep from public.inventory_kitchen_preparations where id=p_preparation_id for update;
 if not found or v_prep.status<>'queued' then raise exception 'Preparation is not queued'; end if;
 if v_prep.work_location_id is distinct from v_branch then raise exception 'Preparation belongs to another branch'; end if;
 for v_line in select * from jsonb_to_recordset(v_prep.ingredient_snapshot) as x(inventory_item_id uuid,name text,quantity numeric,unit text) loop
   v_left:=v_line.quantity;
   for v_batch in select * from public.inventory_batches
     where inventory_item_id=v_line.inventory_item_id and work_location_id=v_branch and status='active' and remaining_quantity>0
     order by expires_at nulls last,received_at,id for update
   loop
     exit when v_left<=0;
     v_take:=least(v_left,v_batch.remaining_quantity);
     update public.inventory_batches set remaining_quantity=remaining_quantity-v_take,
       status=case when remaining_quantity-v_take=0 then 'depleted' else status end where id=v_batch.id;
     insert into public.inventory_kitchen_preparation_consumptions(preparation_id,inventory_item_id,batch_id,quantity,base_unit)
     values(v_prep.id,v_line.inventory_item_id,v_batch.id,v_take,v_batch.base_unit);
     insert into public.inventory_movements(inventory_item_id,batch_id,movement_type,quantity,direction,base_unit,unit_cost,reason,source_type,source_id,actor_staff_id,metadata)
     values(v_line.inventory_item_id,v_batch.id,'kitchen_consumption',v_take,'out',v_batch.base_unit,v_batch.unit_cost,'Kitchen preparation started','kitchen_preparation',v_prep.id::text,p_actor_staff_id,jsonb_build_object('prep_code',v_prep.prep_code,'work_location_id',v_branch));
     v_left:=v_left-v_take;
   end loop;
   if v_left>0 then raise exception 'Insufficient branch stock for %. Refresh the preparation plan.',v_line.name; end if;
 end loop;
 update public.inventory_kitchen_preparations set status='in_progress',started_by_staff_id=p_actor_staff_id,started_at=now() where id=v_prep.id;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
 values(p_actor_staff_id,'inventory.kitchen_preparation_started',jsonb_build_object('preparation_id',v_prep.id,'prep_code',v_prep.prep_code,'work_location_id',v_branch));
 return jsonb_build_object('id',v_prep.id,'prep_code',v_prep.prep_code,'status','in_progress');
end; $$;

create or replace function public.bigfoods_kitchen_finish_preparation(p_actor_staff_id uuid,p_preparation_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_actor public.bigfoods_staff%rowtype; v_branch uuid; v_prep public.inventory_kitchen_preparations%rowtype;
 v_stock public.bigfoods_pos_branch_menu_stock%rowtype; v_new integer;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.process"]'::jsonb) then raise exception 'Forbidden'; end if;
 select work_location_id into v_branch from public.bigfoods_staff_attendance where staff_id=p_actor_staff_id and checked_out_at is null for share;
 if v_branch is null then raise exception 'Check in at your assigned branch before completing preparation'; end if;
 select * into v_prep from public.inventory_kitchen_preparations where id=p_preparation_id for update;
 if not found or v_prep.status<>'in_progress' then raise exception 'Preparation is not in progress'; end if;
 if v_prep.work_location_id is distinct from v_branch then raise exception 'Preparation belongs to another branch'; end if;
 if v_prep.requested_portions<=0 or v_prep.requested_portions<>trunc(v_prep.requested_portions) then raise exception 'Kitchen output must be a whole number of portions'; end if;
 insert into public.bigfoods_pos_branch_menu_stock(work_location_id,pos_item_id,track_stock,stock_quantity,low_stock_alert,updated_by_staff_id,updated_at)
 values(v_branch,v_prep.bigfoods_pos_item_id,true,v_prep.requested_portions::integer,10,p_actor_staff_id,now())
 on conflict(work_location_id,pos_item_id) do update set
 stock_quantity=public.bigfoods_pos_branch_menu_stock.stock_quantity+excluded.stock_quantity,
 track_stock=true,updated_by_staff_id=excluded.updated_by_staff_id,updated_at=now()
 returning * into v_stock;
 v_new:=v_stock.stock_quantity;
 update public.inventory_kitchen_preparations set status='completed',completed_by_staff_id=p_actor_staff_id,completed_at=now(),
 menu_stock_added_quantity=v_prep.requested_portions,notes=coalesce(nullif(trim(coalesce(p_notes,'')),''),notes)
 where id=v_prep.id;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
 values(p_actor_staff_id,'inventory.kitchen_preparation_completed',jsonb_build_object('preparation_id',v_prep.id,'prep_code',v_prep.prep_code,'pos_item_id',v_prep.bigfoods_pos_item_id,'portions_added',v_prep.requested_portions,'branch_stock',v_new,'work_location_id',v_branch));
 return jsonb_build_object('id',v_prep.id,'prep_code',v_prep.prep_code,'status','completed','pos_item_id',v_prep.bigfoods_pos_item_id,'portions_added',v_prep.requested_portions,'branch_stock',v_new);
end; $$;

revoke all on function public.bigfoods_kitchen_create_preparation(uuid,uuid,numeric,text) from public,anon,authenticated;
revoke all on function public.bigfoods_kitchen_start_preparation(uuid,uuid) from public,anon,authenticated;
revoke all on function public.bigfoods_kitchen_finish_preparation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.bigfoods_kitchen_create_preparation(uuid,uuid,numeric,text) to service_role;
grant execute on function public.bigfoods_kitchen_start_preparation(uuid,uuid) to service_role;
grant execute on function public.bigfoods_kitchen_finish_preparation(uuid,uuid,text) to service_role;

-- POS checkout is one transaction: branch catalogue validation, branch price,
-- stock lock/deduction, sale write and sale-line price snapshots all commit/rollback together.
create or replace function public.bigfoods_pos_checkout_priced(
 p_session_id uuid,p_cashier_staff_id uuid,p_idempotency_key uuid,p_payment_method text,p_items jsonb,
 p_cash_received numeric default null,p_payment_reference text default null,p_discount_amount numeric default 0,
 p_customer_email text default null,p_actor_role text default 'cashier'
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_settings public.bigfoods_pos_settings%rowtype; v_attendance public.bigfoods_staff_attendance%rowtype;
 v_existing public.bigfoods_pos_sales%rowtype; v_result jsonb; v_sale_id uuid;
 v_item jsonb; v_product public.bigfoods_pos_items%rowtype; v_branch_item public.bigfoods_pos_branch_items%rowtype;
 v_stock public.bigfoods_pos_branch_menu_stock%rowtype; v_qty integer; v_price numeric(14,2);
 v_subtotal numeric(14,2):=0; v_base_subtotal numeric(14,2):=0; v_discount numeric(14,2); v_tax numeric(14,2); v_total numeric(14,2); v_cash numeric(14,2);
begin
 select * into v_existing from public.bigfoods_pos_sales where idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('sale_id',v_existing.id,'receipt_number',v_existing.receipt_number,'total_amount',v_existing.total_amount,'status',v_existing.status,'replayed',true); end if;
 select * into v_attendance from public.bigfoods_staff_attendance where staff_id=p_cashier_staff_id and checked_out_at is null for update;
 if not found or v_attendance.work_location_id is null then raise exception 'Active assigned-branch attendance is required'; end if;
 select * into v_settings from public.bigfoods_pos_settings where id=true;
 if not found then raise exception 'POS pricing settings are unavailable'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 basket lines'; end if;
 v_discount:=greatest(0,coalesce(p_discount_amount,0));
 if v_discount>0 then
   if not v_settings.discount_enabled then raise exception 'Discounts are currently disabled'; end if;
   if not (lower(coalesce(p_actor_role,''))=any(select lower(x) from unnest(v_settings.discount_allowed_roles) x)) then raise exception 'Your staff role is not allowed to apply discounts'; end if;
 end if;
 if p_customer_email is not null and (length(trim(p_customer_email))>254 or trim(p_customer_email)!~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$') then raise exception 'Enter a valid customer email address'; end if;
 -- Lock and validate every branch stock row before any write; reject duplicate lines
 -- only after normalizing them into one quantity per product.
 for v_item in
   select jsonb_build_object('product_id',product_id,'quantity',sum(quantity)::integer) as value
   from (select (value->>'product_id')::uuid as product_id,(value->>'quantity')::integer as quantity
         from jsonb_array_elements(p_items)) q
   group by product_id
 loop
   v_qty:=(v_item.value->>'quantity')::integer;
   if v_qty<1 or v_qty>9900 then raise exception 'Invalid item quantity'; end if;
   select * into v_product from public.bigfoods_pos_items where id=(v_item.value->>'product_id')::uuid and is_available=true;
   if not found then raise exception 'A basket product is unavailable'; end if;
   select * into v_branch_item from public.bigfoods_pos_branch_items
     where work_location_id=v_attendance.work_location_id and pos_item_id=v_product.id and is_available for share;
   if not found then raise exception 'A basket item is not enabled at your assigned branch'; end if;
   v_price:=coalesce(v_branch_item.selling_price,v_product.selling_price);
   v_subtotal:=v_subtotal+v_price*v_qty;
   v_base_subtotal:=v_base_subtotal+v_product.selling_price*v_qty;
   select * into v_stock from public.bigfoods_pos_branch_menu_stock
     where work_location_id=v_attendance.work_location_id and pos_item_id=v_product.id for update;
   if found and v_stock.track_stock and v_stock.stock_quantity<v_qty then raise exception 'Insufficient prepared stock for %',v_product.name; end if;
 end loop;
 if v_discount>v_subtotal then raise exception 'Discount cannot exceed the subtotal'; end if;
 if v_subtotal>0 and v_discount/v_subtotal*100>v_settings.discount_max_percent then raise exception 'Discount exceeds the maximum allowed percentage'; end if;
 v_tax:=case when v_settings.tax_enabled then round(((v_subtotal-v_discount)*v_settings.tax_rate/100),2) else 0 end;
 v_total:=v_subtotal-v_discount+v_tax;
 if p_payment_method='cash' then
   if p_cash_received is null or p_cash_received<v_total then raise exception 'Cash received must cover the final total'; end if;
   v_cash:=greatest(p_cash_received,v_base_subtotal);
 else v_cash:=null; end if;
 v_result:=public.bigfoods_pos_checkout(p_session_id,p_cashier_staff_id,p_idempotency_key,p_payment_method,p_items,v_cash,p_payment_reference);
 v_sale_id:=(v_result->>'sale_id')::uuid;
 if coalesce((v_result->>'replayed')::boolean,false) then return v_result; end if;
 -- Snapshot branch prices on the sale lines and consume prepared portions.
 for v_item in
   select jsonb_build_object('product_id',product_id,'quantity',sum(quantity)::integer) as value
   from (select (value->>'product_id')::uuid as product_id,(value->>'quantity')::integer as quantity
         from jsonb_array_elements(p_items)) q
   group by product_id
 loop
   v_qty:=(v_item.value->>'quantity')::integer;
   select * into v_product from public.bigfoods_pos_items where id=(v_item.value->>'product_id')::uuid;
   select * into v_branch_item from public.bigfoods_pos_branch_items
     where work_location_id=v_attendance.work_location_id and pos_item_id=v_product.id;
   v_price:=coalesce(v_branch_item.selling_price,v_product.selling_price);
   update public.bigfoods_pos_sale_items set unit_price=v_price,line_total=v_price*quantity
     where sale_id=v_sale_id and product_id=v_product.id;
   update public.bigfoods_pos_branch_menu_stock set stock_quantity=stock_quantity-v_qty,
     updated_at=now() where work_location_id=v_attendance.work_location_id and pos_item_id=v_product.id
       and track_stock=true;
 end loop;
 update public.bigfoods_pos_sales set subtotal=v_subtotal,discount_amount=v_discount,tax_amount=v_tax,total_amount=v_total,
   customer_email=nullif(trim(coalesce(p_customer_email,'')),''),
   cash_received=case when p_payment_method='cash' then p_cash_received else null end,
   change_due=case when p_payment_method='cash' then p_cash_received-v_total else 0 end,
   work_location_id=v_attendance.work_location_id
 where id=v_sale_id;
 update public.bigfoods_pos_payments set amount=v_total where sale_id=v_sale_id;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
 values(p_cashier_staff_id,'pos.branch_stock_deducted',jsonb_build_object('sale_id',v_sale_id,'work_location_id',v_attendance.work_location_id,'items',p_items));
 return v_result||jsonb_build_object('subtotal',v_subtotal,'discount_amount',v_discount,'tax_amount',v_tax,'total_amount',v_total,
   'cash_received',p_cash_received,'change_due',case when p_payment_method='cash' then p_cash_received-v_total else 0 end,
   'work_location_id',v_attendance.work_location_id);
end; $$;
revoke all on function public.bigfoods_pos_checkout_priced(uuid,uuid,uuid,text,jsonb,numeric,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_checkout_priced(uuid,uuid,uuid,text,jsonb,numeric,text,numeric,text,text) to service_role;

-- Only queued preparations can be cancelled without inventory reversal. Once
-- started, ingredient consumption is immutable and requires a dedicated reversal.
create or replace function public.bigfoods_kitchen_cancel_preparation(
 p_actor_staff_id uuid,p_preparation_id uuid,p_reason text default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor public.bigfoods_staff%rowtype; v_branch uuid; v_prep public.inventory_kitchen_preparations%rowtype;
begin
 select * into v_actor from public.bigfoods_staff where id=p_actor_staff_id and is_active for share;
 if not found or v_actor.must_change_password or not (v_actor.role in ('owner','admin','inventory') or v_actor.permissions @> '["inventory.process"]'::jsonb) then raise exception 'Forbidden'; end if;
 select work_location_id into v_branch from public.bigfoods_staff_attendance where staff_id=p_actor_staff_id and checked_out_at is null for share;
 if v_branch is null then raise exception 'Check in at your assigned branch before cancelling preparation'; end if;
 select * into v_prep from public.inventory_kitchen_preparations where id=p_preparation_id for update;
 if not found or v_prep.work_location_id is distinct from v_branch then raise exception 'Preparation not found in your assigned branch'; end if;
 if v_prep.status<>'queued' then raise exception 'Only queued preparations can be cancelled. Started preparations require an inventory reversal review.'; end if;
 update public.inventory_kitchen_preparations set status='cancelled',
   notes=concat_ws(E'\n',nullif(notes,''),nullif(trim(coalesce(p_reason,'')),''),'Cancelled by staff')
 where id=v_prep.id;
 insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details)
 values(p_actor_staff_id,'inventory.kitchen_preparation_cancelled',jsonb_build_object('preparation_id',v_prep.id,'prep_code',v_prep.prep_code,'reason',nullif(trim(coalesce(p_reason,'')),''),'work_location_id',v_branch));
 return jsonb_build_object('id',v_prep.id,'prep_code',v_prep.prep_code,'status','cancelled');
end; $$;
revoke all on function public.bigfoods_kitchen_cancel_preparation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.bigfoods_kitchen_cancel_preparation(uuid,uuid,text) to service_role;
