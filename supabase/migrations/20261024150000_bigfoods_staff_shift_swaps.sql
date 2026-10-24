-- Staff shift swaps; additive and protected behind staff Edge Functions.
create table if not exists public.bigfoods_staff_shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  requested_shift_assignment_id uuid not null references public.bigfoods_staff_shift_assignments(id) on delete restrict,
  target_staff_id uuid references public.bigfoods_staff(id) on delete restrict,
  target_shift_assignment_id uuid references public.bigfoods_staff_shift_assignments(id) on delete restrict,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references public.bigfoods_staff(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create index if not exists bigfoods_staff_shift_swap_requests_status_idx
  on public.bigfoods_staff_shift_swap_requests(status, created_at desc);
create index if not exists bigfoods_staff_shift_swap_requests_requester_idx
  on public.bigfoods_staff_shift_swap_requests(requester_staff_id, created_at desc);
alter table public.bigfoods_staff_shift_swap_requests enable row level security;
