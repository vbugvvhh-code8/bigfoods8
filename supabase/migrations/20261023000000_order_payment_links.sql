-- Durable, single-use, 24-hour shareable payment links.
-- Token hashes only are stored; raw bearer tokens are returned once to the creator.
create table if not exists public.order_payment_links (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  customer_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  order_group_id uuid references public.order_groups(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  amount_naira bigint not null check (amount_naira > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint order_payment_links_one_order check (
    (order_id is not null and order_group_id is null) or
    (order_id is null and order_group_id is not null)
  )
);

create index if not exists order_payment_links_customer_created_idx
  on public.order_payment_links (customer_id, created_at desc);
create index if not exists order_payment_links_expiry_idx
  on public.order_payment_links (expires_at);

alter table public.order_payment_links enable row level security;
-- All access is mediated by Edge Functions using the service role; no client policies.
