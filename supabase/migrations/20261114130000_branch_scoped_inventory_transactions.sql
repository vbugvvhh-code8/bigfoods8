-- Attendance-derived branch enforcement for ingredient receipts and waste.
-- The Edge Function resolves the branch from the staff member's open attendance;
-- these service-role RPCs bind the transaction to that branch in the same DB transaction.
create or replace function public.bigfoods_inventory_receive_for_branch(
  p_work_location_id uuid,
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
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_result jsonb; v_batch_id uuid;
begin
  if not exists (
    select 1 from public.bigfoods_staff_attendance a
    join public.bigfoods_staff_work_locations l on l.id=a.work_location_id and l.is_active
    where a.staff_id=p_actor_staff_id and a.work_location_id=p_work_location_id and a.checked_out_at is null
  ) then raise exception 'Active assigned-branch attendance required'; end if;
  v_result := public.bigfoods_inventory_receive(
    p_actor_staff_id,p_inventory_item_id,p_batch_code,p_quantity,p_unit,p_supplier_name,
    p_supplier_reference,p_unit_cost,p_currency,p_received_at,p_expires_at,p_notes
  );
  v_batch_id := (v_result->>'batch_id')::uuid;
  update public.inventory_batches set work_location_id=p_work_location_id where id=v_batch_id;
  update public.inventory_movements set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('work_location_id',p_work_location_id)
    where batch_id=v_batch_id and movement_type='receipt';
  return v_result || jsonb_build_object('work_location_id',p_work_location_id);
end; $$;

create or replace function public.bigfoods_inventory_log_waste_for_branch(
  p_work_location_id uuid,
  p_actor_staff_id uuid,
  p_batch_id uuid,
  p_quantity numeric,
  p_reason text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not exists (
    select 1 from public.bigfoods_staff_attendance a
    join public.bigfoods_staff_work_locations l on l.id=a.work_location_id and l.is_active
    where a.staff_id=p_actor_staff_id and a.work_location_id=p_work_location_id and a.checked_out_at is null
  ) then raise exception 'Active assigned-branch attendance required'; end if;
  if not exists(select 1 from public.inventory_batches where id=p_batch_id and work_location_id=p_work_location_id) then
    raise exception 'Stock batch does not belong to the active branch';
  end if;
  return public.bigfoods_inventory_log_waste(p_actor_staff_id,p_batch_id,p_quantity,p_reason);
end; $$;

revoke all on function public.bigfoods_inventory_receive_for_branch(uuid,uuid,uuid,text,numeric,text,text,text,numeric,text,timestamptz,date,text) from public,anon,authenticated;
revoke all on function public.bigfoods_inventory_log_waste_for_branch(uuid,uuid,uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.bigfoods_inventory_receive_for_branch(uuid,uuid,uuid,text,numeric,text,text,text,numeric,text,timestamptz,date,text) to service_role;
grant execute on function public.bigfoods_inventory_log_waste_for_branch(uuid,uuid,uuid,numeric,text) to service_role;

-- Production output batches inherit the branch of their originating production run.
create or replace function public.bigfoods_set_production_output_branch()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_code text; v_branch uuid;
begin
  if new.work_location_id is null and new.notes like 'Production output from %' then
    v_code := substring(new.notes from length('Production output from ')+1);
    select work_location_id into v_branch from public.inventory_production_batches where batch_code=v_code limit 1;
    if v_branch is not null then new.work_location_id := v_branch; end if;
  end if;
  return new;
end; $$;
drop trigger if exists inventory_batches_inherit_production_branch on public.inventory_batches;
create trigger inventory_batches_inherit_production_branch
before insert on public.inventory_batches
for each row execute function public.bigfoods_set_production_output_branch();
