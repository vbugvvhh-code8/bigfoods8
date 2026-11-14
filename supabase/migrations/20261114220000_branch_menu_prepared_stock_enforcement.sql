-- Every branch menu item starts with zero prepared portions.
-- Only completed kitchen production can increase this stock; POS and online sales
-- both consume the same branch-scoped balance.
insert into public.bigfoods_pos_branch_menu_stock
  (work_location_id,pos_item_id,track_stock,stock_quantity,low_stock_alert)
select bi.work_location_id,bi.pos_item_id,true,0,10
from public.bigfoods_pos_branch_items bi
left join public.bigfoods_pos_branch_menu_stock s
  on s.work_location_id=bi.work_location_id and s.pos_item_id=bi.pos_item_id
where s.pos_item_id is null
on conflict (work_location_id,pos_item_id) do nothing;

create or replace function public.bigfoods_pos_ensure_branch_menu_stock()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.bigfoods_pos_branch_menu_stock
    (work_location_id,pos_item_id,track_stock,stock_quantity,low_stock_alert,updated_by_staff_id,updated_at)
  values (new.work_location_id,new.pos_item_id,true,0,10,new.updated_by_staff_id,now())
  on conflict (work_location_id,pos_item_id) do nothing;
  return new;
end;
$$;

drop trigger if exists bigfoods_pos_branch_item_stock_init on public.bigfoods_pos_branch_items;
create trigger bigfoods_pos_branch_item_stock_init
after insert on public.bigfoods_pos_branch_items
for each row execute function public.bigfoods_pos_ensure_branch_menu_stock();

create or replace function public.bigfoods_pos_online_catalogue(
  p_lat double precision default null,
  p_lng double precision default null,
  p_fulfilment text default 'pickup'
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_branch record;
  v_items jsonb;
begin
  if p_fulfilment not in ('pickup','delivery') then raise exception 'Invalid fulfilment type'; end if;
  if p_fulfilment='delivery' and
    (p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180) then
    raise exception 'A valid delivery location is required';
  end if;

  select l.* into v_branch
  from public.bigfoods_staff_work_locations l
  where l.is_active
    and (p_fulfilment='pickup' and l.pickup_enabled or
      p_fulfilment='delivery' and l.delivery_enabled and l.delivery_coverage_geojson is not null
      and public.bigfoods_pos_point_in_branch(l.delivery_coverage_geojson,p_lat,p_lng))
    and (l.opening_time is null or l.closing_time is null or
      (case when l.opening_time<l.closing_time
        then (now() at time zone l.timezone)::time between l.opening_time and l.closing_time
        else (now() at time zone l.timezone)::time>=l.opening_time
          or (now() at time zone l.timezone)::time<=l.closing_time end))
  order by case when p_fulfilment='delivery'
    then (l.latitude-p_lat)^2+(l.longitude-p_lng)^2 else 0 end, l.name
  limit 1;

  if not found then return jsonb_build_object('available',false,'items','[]'::jsonb); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'name',i.name,'description',i.description,'category',i.category,
    'image_url',i.image_url,'selling_price',coalesce(bi.selling_price,i.selling_price),
    'stock_quantity',s.stock_quantity
  ) order by bi.sort_order,i.name),'[]'::jsonb)
  into v_items
  from public.bigfoods_pos_branch_items bi
  join public.bigfoods_pos_items i on i.id=bi.pos_item_id
  join public.bigfoods_pos_branch_menu_stock s
    on s.work_location_id=bi.work_location_id and s.pos_item_id=bi.pos_item_id
  where bi.work_location_id=v_branch.id and bi.is_available and i.is_available
    and (not s.track_stock or s.stock_quantity>0);

  return jsonb_build_object(
    'available',true,
    'branch',jsonb_build_object(
      'id',v_branch.id,'name',v_branch.name,'address',v_branch.address,
      'delivery_fee',case when p_fulfilment='delivery' then v_branch.delivery_fee else 0 end,
      'minimum_order_amount',v_branch.minimum_order_amount
    ),
    'items',v_items
  );
end;
$$;

revoke all on function public.bigfoods_pos_ensure_branch_menu_stock() from public,anon,authenticated;
