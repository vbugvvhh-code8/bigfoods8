-- Employment details for central staff directory.
alter table public.bigfoods_staff
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists start_date date,
  add column if not exists monthly_salary numeric(12,2);

alter table public.bigfoods_staff
  drop constraint if exists bigfoods_staff_monthly_salary_nonnegative;
alter table public.bigfoods_staff
  add constraint bigfoods_staff_monthly_salary_nonnegative
  check (monthly_salary is null or monthly_salary >= 0);
