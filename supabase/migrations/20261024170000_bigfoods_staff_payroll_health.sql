-- Staff payroll snapshots and explainable attendance health scores.
-- This migration is additive. Payroll calculation is called only by the trusted Edge Function.
create table if not exists public.bigfoods_staff_payroll_entries (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references public.bigfoods_staff_payroll_periods(id) on delete restrict,
  staff_id uuid not null references public.bigfoods_staff(id) on delete restrict,
  monthly_salary numeric(12,2) not null check (monthly_salary >= 0),
  eligible_days integer not null check (eligible_days between 0 and 31),
  days_in_month integer not null check (days_in_month between 28 and 31),
  gross_pay numeric(12,2) not null check (gross_pay >= 0),
  requested_deductions numeric(12,2) not null default 0 check (requested_deductions >= 0),
  applied_deductions numeric(12,2) not null default 0 check (applied_deductions >= 0),
  deduction_cap numeric(12,2) not null default 0 check (deduction_cap >= 0),
  net_pay numeric(12,2) not null check (net_pay >= 0),
  health_score integer not null check (health_score between 0 and 100),
  health_breakdown jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  unique(payroll_period_id, staff_id)
);
create index if not exists bigfoods_staff_payroll_entries_period_idx
  on public.bigfoods_staff_payroll_entries(payroll_period_id, staff_id);
alter table public.bigfoods_staff_payroll_entries enable row level security;

create or replace function public.bigfoods_staff_calculate_payroll(p_payroll_month date, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_month date := date_trunc('month', p_payroll_month)::date;
  v_next date := (date_trunc('month', p_payroll_month) + interval '1 month')::date;
  v_days integer := extract(day from (date_trunc('month', p_payroll_month) + interval '1 month - 1 day'))::integer;
  v_period public.bigfoods_staff_payroll_periods%rowtype;
  v_count integer := 0;
begin
  if p_actor_id is null or not exists (select 1 from public.bigfoods_staff s where s.id=p_actor_id and s.is_active and (s.role in ('owner','admin') or s.permissions @> '["staff.manage"]'::jsonb)) then raise exception 'Forbidden'; end if;
  perform pg_advisory_xact_lock(hashtext('bigfoods-staff-payroll'),hashtext(v_month::text));
  insert into public.bigfoods_staff_payroll_periods(payroll_month,status) values(v_month,'open') on conflict(payroll_month) do nothing;
  select * into v_period from public.bigfoods_staff_payroll_periods where payroll_month=v_month for update;
  if v_period.status in ('approved','paid','closed') then raise exception 'Payroll period already approved or closed'; end if;

  insert into public.bigfoods_staff_payroll_entries(
    payroll_period_id,staff_id,monthly_salary,eligible_days,days_in_month,gross_pay,
    requested_deductions,applied_deductions,deduction_cap,net_pay,health_score,health_breakdown,calculated_at
  )
  with staff_base as (
    select s.id,s.monthly_salary,
      greatest(0,least(v_days,v_next-greatest(v_month,coalesce(s.start_date,v_month)))::integer) eligible_days
    from public.bigfoods_staff s where s.is_active and s.monthly_salary is not null and s.monthly_salary>=0
      and (s.start_date is null or s.start_date<v_next)
  ), metrics as (
    select sb.id,count(a.id)::integer records,
      count(a.id) filter(where a.checked_out_at is not null)::integer completed,
      count(a.id) filter(where a.checked_out_at is null and a.checked_in_at < now()-interval '12 hours')::integer missed,
      count(a.id) filter(where sa.starts_at is not null and a.checked_in_at > sa.starts_at+interval '5 minutes')::integer late_count,
      count(a.id) filter(where sa.ends_at is not null and a.checked_out_at is not null and a.checked_out_at < sa.ends_at-interval '5 minutes')::integer early_count,
      count(a.id) filter(where jsonb_array_length(a.anomaly_flags)>0)::integer anomalies
    from staff_base sb left join public.bigfoods_staff_attendance a on a.staff_id=sb.id and a.checked_in_at>=v_month and a.checked_in_at<v_next
    left join public.bigfoods_staff_shift_assignments sa on sa.id=a.shift_assignment_id group by sb.id
  ), calc as (
    select sb.id,sb.monthly_salary,sb.eligible_days,
      round(sb.monthly_salary*sb.eligible_days::numeric/v_days,2) gross,
      coalesce((select sum(sc.amount) from public.bigfoods_staff_surcharges sc where sc.staff_id=sb.id and sc.payroll_month=v_month and sc.status='confirmed'),0) requested,
      coalesce(m.records,0) records,coalesce(m.completed,0) completed,coalesce(m.missed,0) missed,
      coalesce(m.late_count,0) late_count,coalesce(m.early_count,0) early_count,coalesce(m.anomalies,0) anomalies
    from staff_base sb left join metrics m on m.id=sb.id
  )
  select v_period.id,c.id,c.monthly_salary,c.eligible_days,v_days,c.gross,c.requested,
    least(c.requested,round(c.gross*0.20,2)),round(c.gross*0.20,2),
    greatest(0,c.gross-least(c.requested,round(c.gross*0.20,2))),
    greatest(0,least(100,100-least(30,c.late_count*5)-least(20,c.early_count*5)-least(25,c.missed*10)-least(25,c.anomalies*5)+case when c.records>0 and c.completed=c.records and c.late_count=0 and c.early_count=0 and c.missed=0 and c.anomalies=0 then 5 else 0 end)),
    jsonb_build_object('attendance_records',c.records,'completed_checkouts',c.completed,'late_check_ins',c.late_count,'early_checkouts',c.early_count,'missed_checkouts',c.missed,'anomaly_records',c.anomalies,'scoring_note','Base 100; late -5 each max 30, early -5 each max 20, missed checkout -10 each max 25, anomaly -5 each max 25, clean completed month +5; bounded 0-100.'),
    now()
  from calc c
  on conflict(payroll_period_id,staff_id) do update set monthly_salary=excluded.monthly_salary,eligible_days=excluded.eligible_days,days_in_month=excluded.days_in_month,gross_pay=excluded.gross_pay,requested_deductions=excluded.requested_deductions,applied_deductions=excluded.applied_deductions,deduction_cap=excluded.deduction_cap,net_pay=excluded.net_pay,health_score=excluded.health_score,health_breakdown=excluded.health_breakdown,calculated_at=now();
  get diagnostics v_count=row_count;
  update public.bigfoods_staff_payroll_periods set status='calculated',calculated_at=now(),updated_at=now(),notes='Deductions capped at 20% of prorated gross salary.' where id=v_period.id;
  insert into public.bigfoods_staff_audit_events(actor_staff_id,action,details) values(p_actor_id,'staff.payroll_calculated',jsonb_build_object('payroll_month',v_month,'staff_count',v_count,'deduction_cap_percent',20));
  return jsonb_build_object('payroll_month',v_month,'period_id',v_period.id,'staff_count',v_count,'status','calculated');
end; $$;
revoke all on function public.bigfoods_staff_calculate_payroll(date,uuid) from public, anon, authenticated;
grant execute on function public.bigfoods_staff_calculate_payroll(date,uuid) to service_role;
