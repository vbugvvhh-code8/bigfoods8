-- Independent BigFoods POS operations foundation.
-- This schema deliberately does not reference restaurant-owned menu_items,
-- customer orders, restaurant accounts, or online checkout/payment tables.
-- The only shared menu concepts are category and subcategory labels.
create extension if not exists pgcrypto;

create table if not exists public.bigfoods_pos_dining_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bigfoods_pos_dining_areas_name_nonempty check (length(trim(name)) > 0)
);
create unique index if not exists bigfoods_pos_dining_areas_name_uidx
  on public.bigfoods_pos_dining_areas(lower(name));

create table if not exists public.bigfoods_pos_tables (
  id uuid primary key default gen_random_uuid(),
  dining_area_id uuid not null references public.bigfoods_pos_dining_areas(id) on delete restrict,
  table_number text not null,
  display_name text,
  capacity integer not null default 2 check (capacity > 0),
  sort_order integer not null default 0,
  status text not null default 'available' check (status in ('available','occupied','reserved','unavailable')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bigfoods_pos_table_number_nonempty check (length(trim(table_number)) > 0),
  unique(dining_area_id, table_number)
);
create index if not exists bigfoods_pos_tables_area_status_idx
  on public.bigfoods_pos_tables(dining_area_id,is_active,status,sort_order);

create table if not exists public.bigfoods_pos_table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references public.bigfoods_pos_tables(id) on delete restrict,
  session_number text not null unique,
  service_type text not null check (service_type in ('dine_in','takeaway','counter')),
  status text not null default 'open' check (status in ('open','awaiting_payment','paid','cancelled')),
  guest_count integer not null default 1 check (guest_count > 0),
  customer_name text,
  opened_by_staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  closed_by_staff_id uuid references public.bigfoods_staff(id) on delete restrict,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint bigfoods_pos_session_table_service check (
    (service_type='dine_in' and table_id is not null) or
    (service_type in ('takeaway','counter') and table_id is null)
  ),
  constraint bigfoods_pos_session_closed check (
    (status in ('open','awaiting_payment') and closed_at is null) or
    (status in ('paid','cancelled') and closed_at is not null)
  )
);
create unique index if not exists bigfoods_pos_one_open_session_per_table
  on public.bigfoods_pos_table_sessions(table_id)
  where table_id is not null and status in ('open','awaiting_payment');
create index if not exists bigfoods_pos_sessions_status_time_idx
  on public.bigfoods_pos_table_sessions(status,opened_at desc);

create table if not exists public.bigfoods_pos_kitchen_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  session_id uuid not null references public.bigfoods_pos_table_sessions(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued','preparing','ready','served','cancelled')),
  priority text not null default 'normal' check (priority in ('normal','high')),
  notes text,
  created_by_staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  started_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bigfoods_pos_kitchen_queue_idx
  on public.bigfoods_pos_kitchen_tickets(status,priority,created_at);

create table if not exists public.bigfoods_pos_kitchen_ticket_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.bigfoods_pos_kitchen_tickets(id) on delete restrict,
  product_id uuid not null references public.bigfoods_pos_items(id) on delete restrict,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  item_notes text,
  created_at timestamptz not null default now()
);
create index if not exists bigfoods_pos_kitchen_ticket_items_ticket_idx
  on public.bigfoods_pos_kitchen_ticket_items(ticket_id);

create table if not exists public.bigfoods_pos_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.bigfoods_pos_sales(id) on delete restrict,
  payment_method text not null check (payment_method in ('cash','moniepoint_pos','bank_transfer')),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','confirmed','failed','reversed')),
  reference text,
  confirmed_by_staff_id uuid references public.bigfoods_staff(id) on delete restrict,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint bigfoods_pos_payment_confirmation check (
    (status='confirmed' and confirmed_at is not null) or
    (status<>'confirmed')
  )
);
create index if not exists bigfoods_pos_payments_sale_idx
  on public.bigfoods_pos_payments(sale_id,created_at);

create table if not exists public.bigfoods_pos_register_shifts (
  id uuid primary key default gen_random_uuid(),
  cashier_staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  shift_number text not null unique,
  opening_cash numeric(14,2) not null default 0 check (opening_cash >= 0),
  expected_cash numeric(14,2) not null default 0 check (expected_cash >= 0),
  counted_cash numeric(14,2) check (counted_cash is null or counted_cash >= 0),
  variance numeric(14,2),
  status text not null default 'open' check (status in ('open','closed','review_required')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by_staff_id uuid references public.bigfoods_staff(id) on delete restrict,
  closing_note text,
  created_at timestamptz not null default now(),
  constraint bigfoods_pos_register_shift_close check (
    (status='open' and closed_at is null) or (status<>'open' and closed_at is not null)
  )
);
create unique index if not exists bigfoods_pos_one_open_register_shift_per_cashier
  on public.bigfoods_pos_register_shifts(cashier_staff_id) where status='open';

-- All POS operational tables are server-mediated. No browser table policies.
alter table public.bigfoods_pos_items enable row level security;
alter table public.bigfoods_pos_sales enable row level security;
alter table public.bigfoods_pos_sale_items enable row level security;
alter table public.bigfoods_pos_dining_areas enable row level security;
alter table public.bigfoods_pos_tables enable row level security;
alter table public.bigfoods_pos_table_sessions enable row level security;
alter table public.bigfoods_pos_kitchen_tickets enable row level security;
alter table public.bigfoods_pos_kitchen_ticket_items enable row level security;
alter table public.bigfoods_pos_payments enable row level security;
alter table public.bigfoods_pos_register_shifts enable row level security;

comment on table public.bigfoods_pos_dining_areas is 'Independent in-house POS dining areas; not restaurant portal data.';
comment on table public.bigfoods_pos_tables is 'Physical tables managed by the BigFoods in-house POS.';
comment on table public.bigfoods_pos_table_sessions is 'Dine-in, takeaway and counter service sessions opened by POS staff.';
comment on table public.bigfoods_pos_kitchen_tickets is 'In-house kitchen production tickets created by POS sessions.';
comment on table public.bigfoods_pos_payments is 'Tender-level payment records for in-house POS sales.';
comment on table public.bigfoods_pos_register_shifts is 'Cashier register opening, closing and cash reconciliation.';
