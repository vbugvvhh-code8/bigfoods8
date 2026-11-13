create table if not exists public.bigfoods_pos_settings (
  id boolean primary key default true check (id = true),
  tax_enabled boolean not null default true,
  tax_rate numeric(5,2) not null default 7.50 check (tax_rate >= 0 and tax_rate <= 30),
  discount_enabled boolean not null default true,
  discount_allowed_roles text[] not null default array['owner','admin','manager']::text[],
  discount_max_percent numeric(5,2) not null default 100 check (discount_max_percent >= 0 and discount_max_percent <= 100),
  updated_by_staff_id uuid references public.bigfoods_staff(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.bigfoods_pos_settings(id) values(true) on conflict(id) do nothing;
alter table public.bigfoods_pos_settings enable row level security;
alter table public.bigfoods_pos_sales
  add column if not exists discount_amount numeric(14,2) not null default 0,
  add column if not exists tax_amount numeric(14,2) not null default 0,
  add column if not exists customer_email text;
alter table public.bigfoods_pos_sales drop constraint if exists bigfoods_pos_sales_pricing_nonnegative;
alter table public.bigfoods_pos_sales add constraint bigfoods_pos_sales_pricing_nonnegative
  check (discount_amount >= 0 and tax_amount >= 0 and discount_amount <= subtotal);
comment on table public.bigfoods_pos_settings is 'Singleton settings for independent BigFoods in-house POS pricing and role-based discount authority.';
