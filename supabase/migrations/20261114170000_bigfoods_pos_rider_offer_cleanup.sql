create or replace function public.bigfoods_pos_rider_offers()
returns table(offer_id uuid,order_id uuid,order_number text,zone text,status text,offered_at timestamptz,delivery_address text,delivery_fee numeric,branch_name text)
language plpgsql security definer set search_path='' as $$
declare r public.riders%rowtype; enabled boolean;
begin
 select * into r from public.riders where profile_id=auth.uid();
 if not found or r.status<>'online' or r.approval_status<>'approved' or not r.verification_fee_paid or not r.waiver_completed or r.dispatch_disabled then return; end if;
 select coalesce((value #>> '{}')::boolean,true) into enabled from public.platform_settings where key='dispatch_rider_offers_enabled';
 if not coalesce(enabled,true) then return; end if;
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
 and ((f.status='offered' and o.assigned_rider_id is null and o.payment_status='paid' and o.status='ready')
   or (f.status='accepted' and o.assigned_rider_id=r.id and o.status in ('ready','out_for_delivery')))
 order by f.offered_at desc;
end; $$;
