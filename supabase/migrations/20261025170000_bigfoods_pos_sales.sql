-- Cashier POS sales ledger. Writes are mediated by the staff-authenticated Edge Function.
create table if not exists public.bigfoods_pos_sales (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  idempotency_key uuid not null unique,
  cashier_staff_id uuid references public.bigfoods_staff(id) on delete restrict,
  customer_email text,
  payment_method text not null check (payment_method in ('cash','transfer','card')),
  status text not null default 'paid' check (status in ('paid','voided','refunded','needs_review')),
  subtotal numeric(14,2) not null check (subtotal >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  cash_received numeric(14,2),
  change_due numeric(14,2) not null default 0 check (change_due >= 0),
  payment_note text,
  created_at timestamptz not null default now(),
  constraint bigfoods_pos_sales_cash_fields check (
    (payment_method = 'cash' and cash_received is not null and cash_received >= total_amount)
    or (payment_method in ('transfer','card') and cash_received is null)
  )
);
create table if not exists public.bigfoods_pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.bigfoods_pos_sales(id) on delete restrict,
  product_id uuid not null references public.bigfoods_pos_items(id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index if not exists bigfoods_pos_sales_created_at_idx on public.bigfoods_pos_sales(created_at desc);
create index if not exists bigfoods_pos_sales_cashier_idx on public.bigfoods_pos_sales(cashier_staff_id, created_at desc);
create index if not exists bigfoods_pos_sale_items_sale_idx on public.bigfoods_pos_sale_items(sale_id);
alter table public.bigfoods_pos_sales enable row level security;
alter table public.bigfoods_pos_sale_items enable row level security;
-- No browser policies: only the service-mediated staff Edge Function can access sales.
