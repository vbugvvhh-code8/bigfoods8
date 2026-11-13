create or replace function public.bigfoods_inventory_lock_base_unit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if lower(trim(coalesce(new.base_unit, ''))) <> lower(trim(coalesce(old.base_unit, ''))) then
    if exists (select 1 from public.inventory_batches b where b.inventory_item_id = old.id)
       or exists (select 1 from public.inventory_movements m where m.inventory_item_id = old.id)
       or exists (select 1 from public.inventory_recipe_items ri where ri.inventory_item_id = old.id) then
      raise exception 'This base unit is locked because the item has stock, movement or recipe history. Create a controlled unit-conversion adjustment instead.';
    end if;
  end if;
  return new;
end;
$$;