-- Correct dispatch defaults and ensure blank zones never qualify for automatic offers.
-- The existing marketplace dispatcher treats a missing setting as disabled.
-- Keep the POS dispatcher consistent with that fail-closed behavior.

create or replace function public.bigfoods_pos_rider_offers()
returns table(offer_id uuid,order_id uuid,order_number text,zone text,status text,offered_at timestamptz,delivery_address text,delivery_fee numeric,branch_name text)
language plpgsql security definer set search_path='' as $$
declare r public.riders%rowtype; enabled boolean;
begin
 select * into r from public.riders where profile_id=auth.uid();
 if not found or r.status<>'online' or r.approval_status<>'approved'
   or not r.verification_fee_paid or not r.waiver_completed or r.dispatch_disabled then return; end if;

 select coalesce(value='true'::jsonb or value='"true"'::jsonb,false)
 into enabled from public.platform_settings where key='dispatch_rider_offers_enabled';
 if not coalesce(enabled,false) then return; end if;

 insert into public.bigfoods_pos_online_rider_offers as existing(order_id,rider_id)
 select o.id,r.id from public.bigfoods_pos_online_orders o
 join public.bigfoods_staff_work_locations l on l.id=o.work_location_id
 where o.fulfilment_type='delivery' and o.payment_status='paid' and o.status='ready'
   and o.assigned_rider_id is null and l.is_active
   and nullif(trim(l.dispatch_zone),'') is not null
   and nullif(trim(r.zone),'') is not null
   and lower(trim(l.dispatch_zone))=lower(trim(r.zone))
 on conflict(order_id,rider_id) do update
   set status='offered',offered_at=now(),responded_at=null
   where existing.status in ('expired','rejected');

 return query
 select f.id,o.id,o.order_number,l.dispatch_zone,f.status,f.offered_at,
   case when f.status='accepted' then o.delivery_address else null end,
   o.delivery_fee,l.name
 from public.bigfoods_pos_online_rider_offers f
 join public.bigfoods_pos_online_orders o on o.id=f.order_id
 join public.bigfoods_staff_work_locations l on l.id=o.work_location_id
 where f.rider_id=r.id and f.status in ('offered','accepted')
   and ((f.status='offered' and o.assigned_rider_id is null and o.payment_status='paid' and o.status='ready')
     or (f.status='accepted' and o.assigned_rider_id=r.id and o.status in ('ready','out_for_delivery')))
 order by f.offered_at desc;
end; $$;

create or replace function public.bigfoods_pos_rider_respond(p_order_id uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.riders%rowtype; o public.bigfoods_pos_online_orders%rowtype; f public.bigfoods_pos_online_rider_offers%rowtype; enabled boolean;
begin
 select * into r from public.riders where profile_id=auth.uid() for update;
 if not found or r.status<>'online' or r.approval_status<>'approved'
   or not r.verification_fee_paid or not r.waiver_completed or r.dispatch_disabled then
   return jsonb_build_object('ok',false,'error','Rider account is not eligible');
 end if;
 select coalesce(value='true'::jsonb or value='"true"'::jsonb,false)
 into enabled from public.platform_settings where key='dispatch_rider_offers_enabled';
 if not coalesce(enabled,false) then return jsonb_build_object('ok',false,'error','Rider dispatch is paused'); end if;

 select * into f from public.bigfoods_pos_online_rider_offers where order_id=p_order_id and rider_id=r.id for update;
 if not found or f.status<>'offered' then return jsonb_build_object('ok',false,'error','Offer is no longer available'); end if;
 select * into o from public.bigfoods_pos_online_orders where id=p_order_id for update;
 if not found or o.assigned_rider_id is not null or o.status<>'ready'
   or o.payment_status<>'paid' or o.fulfilment_type<>'delivery' then
   update public.bigfoods_pos_online_rider_offers set status='expired',responded_at=now() where id=f.id;
   return jsonb_build_object('ok',false,'error','Order is no longer available');
 end if;
 if not exists(
   select 1 from public.bigfoods_staff_work_locations l
   where l.id=o.work_location_id and nullif(trim(l.dispatch_zone),'') is not null
     and nullif(trim(r.zone),'') is not null
     and lower(trim(l.dispatch_zone))=lower(trim(r.zone))
 ) then return jsonb_build_object('ok',false,'error','Order is outside your service zone'); end if;

 if p_accept then
   update public.bigfoods_pos_online_orders set assigned_rider_id=r.id,updated_at=now()
   where id=o.id and assigned_rider_id is null;
   if not found then return jsonb_build_object('ok',false,'error','Another rider accepted this order'); end if;
   update public.bigfoods_pos_online_rider_offers set status='accepted',responded_at=now() where id=f.id;
   update public.bigfoods_pos_online_rider_offers set status='expired',responded_at=now()
   where order_id=o.id and rider_id<>r.id and status='offered';
   return jsonb_build_object('ok',true,'status','accepted');
 else
   update public.bigfoods_pos_online_rider_offers set status='rejected',responded_at=now() where id=f.id;
   return jsonb_build_object('ok',true,'status','rejected');
 end if;
end; $$;

revoke all on function public.bigfoods_pos_rider_offers() from public,anon;
grant execute on function public.bigfoods_pos_rider_offers() to authenticated;
revoke all on function public.bigfoods_pos_rider_respond(uuid,boolean) from public,anon;
grant execute on function public.bigfoods_pos_rider_respond(uuid,boolean) to authenticated;
