create table public.accepted_banks (
  code text primary key,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.accepted_banks enable row level security;
create policy "Anyone can read active banks" on public.accepted_banks for select using (is_active);
create policy "Admins manage banks" on public.accepted_banks for all using (is_admin()) with check (is_admin());
insert into public.accepted_banks (code, name) values
 ('044','Access Bank'),('023','Citibank Nigeria'),('050','Ecobank Nigeria'),('070','Fidelity Bank'),
 ('011','First Bank of Nigeria'),('214','First City Monument Bank (FCMB)'),('058','Guaranty Trust Bank (GTBank)'),
 ('030','Heritage Bank'),('082','Keystone Bank'),('076','Polaris Bank'),('101','Providus Bank'),
 ('221','Stanbic IBTC Bank'),('068','Standard Chartered Bank'),('232','Sterling Bank'),
 ('032','Union Bank'),('033','United Bank for Africa (UBA)'),('215','Unity Bank'),
 ('035','Wema Bank'),('057','Zenith Bank'),
 ('50211','Kuda Bank'),('50515','Moniepoint MFB'),('999992','OPay'),('999991','PalmPay');

create table public.restaurant_owner_details (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  date_of_birth date not null,
  gender text not null check (gender in ('female','male','prefer_not_to_say')),
  terms_accepted_at timestamptz,
  serious_business_ack_at timestamptz,
  warnings_ack_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.restaurant_owner_details enable row level security;
create policy "Owner reads own details" on public.restaurant_owner_details for select
  using (restaurant_id in (select id from public.restaurants where owner_id = auth.uid()));
create policy "Admins read details" on public.restaurant_owner_details for select using (is_admin());

insert into public.pricing_config (key, value, description) values
 ('onboarding_plan_1_month', 3980, 'Restaurant onboarding: 1 month, includes free ads (naira)'),
 ('onboarding_plan_3_months', 7850, 'Restaurant onboarding: 3 months, includes free ads (naira) - best value');
