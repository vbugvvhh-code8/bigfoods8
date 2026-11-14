-- Reuse existing approved rider accounts for BigFoods POS online deliveries.
alter table public.bigfoods_staff_work_locations
  add column if not exists dispatch_zone text;

create table if not exists public.bigfoods_pos_online_rider_offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.bigfoods_pos_online_orders(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  status text not null default 'offered' check (status in ('offered','accepted','rejected','expired')),
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(order_id,rider_id)
);
create index if not exists bf_pos_rider_offers_rider_status_idx
  on public.bigfoods_pos_online_rider_offers(rider_id,status,offered_at desc);
alter table public.bigfoods_pos_online_rider_offers enable row level security;
revoke all on public.bigfoods_pos_online_rider_offers from anon,authenticated;
revoke all on public.bigfoods_pos_online_orders from anon,authenticated;
revoke all on public.bigfoods_pos_online_order_items from anon,authenticated;

create or replace function public.bigfoods_pos_rider_offers()
returns table(offer_id uuid,order_id uuid,order_number text,zone text,status text,offered_at timestamptz,delivery_address text,delivery_fee numeric,branch_name text)
language plpgsql security definer set search_path='' as $$
declare r public.riders%rowtype; enabled boolean;
begin
 select * into r from public.riders where profile_id=auth.uid();
 if not found or r.status<>'online' or r.approval_status<>'approved' or not r.verification_fee_paid or not r.waiver_completed or r.dispatch_disabled then return; end if;
 select coalesce((value #>> '{}')::boolean,true) into enabled from public.platform_settings where key='dispatch_rider_offers_enabled';
 if not coalesce(enabled,true) then return; end if;
 -- Discover paid, ready-for-dispatch deliveries only. Branches must explicitly map
 -- their dispatch zone to the existing rider service-zone value.
 insert into public.bigfoods_pos_online_rider_offers(order_id,rider_id)
 select o.id,r.id from public.bigfoods_pos_online_orders o
 join public.bigfoods_staff_work_locations l on l.id=o.work_location_id
 where o.fulfilment_type='delivery' and o.payment_status='paid' and o.status='ready'
 and o.assigned_rider_id is null and l.is_active
 and lower(trim(coalesce(l.dispatch_zone,'')))=lower(trim(coalesce(r.zone,'')))
 on conflict(order_id,rider_id) do update set status='offered',offered_at=now(),responded_at=null
 where public.bigfoods_pos_online_rider_offers.status in ('expired','rejected');
 return query
 select f.id,o.id,o.order_number,l.dispatch_zone,f.status,f.offered_at,
 case when f.status='accepted' then o.delivery_address else null end,
 o.delivery_fee,l.name
 from public.bigfoods_pos_online_rider_offers f
 join public.bigfoods_pos_online_orders o on o.id=f.order_id
 join public.bigfoods_staff_work_locations l on l.id=o.work_location_id
 where f.rider_id=r.id and f.status in ('offered','accepted')
 and (f.status='accepted' or (o.assigned_rider_id is null and o.payment_status='paid' and o.status='ready'))
 order by f.offered_at desc;
end; $$;
revoke all on function public.bigfoods_pos_rider_offers() from public,anon;
grant execute on function public.bigfoods_pos_rider_offers() to authenticated;

create or replace function public.bigfoods_pos_rider_respond(p_order_id uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.riders%rowtype; o public.bigfoods_pos_online_orders%rowtype; f public.bigfoods_pos_online_rider_offers%rowtype; enabled boolean;
begin
 select * into r from public.riders where profile_id=auth.uid() for update;
 if not found or r.status<>'online' or r.approval_status<>'approved' or not r.verification_fee_paid or not r.waiver_completed or r.dispatch_disabled then return jsonb_build_object('ok',false,'error','Rider account is not eligible'); end if;
 select coalesce((value #>> '{}')::boolean,true) into enabled from public.platform_settings where key='dispatch_rider_offers_enabled';
 if not coalesce(enabled,true) then return jsonb_build_object('ok',false,'error','Rider dispatch is paused'); end if;
 select * into f from public.bigfoods_pos_online_rider_offers where order_id=p_order_id and rider_id=r.id for update;
 if not found or f.status<>'offered' then return jsonb_build_object('ok',false,'error','Offer is no longer available'); end if;
 select * into o from public.bigfoods_pos_online_orders where id=p_order_id for update;
 if not found or o.assigned_rider_id is not null or o.status<>'ready' or o.payment_status<>'paid' or o.fulfilment_type<>'delivery' then
 update public.bigfoods_pos_online_rider_offers set status='expired',responded_at=now() where id=f.id;
 return jsonb_build_object('ok',false,'error','Order is no longer available'); end if;
 if not exists(select 1 from public.bigfoods_staff_work_locations l where l.id=o.work_location_id and lower(trim(coalesce(l.dispatch_zone,'')))=lower(trim(coalesce(r.zone,'')))) then
 return jsonb_build_object('ok',false,'error','Order is outside your service zone'); end if;
 if p_accept then
 update public.bigfoods_pos_online_orders set assigned_rider_id=r.id,updated_at=now() where id=o.id and assigned_rider_id is null;
 if not found then return jsonb_build_object('ok',false,'error','Another rider accepted this order'); end if;
 update public.bigfoods_pos_online_rider_offers set status='accepted',responded_at=now() where id=f.id;
 update public.bigfoods_pos_online_rider_offers set status='expired',responded_at=now() where order_id=o.id and rider_id<>r.id and status='offered';
 return jsonb_build_object('ok',true,'status','accepted');
 else
 update public.bigfoods_pos_online_rider_offers set status='rejected',responded_at=now() where id=f.id;
 return jsonb_build_object('ok',true,'status','rejected');
 end if;
end; $$;
revoke all on function public.bigfoods_pos_rider_respond(uuid,boolean) from public,anon;
grant execute on function public.bigfoods_pos_rider_respond(uuid,boolean) to authenticated;

create or replace function public.bigfoods_pos_rider_order_details(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.riders%rowtype; o public.bigfoods_pos_online_orders%rowtype; l public.bigfoods_staff_work_locations%rowtype; items jsonb;
begin
 select * into r from public.riders where profile_id=auth.uid();
 if not found then raise exception 'Rider account not found'; end if;
 select * into o from public.bigfoods_pos_online_orders where id=p_order_id and assigned_rider_id=r.id;
 if not found then raise exception 'Assigned delivery not found'; end if;
 select * into l from public.bigfoods_staff_work_locations where id=o.work_location_id;
 select coalesce(jsonb_agg(jsonb_build_object('name',product_name,'quantity',quantity) order by product_name),'[]'::jsonb) into items from public.bigfoods_pos_online_order_items where order_id=o.id;
 return jsonb_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'customer_name',o.customer_name,'customer_phone',o.customer_phone,'delivery_address',o.delivery_address,'delivery_latitude',o.delivery_latitude,'delivery_longitude',o.delivery_longitude,'delivery_note',o.delivery_note,'delivery_fee',o.delivery_fee,'branch_name',l.name,'branch_address',l.address,'branch_latitude',l.latitude,'branch_longitude',l.longitude,'items',items);
end; $$;
revoke all on function public.bigfoods_pos_rider_order_details(uuid) from public,anon;
grant execute on function public.bigfoods_pos_rider_order_details(uuid) to authenticated;

create or replace function public.bigfoods_pos_rider_update(p_order_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.riders%rowtype; o public.bigfoods_pos_online_orders%rowtype;
begin
 select * into r from public.riders where profile_id=auth.uid() for update;
 if not found then return jsonb_build_object('ok',false,'error','Rider account not found'); end if;
 select * into o from public.bigfoods_pos_online_orders where id=p_order_id and assigned_rider_id=r.id for update;
 if not found then return jsonb_build_object('ok',false,'error','Assigned delivery not found'); end if;
 if (o.status='ready' and p_status='out_for_delivery') then
 update public.bigfoods_pos_online_orders set status='out_for_delivery',updated_at=now() where id=o.id;
 elsif (o.status='out_for_delivery' and p_status='delivered') then
 update public.bigfoods_pos_online_orders set status='delivered',delivered_at=now(),updated_at=now() where id=o.id;
 else return jsonb_build_object('ok',false,'error','This delivery status transition is not allowed'); end if;
 return jsonb_build_object('ok',true,'status',p_status);
end; $$;
revoke all on function public.bigfoods_pos_rider_update(uuid,text) from public,anon;
grant execute on function public.bigfoods_pos_rider_update(uuid,text) to authenticated;
