alter table public.bigfoods_pos_items
  add column if not exists item_type text not null default 'Meal',
  add column if not exists is_featured boolean not null default false,
  add column if not exists track_stock boolean not null default true,
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists low_stock_alert integer not null default 10;
alter table public.bigfoods_pos_items drop constraint if exists bigfoods_pos_items_stock_nonnegative;
alter table public.bigfoods_pos_items add constraint bigfoods_pos_items_stock_nonnegative check (stock_quantity >= 0);
alter table public.bigfoods_pos_items drop constraint if exists bigfoods_pos_items_low_stock_nonnegative;
alter table public.bigfoods_pos_items add constraint bigfoods_pos_items_low_stock_nonnegative check (low_stock_alert >= 0);
create sequence if not exists public.bigfoods_pos_sku_seq;
select setval('public.bigfoods_pos_sku_seq', greatest(coalesce((select max(nullif(regexp_replace(sku, '^BF-0*', ''), '')::bigint) from public.bigfoods_pos_items where sku ~ '^BF-[0-9]+$'),0),0)+1, false);
update public.bigfoods_pos_items set sku='BF-'||lpad(nextval('public.bigfoods_pos_sku_seq')::text,6,'0') where sku is null or btrim(sku)='';
create or replace function public.bigfoods_pos_assign_sku()
returns trigger language plpgsql as $$
begin
  if new.sku is null or btrim(new.sku) = '' then
    new.sku := 'BF-' || lpad(nextval('public.bigfoods_pos_sku_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists bigfoods_pos_items_assign_sku on public.bigfoods_pos_items;
create trigger bigfoods_pos_items_assign_sku before insert on public.bigfoods_pos_items
for each row execute function public.bigfoods_pos_assign_sku();