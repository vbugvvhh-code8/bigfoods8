-- Secure customer tracking links and durable online-order status history.
alter table public.bigfoods_pos_online_orders
 add column if not exists tracking_token_hash text;

create unique index if not exists bigfoods_pos_online_orders_tracking_token_hash_uidx
 on public.bigfoods_pos_online_orders(tracking_token_hash)
 where tracking_token_hash is not null;

create table if not exists public.bigfoods_pos_online_order_status_events(
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.bigfoods_pos_online_orders(id) on delete cascade,
 status text not null,
 changed_at timestamptz not null default now()
);
create index if not exists bigfoods_pos_online_order_status_events_order_idx
 on public.bigfoods_pos_online_order_status_events(order_id,changed_at);

alter table public.bigfoods_pos_online_order_status_events enable row level security;
revoke all on public.bigfoods_pos_online_order_status_events from anon,authenticated;

create or replace function public.bigfoods_pos_record_online_order_status()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.bigfoods_pos_online_order_status_events(order_id,status)
  values(new.id,new.status);
 elsif new.status is distinct from old.status then
  insert into public.bigfoods_pos_online_order_status_events(order_id,status)
  values(new.id,new.status);
 end if;
 return new;
end;
$$;
drop trigger if exists bigfoods_pos_online_order_status_history on public.bigfoods_pos_online_orders;
create trigger bigfoods_pos_online_order_status_history
 after insert or update of status on public.bigfoods_pos_online_orders
 for each row execute function public.bigfoods_pos_record_online_order_status();

create or replace function public.bigfoods_pos_customer_order_tracking(p_tracking_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.bigfoods_pos_online_orders%rowtype; branch_name text; branch_address text; items jsonb; events jsonb;
begin
 select * into o from public.bigfoods_pos_online_orders
 where tracking_token_hash=p_tracking_token_hash;
 if not found then return null; end if;
 select l.name,l.address into branch_name,branch_address
 from public.bigfoods_staff_work_locations l where l.id=o.work_location_id;
 select coalesce(jsonb_agg(jsonb_build_object('name',i.product_name,'quantity',i.quantity) order by i.product_name),'[]'::jsonb)
 into items from public.bigfoods_pos_online_order_items i where i.order_id=o.id;
 select coalesce(jsonb_agg(jsonb_build_object('status',e.status,'changed_at',e.changed_at) order by e.changed_at),'[]'::jsonb)
 into events from public.bigfoods_pos_online_order_status_events e where e.order_id=o.id;
 return jsonb_build_object('order_number',o.order_number,'fulfilment_type',o.fulfilment_type,
 'status',o.status,'payment_status',o.payment_status,'delivery_address',o.delivery_address,
 'created_at',o.created_at,'updated_at',o.updated_at,'ready_at',o.ready_at,'delivered_at',o.delivered_at,
 'branch',jsonb_build_object('name',branch_name,'address',branch_address),'items',items,'events',events);
end;
$$;
revoke all on function public.bigfoods_pos_customer_order_tracking(text) from public,anon,authenticated;
grant execute on function public.bigfoods_pos_customer_order_tracking(text) to service_role;
