create sequence if not exists public.inventory_receipt_batch_code_seq;
create sequence if not exists public.inventory_kitchen_batch_code_seq;

create or replace function public.bigfoods_inventory_next_batch_code(p_kind text default 'receipt')
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prefix text;
  v_number bigint;
begin
  if p_kind = 'receipt' then
    v_prefix := 'BF-RCV-';
    v_number := nextval('public.inventory_receipt_batch_code_seq');
  elsif p_kind = 'kitchen' then
    v_prefix := 'BF-KIT-';
    v_number := nextval('public.inventory_kitchen_batch_code_seq');
  else
    raise exception 'Unsupported batch code type';
  end if;
  return v_prefix || to_char(now() at time zone 'Africa/Lagos', 'YYYYMMDD') || '-' || lpad(v_number::text, 6, '0');
end;
$$;

revoke all on function public.bigfoods_inventory_next_batch_code(text) from public, anon, authenticated;
grant execute on function public.bigfoods_inventory_next_batch_code(text) to service_role;

create or replace function public.bigfoods_inventory_lock_base_unit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if lower(trim(coalesce(new.base_unit, ''))) <> lower(trim(coalesce(old.base_unit, ''))) then
    if exists (select 1 from public.inventory_batches b where b.inventory_item_id = old.id)
       or exists (select 1 from public.inventory_recipe_items ri where ri.inventory_item_id = old.id) then
      raise exception 'This base unit is locked because the item has stock or recipe history. Create a controlled unit-conversion adjustment instead.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_items_lock_base_unit on public.inventory_items;
create trigger inventory_items_lock_base_unit
before update of base_unit on public.inventory_items
for each row execute function public.bigfoods_inventory_lock_base_unit();
