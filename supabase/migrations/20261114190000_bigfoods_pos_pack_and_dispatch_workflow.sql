-- BigFoods meals are already cooked before online orders arrive.
-- Staff only accept, pack, and mark the order ready for pickup or rider handover.
-- Convert any legacy in-progress label to accepted so it can follow the packing step.
update public.bigfoods_pos_online_orders
set status='accepted', updated_at=now()
where status='preparing';

alter table public.bigfoods_pos_online_orders
  drop constraint if exists bigfoods_pos_online_orders_status_check;

alter table public.bigfoods_pos_online_orders
  add constraint bigfoods_pos_online_orders_status_check
  check (status in ('awaiting_payment','confirmed','accepted','ready','picked_up','out_for_delivery','delivered','cancelled','rejected'));
