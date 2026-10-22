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

-- Atomic claim: concurrent requests cannot both consume a token. The caller
-- supplies a SHA-256 token hash and receives a row only once, before expiry.
create or replace function public.claim_order_payment_link(p_token_hash text)
returns setof public.order_payment_links
language sql
security definer
set search_path = ''
as $$
  update public.order_payment_links
     set consumed_at = pg_catalog.now()
   where token_hash = p_token_hash
     and consumed_at is null
     and expires_at > pg_catalog.now()
  returning *;
$$;

revoke all on function public.claim_order_payment_link(text) from public, anon, authenticated;
grant execute on function public.claim_order_payment_link(text) to service_role;


-- Release a claim only when the caller knows initialization did not start.
-- The consumed_at guard ensures this cannot reset a link after successful payment
-- verification has otherwise completed and avoids clearing a later claim.
create or replace function public.release_order_payment_link_claim(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.order_payment_links
     set consumed_at = null
   where token_hash = p_token_hash
     and consumed_at is not null
     and expires_at > pg_catalog.now();
  return found;
end;
$$;

revoke all on function public.release_order_payment_link_claim(text) from public, anon, authenticated;
grant execute on function public.release_order_payment_link_claim(text) to service_role;
