-- BigFoods staff operations: employment profile, shifts, attendance, leave and payroll foundations.
-- Additive only; customer, restaurant and rider authentication are not changed.

alter table public.bigfoods_staff
  add column if not exists employee_code text,
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists start_date date,
  add column if not exists monthly_salary numeric(12,2);

create unique index if not exists bigfoods_staff_employee_code_uidx
  on public.bigfoods_staff (employee_code) where employee_code is not null;

create table if not exists public.bigfoods_staff_work_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  radius_m integer not null default 150 check (radius_m between 25 and 5000),
  is_active boolean not null default true,
  created_by uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bigfoods_staff_shift_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  check_in_earliest_minutes_before integer not null default 60 check (check_in_earliest_minutes_before between 0 and 720),
  check_in_latest_minutes_after integer not null default 15 check (check_in_latest_minutes_after between 0 and 360),
  checkout_earliest_minutes_before_end integer not null default 0 check (checkout_earliest_minutes_before_end between 0 and 720),
  change_window_hours integer not null default 24 check (change_window_hours between 0 and 720),
  is_active boolean not null default true,
  created_by uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bigfoods_staff_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  shift_template_id uuid not null references public.bigfoods_staff_shift_templates(id) on delete restrict,
  work_location_id uuid references public.bigfoods_staff_work_locations(id) on delete set null,
  shift_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','swap_pending','completed','cancelled')),
  assigned_by uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists bigfoods_staff_shift_assignments_staff_date_idx
  on public.bigfoods_staff_shift_assignments (staff_id, shift_date desc);
create index if not exists bigfoods_staff_shift_assignments_date_idx
  on public.bigfoods_staff_shift_assignments (shift_date, status);

create table if not exists public.bigfoods_staff_attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  shift_assignment_id uuid references public.bigfoods_staff_shift_assignments(id) on delete set null,
  work_location_id uuid references public.bigfoods_staff_work_locations(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  check_in_latitude double precision not null,
  check_in_longitude double precision not null,
  check_in_distance_m integer,
  check_in_qr_verified boolean not null default false,
  checked_out_at timestamptz,
  check_out_latitude double precision,
  check_out_longitude double precision,
  check_out_distance_m integer,
  check_out_qr_verified boolean not null default false,
  status text not null default 'on_shift' check (status in ('on_shift','completed','flagged','reviewed')),
  anomaly_flags jsonb not null default '[]'::jsonb check (jsonb_typeof(anomaly_flags) = 'array'),
  reviewed_by uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  check ((checked_out_at is null) or (checked_out_at >= checked_in_at))
);
create index if not exists bigfoods_staff_attendance_staff_date_idx
  on public.bigfoods_staff_attendance (staff_id, checked_in_at desc);
create unique index if not exists bigfoods_staff_attendance_one_open_shift_uidx
  on public.bigfoods_staff_attendance (staff_id) where checked_out_at is null;

create table if not exists public.bigfoods_staff_location_pings (
  id bigint generated always as identity primary key,
  staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  attendance_id uuid not null references public.bigfoods_staff_attendance(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  distance_m integer,
  inside_geofence boolean not null,
  mock_location_flag boolean not null default false,
  anomaly_note text,
  recorded_at timestamptz not null default now()
);
create index if not exists bigfoods_staff_location_pings_attendance_idx
  on public.bigfoods_staff_location_pings (attendance_id, recorded_at desc);

create table if not exists public.bigfoods_staff_leave_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  leave_type text not null default 'annual' check (leave_type in ('annual','sick','personal','unpaid','other')),
  starts_on date not null,
  ends_on date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists bigfoods_staff_leave_requests_staff_idx
  on public.bigfoods_staff_leave_requests (staff_id, starts_on desc, status);

create table if not exists public.bigfoods_staff_surcharges (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  attendance_id uuid references public.bigfoods_staff_attendance(id) on delete set null,
  payroll_month date not null,
  surcharge_type text not null check (surcharge_type in ('late_check_in','early_check_out','missed_check_out','manual_adjustment')),
  amount numeric(12,2) not null check (amount >= 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','waived','reversed')),
  created_by uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_at timestamptz
);
create index if not exists bigfoods_staff_surcharges_payroll_idx
  on public.bigfoods_staff_surcharges (staff_id, payroll_month, status);

create table if not exists public.bigfoods_staff_pool_settings (
  id uuid primary key default gen_random_uuid(),
  payroll_month date not null unique,
  sales_target numeric(14,2) not null default 0 check (sales_target >= 0),
  fixed_pool_amount numeric(12,2) not null default 0 check (fixed_pool_amount >= 0),
  pool_funded_by_owner boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','target_met','closed')),
  created_by uuid references public.bigfoods_staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bigfoods_staff_payroll_periods (
  id uuid primary key default gen_random_uuid(),
  payroll_month date not null unique,
  status text not null default 'open' check (status in ('open','calculated','approved','paid','closed')),
  sales_total numeric(14,2),
  calculated_at timestamptz,
  approved_by uuid references public.bigfoods_staff(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bigfoods_staff_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  payroll_period_id uuid not null references public.bigfoods_staff_payroll_periods(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  bank_code text,
  bank_name text,
  account_number_last4 text,
  account_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','processing','paid','failed')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  paystack_transfer_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bigfoods_staff_withdrawal_requests_status_idx
  on public.bigfoods_staff_withdrawal_requests (status, requested_at desc);

alter table public.bigfoods_staff_work_locations enable row level security;
alter table public.bigfoods_staff_shift_templates enable row level security;
alter table public.bigfoods_staff_shift_assignments enable row level security;
alter table public.bigfoods_staff_attendance enable row level security;
alter table public.bigfoods_staff_location_pings enable row level security;
alter table public.bigfoods_staff_leave_requests enable row level security;
alter table public.bigfoods_staff_surcharges enable row level security;
alter table public.bigfoods_staff_pool_settings enable row level security;
alter table public.bigfoods_staff_payroll_periods enable row level security;
alter table public.bigfoods_staff_withdrawal_requests enable row level security;
-- No client-facing policies: all reads/writes go through trusted staff Edge Functions.
