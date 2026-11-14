-- BigFoods POS customer ordering: isolated from the restaurant marketplace.
create table if not exists public.bigfoods_pos_online_orders (
 id uuid primary key default gen_random_uuid(),
 order_number text not null unique,
 work_location_id uuid not null references public.bigfoods_staff_work_locations(id) on delete restrict,
 fulfilment_type text not null check (fulfilment_type in ('pickup','delivery')),
 customer_name text not null,
 customer_email text,
 customer_phone text not null,
 delivery_address text,
 delivery_latitude double precision,
 delivery_longitude double precision,
 delivery_note text,
 status text not null default 'awaiting_payment' check (status in ('awaiting_payment','confirmed','accepted','preparing','ready','picked_up','out_for_delivery','delivered','cancelled','rejected')),
 payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
 payment_reference text unique,
 subtotal numeric(14,2) not null check (subtotal>=0),
 delivery_fee numeric(14,2) not null default 0 check (delivery_fee>=0),
 total_amount numeric(14,2) not null check (total_amount>=0),
 assigned_rider_id uuid,
 accepted_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
 accepted_at timestamptz,
 ready_at timestamptz,
 delivered_at timestamptz,
 cancellation_reason text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.bigfoods_pos_online_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.bigfoods_pos_online_orders(id) on delete cascade,
 pos_item_id uuid not null references public.bigfoods_pos_items(id) on delete restrict,
 product_name text not null,
 image_url text,
 quantity integer not null check (quantity>0),
 unit_price numeric(14,2) not null check (unit_price>=0),
 line_total numeric(14,2) not null check (line_total>=0)
);
create index if not exists bigfoods_pos_online_orders_branch_queue_idx
 on public.bigfoods_pos_online_orders(work_location_id,status,created_at desc);
create index if not exists bigfoods_pos_online_orders_customer_idx
 on public.bigfoods_pos_online_orders(customer_phone,created_at desc);
alter table public.bigfoods_pos_online_orders enable row level security;
alter table public.bigfoods_pos_online_order_items enable row level security;

create or replace function public.bigfoods_pos_point_in_branch(p_geojson jsonb,p_lat double precision,p_lng double precision)
returns boolean language plpgsql immutable set search_path=public,pg_temp as $$
declare ring jsonb; i integer; j integer; xi double precision; yi double precision; xj double precision; yj double precision; inside boolean:=false; n integer;
begin
 if p_geojson is null or jsonb_typeof(p_geojson->'coordinates')<>'array' then return false; end if;
 ring:=p_geojson->'coordinates'->0; n:=jsonb_array_length(ring);
 if n<4 then return false; end if;
 j:=n-1;
 for i in 0..n-1 loop
  xi:=(ring->i->>0)::double precision; yi:=(ring->i->>1)::double precision;
  xj:=(ring->j->>0)::double precision; yj:=(ring->j->>1)::double precision;
  if ((yi>p_lat)<>(yj>p_lat)) and (p_lng < (xj-xi)*(p_lat-yi)/nullif(yj-yi,0)+xi) then inside:=not inside; end if;
  j:=i;
 end loop;
 return inside;
exception when others then return false;
end; $$;

create or replace function public.bigfoods_pos_online_catalogue(p_lat double precision default null,p_lng double precision default null,p_fulfilment text default 'pickup')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_branch record; v_items jsonb;
begin
 if p_fulfilment not in ('pickup','delivery') then raise exception 'Invalid fulfilment type'; end if;
 if p_fulfilment='delivery' and (p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180) then raise exception 'A valid delivery location is required'; end if;
 select l.* into v_branch from public.bigfoods_staff_work_locations l
 where l.is_active and (p_fulfilment='pickup' and l.pickup_enabled or p_fulfilment='delivery' and l.delivery_enabled and l.delivery_coverage_geojson is not null and public.bigfoods_pos_point_in_branch(l.delivery_coverage_geojson,p_lat,p_lng))
 and (l.opening_time is null or l.closing_time is null or (case when l.opening_time<l.closing_time then (now() at time zone l.timezone)::time between l.opening_time and l.closing_time else (now() at time zone l.timezone)::time>=l.opening_time or (now() at time zone l.timezone)::time<=l.closing_time end))
 order by case when p_fulfilment='delivery' then (l.latitude-p_lat)^2+(l.longitude-p_lng)^2 else 0 end, l.name limit 1;
 if not found then return jsonb_build_object('available',false,'items','[]'::jsonb); end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'description',i.description,'category',i.category,'image_url',i.image_url,'selling_price',coalesce(bi.selling_price,i.selling_price),'stock_quantity',case when s.track_stock then s.stock_quantity else null end) order by bi.sort_order,i.name),'[]'::jsonb)
 into v_items from public.bigfoods_pos_branch_items bi join public.bigfoods_pos_items i on i.id=bi.pos_item_id
 left join public.bigfoods_pos_branch_menu_stock s on s.work_location_id=bi.work_location_id and s.pos_item_id=bi.pos_item_id
 where bi.work_location_id=v_branch.id and bi.is_available and i.is_available and (not coalesce(s.track_stock,false) or coalesce(s.stock_quantity,0)>0);
 return jsonb_build_object('available',true,'branch',jsonb_build_object('id',v_branch.id,'name',v_branch.name,'address',v_branch.address,'delivery_fee',case when p_fulfilment='delivery' then v_branch.delivery_fee else 0 end,'minimum_order_amount',v_branch.minimum_order_amount),'items',v_items);
end; $$;

create or replace function public.bigfoods_pos_create_online_order(
 p_fulfilment text,p_customer_name text,p_customer_email text,p_customer_phone text,p_delivery_address text,
 p_delivery_lat double precision,p_delivery_lng double precision,p_delivery_note text,p_items jsonb,p_payment_reference text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_catalogue jsonb; v_branch jsonb; v_branch_id uuid; v_fee numeric; v_subtotal numeric:=0; v_order_id uuid; v_number text; v_line record; v_item jsonb; v_stock public.bigfoods_pos_branch_menu_stock%rowtype; v_product public.bigfoods_pos_items%rowtype; v_bi public.bigfoods_pos_branch_items%rowtype; v_qty integer;
begin
 if p_fulfilment not in ('pickup','delivery') then raise exception 'Invalid fulfilment type'; end if;
 if length(trim(coalesce(p_customer_name,''))) not between 2 and 120 or length(regexp_replace(coalesce(p_customer_phone,''),'\\D','','g')) not between 10 and 15 then raise exception 'Enter a valid customer name and phone number'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>50 then raise exception 'Add between 1 and 50 items'; end if;
 v_catalogue:=public.bigfoods_pos_online_catalogue(p_delivery_lat,p_delivery_lng,p_fulfilment);
 if coalesce((v_catalogue->>'available')::boolean,false) is not true then raise exception 'No branch currently serves this location or fulfilment option'; end if;
 v_branch:=v_catalogue->'branch'; v_branch_id:=(v_branch->>'id')::uuid; v_fee:=coalesce((v_branch->>'delivery_fee')::numeric,0);
 for v_line in select (value->>'product_id')::uuid product_id,sum((value->>'quantity')::integer)::integer quantity from jsonb_array_elements(p_items) group by 1 loop
  v_qty:=v_line.quantity; if v_qty<1 or v_qty>50 then raise exception 'Invalid item quantity'; end if;
  select * into v_product from public.bigfoods_pos_items where id=v_line.product_id and is_available for share;
  if not found then raise exception 'A menu item is no longer available'; end if;
  select * into v_bi from public.bigfoods_pos_branch_items where work_location_id=v_branch_id and pos_item_id=v_product.id and is_available for share;
  if not found then raise exception 'A menu item is not available at this branch'; end if;
  select * into v_stock from public.bigfoods_pos_branch_menu_stock where work_location_id=v_branch_id and pos_item_id=v_product.id for update;
  if found and v_stock.track_stock then
   if v_stock.stock_quantity<v_qty then raise exception 'Insufficient prepared stock for %',v_product.name; end if;
   update public.bigfoods_pos_branch_menu_stock set stock_quantity=stock_quantity-v_qty,updated_at=now() where work_location_id=v_branch_id and pos_item_id=v_product.id;
  end if;
  v_subtotal:=v_subtotal+coalesce(v_bi.selling_price,v_product.selling_price)*v_qty;
 end loop;
 if p_fulfilment='delivery' and length(trim(coalesce(p_delivery_address,'')))<8 then raise exception 'Enter a complete delivery address'; end if;
 if v_subtotal<coalesce((v_branch->>'minimum_order_amount')::numeric,0) then raise exception 'Order is below this branch minimum order amount'; end if;
 if p_fulfilment='pickup' then v_fee:=0; end if;
 v_number:='BFW-'||to_char(now(),'YYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
 insert into public.bigfoods_pos_online_orders(order_number,work_location_id,fulfilment_type,customer_name,customer_email,customer_phone,delivery_address,delivery_latitude,delivery_longitude,delivery_note,payment_reference,subtotal,delivery_fee,total_amount)
 values(v_number,v_branch_id,p_fulfilment,trim(p_customer_name),nullif(trim(coalesce(p_customer_email,'')),''),trim(p_customer_phone),nullif(trim(coalesce(p_delivery_address,'')),''),p_delivery_lat,p_delivery_lng,nullif(trim(coalesce(p_delivery_note,'')),''),p_payment_reference,v_subtotal,v_fee,v_subtotal+v_fee)
 returning id into v_order_id;
 for v_line in select (value->>'product_id')::uuid product_id,sum((value->>'quantity')::integer)::integer quantity from jsonb_array_elements(p_items) group by 1 loop
  select * into v_product from public.bigfoods_pos_items where id=v_line.product_id;
  select * into v_bi from public.bigfoods_pos_branch_items where work_location_id=v_branch_id and pos_item_id=v_product.id;
  insert into public.bigfoods_pos_online_order_items(order_id,pos_item_id,product_name,image_url,quantity,unit_price,line_total)
  values(v_order_id,v_product.id,v_product.name,v_product.image_url,v_line.quantity,coalesce(v_bi.selling_price,v_product.selling_price),coalesce(v_bi.selling_price,v_product.selling_price)*v_line.quantity);
 end loop;
 insert into public.bigfoods_staff_audit_events(action,details) values('pos.online_order_created',jsonb_build_object('order_id',v_order_id,'branch_id',v_branch_id,'total',v_subtotal+v_fee));
 return jsonb_build_object('order_id',v_order_id,'order_number',v_number,'total_amount',v_subtotal+v_fee,'branch_name',v_branch->>'name');
end; $$;

create or replace function public.bigfoods_pos_online_payment_finalize(p_reference text,p_success boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_order public.bigfoods_pos_online_orders%rowtype;
begin
 select * into v_order from public.bigfoods_pos_online_orders where payment_reference=p_reference for update;
 if not found then raise exception 'Online order not found'; end if;
 if v_order.payment_status='paid' then return jsonb_build_object('success',true,'already_processed',true,'order_id',v_order.id); end if;
 if p_success then
  update public.bigfoods_pos_online_orders set payment_status='paid',status='confirmed',updated_at=now() where id=v_order.id;
 else
  update public.bigfoods_pos_online_orders set payment_status='failed',status='cancelled',cancellation_reason='Payment was not completed',updated_at=now() where id=v_order.id;
  update public.bigfoods_pos_branch_menu_stock s set stock_quantity=s.stock_quantity+oi.quantity,updated_at=now()
  from (select pos_item_id,sum(quantity)::integer quantity from public.bigfoods_pos_online_order_items where order_id=v_order.id group by pos_item_id) oi
  where s.work_location_id=v_order.work_location_id and s.pos_item_id=oi.pos_item_id and s.track_stock;
 end if;
 return jsonb_build_object('success',p_success,'order_id',v_order.id,'order_number',v_order.order_number);
end; $$;

revoke all on function public.bigfoods_pos_online_catalogue(double precision,double precision,text) from public,anon,authenticated;
revoke all on function public.bigfoods_pos_create_online_order(text,text,text,text,text,double precision,double precision,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.bigfoods_pos_online_payment_finalize(text,boolean) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_online_catalogue(double precision,double precision,text) to service_role;
grant execute on function public.bigfoods_pos_create_online_order(text,text,text,text,text,double precision,double precision,text,jsonb,text) to service_role;
grant execute on function public.bigfoods_pos_online_payment_finalize(text,boolean) to service_role;
