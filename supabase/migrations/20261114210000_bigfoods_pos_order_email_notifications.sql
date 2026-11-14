-- Idempotent delivery log for customer email notifications on BigFoods POS online orders.
create table if not exists public.bigfoods_pos_online_order_email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.bigfoods_pos_online_orders(id) on delete cascade,
  status text not null check (status in ('confirmed','accepted','ready','picked_up','out_for_delivery','delivered')),
  recipient_email text not null,
  delivery_status text not null default 'sending' check (delivery_status in ('sending','sent','failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (order_id,status)
);
create index if not exists bigfoods_pos_online_order_email_log_status_idx
  on public.bigfoods_pos_online_order_email_log(delivery_status,created_at desc);
alter table public.bigfoods_pos_online_order_email_log enable row level security;
revoke all on public.bigfoods_pos_online_order_email_log from public,anon,authenticated;
grant all on public.bigfoods_pos_online_order_email_log to service_role;
